// Production storage on Supabase (Postgres tables + Storage bucket),
// called through Supabase's HTTPS APIs — no SDK needed.
// Tables and bucket are created by server/supabase.sql.
import { ConflictError } from './store-file.js';

export function createSupabaseStore({ url, key, bucket }, fetchImpl = globalThis.fetch) {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  async function call(pathname, { method = 'GET', body, headers: h = {}, raw = false } = {}) {
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

    // ── contact messages (table nt_messages) ──
    async addMessage(m) {
      await call('/rest/v1/nt_messages', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: {
          id: m.id, created_at: m.createdAt, name: m.name, email: m.email, category: m.category,
          category_label: m.categoryLabel, message: m.message, lang: m.lang, read: m.read,
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
        body: { read: patch.read },
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
