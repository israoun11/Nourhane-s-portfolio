import crypto from 'node:crypto';
import { defaultContent } from '../../shared/default-content.js';
import { collectUrls, schema, validateContent } from '../../shared/schema.js';
import { migrateContent } from '../../shared/migrate.js';
import { ConflictError } from './store-file.js';
import { HttpError } from './http.js';

const HISTORY_SIZE = 10;
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000; // keep fresh, not-yet-saved uploads for a day

/** Detects real image type from the file's first bytes (never trusts the filename). */
export function sniffImage(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', type: 'image/png' };
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { ext: 'webp', type: 'image/webp' };
  return null;
}

/** A real PDF starts with "%PDF-" and contains an end-of-file marker. */
export function sniffPdf(buf) {
  if (buf.length < 64 || buf.toString('ascii', 0, 5) !== '%PDF-') return null;
  if (!buf.subarray(Math.max(0, buf.length - 2048)).toString('latin1').includes('%%EOF')) return null;
  return { ext: 'pdf', type: 'application/pdf' };
}

/** The schema definition at a content path (list indexes are numbers), or null. */
function fieldAt(path) {
  if (!Array.isArray(path) || !path.length || path.length > 6) return null;
  let def = schema;
  for (const k of path) {
    if (def.type === 'list' && Number.isInteger(k) && k >= 0) def = def.of;
    else if (def.type === 'object' && typeof k === 'string' && Object.hasOwn(def.fields, k)) def = def.fields[k];
    else return null;
  }
  return def;
}

