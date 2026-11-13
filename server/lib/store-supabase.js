// Production storage on Supabase (Postgres tables + Storage bucket),
// called through Supabase's HTTPS APIs — no SDK needed.
// Tables and bucket are created by server/supabase.sql.
import { ConflictError } from './store-file.js';

export function createSupabaseStore({ url, key, bucket, privateBucket = 'portfolio-private' }, fetchImpl = globalThis.fetch) {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  async function call(pathname, { method = 'GET', body, headers: h = {}, raw = false, binary = false } = {}) {
    let res;
    try {
      res = await fetchImpl(`${url}${pathname}`, {
        method,
        headers: { ...headers, ...(body !== undefined && !raw ? { 'Content-Type': 'application/json' } : {}), ...h },
        body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
    } catch (e) {
      throw new Error(`Storage service unreachable (${e.name})`);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`Storage service error ${res.status}`);
      err.status = res.status;
      err.detail = text.slice(0, 300);
      throw err;
    }
    if (binary) return Buffer.from(await res.arrayBuffer());
    // Some responses (e.g. "return=minimal", 204) have an empty body.
    const text = await res.text();
    if (!text) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('json')) return text;
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Storage service returned an unreadable response');
    }
  }

  const kvKey = (k) => encodeURIComponent(k);
  const fromRow = (r) => ({
    id: r.id, createdAt: r.created_at, name: r.name, email: r.email, category: r.category || '',
    categoryLabel: r.category_label || '', message: r.message, lang: r.lang || 'en', read: !!r.read,
    status: r.status || 'new', notes: r.notes || '', source: r.source || {},
  });

  return {
    name: 'supabase',
    persistent: true,

    async getKV(k) {
      const rows = await call(`/rest/v1/nt_content?key=eq.${kvKey(k)}&select=value,version,updated_at`);
      if (!rows.length) return null;
      return { value: rows[0].value, version: rows[0].version, updatedAt: rows[0].updated_at };
    },

    async putKV(k, value, expectedVersion) {
      const updatedAt = new Date().toISOString();
      if (expectedVersion === 0) {
        try {
          await call('/rest/v1/nt_content', {
            method: 'POST',
            headers: { Prefer: 'return=minimal' },
            body: { key: k, value, version: 1, updated_at: updatedAt },
          });
        } catch (e) {
          if (e.status === 409) throw new ConflictError('already exists');
          throw e;
        }
        return { version: 1, updatedAt };
      }
      // Conditional update: only succeeds if nobody saved in between.
      const rows = await call(`/rest/v1/nt_content?key=eq.${kvKey(k)}&version=eq.${Number(expectedVersion)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: { value, version: expectedVersion + 1, updated_at: updatedAt },
      });
      if (!Array.isArray(rows) || rows.length === 0) throw new ConflictError('version mismatch');
      return { version: expectedVersion + 1, updatedAt };
    },

    async createSession(idHash, expiresAt) {
      await call('/rest/v1/nt_sessions', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: { id_hash: idHash, expires_at: new Date(expiresAt).toISOString() },
      });
      // housekeeping
      await call(`/rest/v1/nt_sessions?expires_at=lt.${encodeURIComponent(new Date().toISOString())}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      }).catch(() => {});
    },
    async getSession(idHash) {
      const rows = await call(`/rest/v1/nt_sessions?id_hash=eq.${encodeURIComponent(idHash)}&select=expires_at`);
      return rows.length ? Date.parse(rows[0].expires_at) : null;
    },
    async deleteSession(idHash) {
      await call(`/rest/v1/nt_sessions?id_hash=eq.${encodeURIComponent(idHash)}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    },

    async putObject(name, buffer, contentType) {
      await call(`/storage/v1/object/${bucket}/${encodeURIComponent(name)}`, {
        method: 'POST',
        raw: true,
        body: buffer,
        headers: { 'Content-Type': contentType, 'x-upsert': 'true', 'cache-control': 'max-age=31536000' },
      });
      return { url: `${url}/storage/v1/object/public/${bucket}/${encodeURIComponent(name)}`, path: name };
    },
    async deleteObject(name) {
      await call(`/storage/v1/object/${bucket}`, { method: 'DELETE', body: { prefixes: [name] } });
    },

    /**
     * Makes sure PDFs can be stored, also on a project set up with an earlier version of
     * supabase.sql: the public bucket must accept application/pdf, both buckets must allow the
     * file size, and the private bucket must exist. Only widens settings, never narrows them.
     */
    async ensurePdfStorage(minBytes = 0) {
      const want = Math.max(20 * 1024 * 1024, minBytes);
      const getBucket = async (id) => {
        try {
          return await call(`/storage/v1/bucket/${encodeURIComponent(id)}`);
        } catch (e) {
          if (e.status === 404 || e.status === 400) return null;
          throw e;
        }
      };
      const fix = async (id, isPublic) => {
        const b = await getBucket(id);
        if (!b) {
          await call('/storage/v1/bucket', { method: 'POST', body: { id, name: id, public: isPublic, file_size_limit: want, allowed_mime_types: isPublic ? ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] : ['application/pdf'] } });
          return;
        }
        const mimes = Array.isArray(b.allowed_mime_types) && b.allowed_mime_types.length ? b.allowed_mime_types : null;
        const needMime = mimes && !mimes.includes('application/pdf');
        const needSize = b.file_size_limit && Number(b.file_size_limit) < want;
        if (!needMime && !needSize) return;
        await call(`/storage/v1/bucket/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: { public: !!b.public, file_size_limit: needSize ? want : b.file_size_limit ?? null, allowed_mime_types: needMime ? [...mimes, 'application/pdf'] : mimes },
        });
      };
      await fix(bucket, true);
      await fix(privateBucket, false);
    },

    // ── private files (bucket without public access) ──
    async putPrivate(name, buffer) {
      await call(`/storage/v1/object/${privateBucket}/${encodeURIComponent(name)}`, {
        method: 'POST', raw: true, body: buffer, headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
      });
    },
    async getPrivate(name) {
      try {
        return await call(`/storage/v1/object/authenticated/${privateBucket}/${encodeURIComponent(name)}`, { binary: true });
      } catch (e) {
        if (e.status === 404 || e.status === 400) return null;
        throw e;
      }
    },
    async hasPrivate(name) {
      try {
        await call(`/storage/v1/object/info/authenticated/${privateBucket}/${encodeURIComponent(name)}`);
        return true;
      } catch (e) {
        if (e.status === 404 || e.status === 400) return false;
        throw e;
      }
    },
    async deletePrivate(name) {
      await call(`/storage/v1/object/${privateBucket}`, { method: 'DELETE', body: { prefixes: [name] } });
    },

    // ── records (table nt_records: leads…) ──
    async addRecord(col, rec) {
      await call('/rest/v1/nt_records', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { id: rec.id, collection: col, created_at: rec.createdAt, data: rec } });
    },
    async listRecords(col) {
      const rows = await call(`/rest/v1/nt_records?collection=eq.${encodeURIComponent(col)}&select=data&order=created_at.desc&limit=10000`);
      return (rows || []).map((r) => r.data);
    },
    async getRecord(col, id) {
      const rows = await call(`/rest/v1/nt_records?collection=eq.${encodeURIComponent(col)}&id=eq.${encodeURIComponent(id)}&select=data`);
      return rows && rows.length ? rows[0].data : null;
    },
    async updateRecord(col, id, patch) {
      const cur = await this.getRecord(col, id);
      if (!cur) return null;
      const next = { ...cur, ...patch };
      await call(`/rest/v1/nt_records?collection=eq.${encodeURIComponent(col)}&id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { data: next } });
      return next;
    },
    async deleteRecord(col, id) {
      const rows = await call(`/rest/v1/nt_records?collection=eq.${encodeURIComponent(col)}&id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
      return Array.isArray(rows) && rows.length > 0;
    },

    // ── contact messages (table nt_messages) ──
    async addMessage(m) {
      await call('/rest/v1/nt_messages', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: {
          id: m.id, created_at: m.createdAt, name: m.name, email: m.email, category: m.category,
          category_label: m.categoryLabel, message: m.message, lang: m.lang, read: m.read,
          status: m.status, notes: m.notes, source: m.source,
        },
      });
    },
    async listMessages() {
      const rows = await call('/rest/v1/nt_messages?select=*&order=created_at.desc&limit=5000');
      return (rows || []).map(fromRow);
    },
    async countUnreadMessages() {
      const rows = await call('/rest/v1/nt_messages?select=id&read=eq.false&limit=5000');
      return (rows || []).length;
    },
    async hasAtLeastMessages(n) {
      const rows = await call(`/rest/v1/nt_messages?select=id&order=created_at.asc&limit=1&offset=${Math.max(0, n - 1)}`);
      return Array.isArray(rows) && rows.length > 0;
    },
    async updateMessage(id, patch) {
      const rows = await call(`/rest/v1/nt_messages?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: Object.fromEntries(Object.entries({ read: patch.read, status: patch.status, notes: patch.notes }).filter(([, v]) => v !== undefined)),
      });
      return Array.isArray(rows) && rows.length ? fromRow(rows[0]) : null;
    },
    async deleteMessage(id) {
      const rows = await call(`/rest/v1/nt_messages?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=representation' },
      });
      return Array.isArray(rows) && rows.length > 0;
    },
  };
}
