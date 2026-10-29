// Free PDF downloads: visitors leave their name and email, then receive a temporary
// signed link to the file. Files stay private; links expire; every download is counted.
import crypto from 'node:crypto';
import { HttpError } from './http.js';
import { isLang } from '../../shared/i18n/langs.js';

const EMAIL = /^[^\s@<>"']+@[^\s@<>"'.]+(\.[^\s@<>"'.]+)+$/;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const clean = (s) => String(s ?? '').replace(/[\u0000-\u001F\u007F\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim();
const MONTH = 30 * 24 * 3600 * 1000;

/** Where the visitor came from (UTM parameters and referrer), limited and cleaned. */
export function cleanSource(src) {
  const s = src && typeof src === 'object' ? src : {};
  const out = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'referrer', 'landing']) {
    if (typeof s[k] === 'string' && s[k].trim()) out[k] = clean(s[k]).slice(0, 200);
  }
  return out;
}

export function validateLead(body) {
  const b = body && typeof body === 'object' ? body : {};
  const fields = {};
  const name = clean(b.name);
  const email = clean(b.email).toLowerCase();
  if (!name) fields.name = 'required';
  else if (name.length > 100) fields.name = 'tooLong';
  if (!email) fields.email = 'required';
  else if (email.length > 200 || !EMAIL.test(email)) fields.email = 'invalid';
  return {
    ok: !Object.keys(fields).length,
    fields,
    value: { name, email, consent: b.consent === true, lang: isLang(b.lang) ? b.lang : 'en', source: cleanSource(b.source) },
  };
}

export function createLeadService(store, cfg, log = console) {
  let secret = cfg.downloadSecret ? Buffer.from(cfg.downloadSecret) : null;
  async function key() {
    if (secret) return secret;
    // No DOWNLOAD_SECRET configured: create one once and keep it in storage.
    let doc = await store.getKV('download-secret');
    if (!doc) {
      try {
        await store.putKV('download-secret', { key: crypto.randomBytes(32).toString('base64url') }, 0);
      } catch {
        /* created by another request at the same time */
      }
      doc = await store.getKV('download-secret');
    }
    secret = Buffer.from(doc.value.key);
    return secret;
  }
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  async function sign(payload) {
    const body = b64(payload);
    const mac = crypto.createHmac('sha256', await key()).update(body).digest('base64url');
    return `${body}.${mac}`;
  }
  async function verify(token) {
    const [body, mac] = String(token || '').split('.');
    if (!body || !mac || body.length > 600) return null;
    const expect = crypto.createHmac('sha256', await key()).update(body).digest('base64url');
    const a = Buffer.from(mac);
    const b = Buffer.from(expect);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
      const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      return p && p.exp > Date.now() ? p : null;
    } catch {
      return null;
    }
  }

  /** Deletes leads older than the retention period set in the dashboard (0 = keep). */
  async function purge(months) {
    if (!months) return 0;
    const limit = Date.now() - months * MONTH;
    const old = (await store.listRecords('leads')).filter((l) => Date.parse(l.createdAt) < limit);
    for (const l of old) await store.deleteRecord('leads', l.id);
    if (old.length) log.info?.(`Deleted ${old.length} lead(s) older than ${months} months (retention setting).`);
    return old.length;
  }

  return {
    /**
     * Stores the lead and returns a download link — only if the PDF really exists.
     * product: the (full, private) product object; settings: content.leads
     */
    async request(product, value, settings) {
      const name = String(product.file || '').replace(/^private:/, '');
      if (!name || !(await store.hasPrivate(name))) {
        throw new HttpError(409, 'This PDF is not available yet.', { code: 'NO_FILE' });
      }
      await purge(settings.retentionMonths);
      const lead = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        product: product.slug,
        productName: product.t,
        name: value.name,
        email: value.email,
        consent: value.consent,
        lang: value.lang,
        source: value.source,
        downloads: 0,
        lastDownloadAt: '',
      };
      await store.addRecord('leads', lead);
      const hours = Math.min(168, Math.max(1, settings.linkHours || 24));
      const token = await sign({ l: lead.id, f: name, s: product.slug, exp: Date.now() + hours * 3600 * 1000 });
      return { lead, url: `/api/download/${token}`, expiresInHours: hours };
    },

    /** Checks a download link; returns { buffer, filename } and counts the download. */
    async download(token) {
      const p = await verify(token);
      if (!p) throw new HttpError(410, 'This download link has expired. Please fill in the form again.', { code: 'EXPIRED' });
      const buffer = await store.getPrivate(p.f);
      if (!buffer) throw new HttpError(404, 'This PDF is no longer available.', { code: 'NO_FILE' });
      const lead = await store.getRecord('leads', p.l);
      if (lead) await store.updateRecord('leads', p.l, { downloads: (lead.downloads || 0) + 1, lastDownloadAt: new Date().toISOString() }).catch(() => {});
      return { buffer, filename: `${p.s || 'download'}.pdf` };
    },

    async list(settings) {
      await purge(settings && settings.retentionMonths);
      return store.listRecords('leads');
    },
    async remove(id) {
      if (!ID.test(id)) throw new HttpError(404, 'Lead not found.');
      if (!(await store.deleteRecord('leads', id))) throw new HttpError(404, 'Lead not found.');
    },
  };
}

/** CSV export (Excel-friendly: UTF-8 BOM, quoted, formula injection neutralised). */
export function toCsv(rows, columns) {
  const cell = (v) => {
    let s = v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return '﻿' + [columns.map((c) => cell(c.label)).join(','), ...rows.map((r) => columns.map((c) => cell(c.get(r))).join(','))].join('\r\n');
}