/** Original file name, kept only for display (no paths, no markup). */
function cleanFileName(name) {
  return String(name || '').replace(/[\u0000-\u001f\\/<>"]/g, '').trim().slice(-160);
}

/** A clear message when the storage service refuses a file. */
function storageError(e) {
  if (e instanceof HttpError) return e;
  const d = String(e.detail || '');
  const why = /mime|content.?type|415/i.test(d) ? 'the storage does not accept PDF files yet'
    : /too large|413|size/i.test(d) || e.status === 413 ? 'the file is larger than the storage allows'
    : /not.?found|bucket/i.test(d) ? 'the storage folder for PDFs does not exist'
    : e.message;
  return new HttpError(502, `The PDF could not be stored: ${why}.`, { code: 'STORAGE' });
}

export function createContentService(store, log = console) {
  // Retry loop for small bookkeeping documents (history, media index).
  async function updateDoc(key, fn, init) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const cur = await store.getKV(key);
      const next = fn(cur ? cur.value : init);
      try {
        return await store.putKV(key, next, cur ? cur.version : 0);
      } catch (e) {
        if (!(e instanceof ConflictError)) throw e;
      }
    }
    throw new Error(`Could not update ${key}`);
  }

  async function get() {
    let cur = await store.getKV('content');
    if (!cur) {
      // First start: seed with the approved website content.
      const { value } = validateContent(migrateContent(defaultContent));
      try {
        await store.putKV('content', value, 0);
        log.info?.('Seeded website content from shared/default-content.js');
      } catch (e) {
        if (!(e instanceof ConflictError)) throw e;
      }
      cur = await store.getKV('content');
    }
    // Content saved by an earlier version is brought up to date (nothing is lost),
    // and default French translations are added where none exist yet.
    return { data: migrateContent(cur.value), version: cur.version, updatedAt: cur.updatedAt };
  }

  async function cleanupMedia() {
    const media = await store.getKV('media');
    if (!media || !media.value.items.length) return;
    const cur = await store.getKV('content');
    const hist = await store.getKV('history');
    const used = collectUrls(cur ? cur.value : {});
    (hist ? hist.value.items : []).forEach((h) => collectUrls(h.data).forEach((u) => used.add(u)));
    const now = Date.now();
    const remove = media.value.items.filter((m) => !used.has(m.url) && now - Date.parse(m.createdAt) > ORPHAN_GRACE_MS);
    if (!remove.length) return;
    for (const m of remove) {
      try {
        if (m.private) await store.deletePrivate(m.path);
        else await store.deleteObject(m.path);
      } catch (e) {
        log.warn?.(`Could not delete unused image ${m.path}: ${e.message}`);
      }
    }
    const gone = new Set(remove.map((m) => m.url));
    await updateDoc('media', (v) => ({ items: v.items.filter((m) => !gone.has(m.url)) }), { items: [] });
  }

  async function save(input, expectedVersion) {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new HttpError(400, 'Missing content version.');
    const { ok, errors, value } = validateContent(migrateContent(input, { translations: false }));
    if (!ok) throw new HttpError(422, 'Some fields need attention.', { errors: errors.slice(0, 50) });

    const prev = await store.getKV('content');
    if (!prev || prev.version !== expectedVersion) {
      throw new HttpError(409, 'The content was changed in another window or by another session. Reload to get the latest version.');
    }
    let saved;
    try {
      saved = await store.putKV('content', value, expectedVersion);
    } catch (e) {
      if (e instanceof ConflictError) throw new HttpError(409, 'The content was changed in another window or by another session. Reload to get the latest version.');
      throw e;
    }
    // Keep the previous version so it can be restored.
    try {
      await updateDoc(
        'history',
        (v) => ({ items: [{ version: prev.version, updatedAt: prev.updatedAt, data: prev.value }, ...v.items].slice(0, HISTORY_SIZE) }),
        { items: [] }
      );
    } catch (e) {
      log.warn?.(`History not updated: ${e.message}`);
    }
    cleanupMedia().catch((e) => log.warn?.(`Media cleanup skipped: ${e.message}`));
    return { data: value, version: saved.version, updatedAt: saved.updatedAt };
  }

  async function history() {
    const h = await store.getKV('history');
    return (h ? h.value.items : []).map((i) => ({
      version: i.version,
      updatedAt: i.updatedAt,
      projects: i.data.projects.length,
      heroLine: [i.data.text.hero.line1, i.data.text.hero.line2, i.data.text.hero.line3].join(' '),
    }));
  }

  async function restore(version, currentVersion) {
    const h = await store.getKV('history');
    const item = (h ? h.value.items : []).find((i) => i.version === version);
    if (!item) throw new HttpError(404, 'That version is no longer available.');
    return save(structuredClone(item.data), currentVersion);
  }

  /** PDF upload. access 'public' → /uploads/<hash>.pdf (CV); 'private' → never served directly. */
  async function uploadPdf(buffer, access = 'public', fileName = '') {
    const kind = sniffPdf(buffer);
    if (!kind) throw new HttpError(415, 'This file is not a valid PDF.', { code: 'NOT_PDF' });
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const name = `${hash}.pdf`;
    const put = async () => (access === 'private' ? (await store.putPrivate(name, buffer), `private:${name}`) : (await store.putObject(name, buffer, kind.type)).url);
    let url;
    try {
      url = await put();
    } catch (e) {
      // A storage set up by an earlier version may still refuse PDFs (images only, small size
      // limit, private bucket missing): repair those settings once, then try again.
      if (!store.ensurePdfStorage) throw storageError(e);
      try {
        await store.ensurePdfStorage(buffer.length);
        url = await put();
      } catch (e2) {
        throw storageError(e2);
      }
    }
    const original = cleanFileName(fileName);
    await updateDoc(
      'media',
      (v) => ({ items: [...v.items.filter((m) => m.url !== url), { url, path: name, type: kind.type, size: buffer.length, private: access === 'private', name: original, createdAt: new Date().toISOString() }] }),
      { items: [] }
    );
    return { url, size: buffer.length, type: kind.type, name: original };
  }

  /**
   * Puts an uploaded PDF (or '' to remove it) into one PDF field of the SAVED content right away,
   * so it is live on the website and survives a refresh without pressing “Save changes”.
   * `path` points to a field of type 'file' in the schema (e.g. ['site','cvFile'] or ['products',2,'file']).
   */
  async function setFile(path, url, fileName = '') {
    const def = fieldAt(path);
    if (!def || def.type !== 'file') throw new HttpError(400, 'This is not a PDF field.');
    if (url) {
      const media = await store.getKV('media');
      const item = (media ? media.value.items : []).find((m) => m.url === url && m.type === 'application/pdf');
      if (!item) throw new HttpError(400, 'Upload the PDF first.');
      if (!!item.private !== (def.access === 'private')) throw new HttpError(400, 'This PDF was uploaded for another kind of field.');
      fileName = fileName || item.name || '';
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const cur = await get();
      const data = structuredClone(cur.data);
      let parent = data;
      for (const k of path.slice(0, -1)) {
        parent = parent == null ? undefined : parent[k];
      }
      if (!parent || typeof parent !== 'object') throw new HttpError(409, 'Save this item first, then upload its PDF.', { code: 'NOT_SAVED' });
      parent[path[path.length - 1]] = url;
      const names = { ...(data.fileNames || {}) };
      if (url && cleanFileName(fileName)) names[url] = cleanFileName(fileName);
      const used = collectUrls({ ...data, fileNames: {} });
      data.fileNames = Object.fromEntries(Object.entries(names).filter(([ref]) => used.has(ref)));
      try {
        return await save(data, cur.version);
      } catch (e) {
        if (!(e instanceof HttpError && e.status === 409)) throw e; // changed meanwhile: try again
      }
    }
    throw new HttpError(409, 'The content is being changed elsewhere. Please try again.');
  }

  async function upload(buffer) {
    const kind = sniffImage(buffer);
    if (!kind) throw new HttpError(415, 'Only JPEG, PNG and WebP images can be uploaded.');
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const name = `${hash}.${kind.ext}`;
    const media = await store.getKV('media');
    const existing = media && media.value.items.find((m) => m.path === name);
    if (existing) return { url: existing.url, reused: true, size: buffer.length, type: kind.type };
    const obj = await store.putObject(name, buffer, kind.type);
    await updateDoc(
      'media',
      (v) => ({ items: [...v.items.filter((m) => m.path !== name), { url: obj.url, path: name, type: kind.type, size: buffer.length, createdAt: new Date().toISOString() }] }),
      { items: [] }
    );
    return { url: obj.url, reused: false, size: buffer.length, type: kind.type };
  }

  async function mediaCount() {
    const m = await store.getKV('media');
    return m ? m.value.items.length : 0;
  }

  return { get, save, history, restore, upload, uploadPdf, setFile, mediaCount, cleanupMedia };
}
