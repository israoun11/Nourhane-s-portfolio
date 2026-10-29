// Runs the full app against a local imitation of the Supabase REST + Storage endpoints
// the driver uses. This checks request shapes and app behaviour — not Supabase itself.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startTestServer, client, PNG, PDF } from './helpers.js';
import { createSupabaseStore } from '../lib/store-supabase.js';

const KEY = 'sb_secret_test_key';
const db = { nt_content: new Map(), nt_sessions: new Map(), nt_messages: new Map(), nt_records: new Map() };
const objects = new Map();
const privateObjects = new Map();
const seen = [];

function mock(req, res) {
  const url = new URL(req.url, 'http://x');
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    seen.push(`${req.method} ${url.pathname}`);
    const send = (s, body) => {
      res.writeHead(s, { 'Content-Type': 'application/json' });
      res.end(body === undefined ? '' : JSON.stringify(body));
    };
    if (req.headers.apikey !== KEY || req.headers.authorization !== `Bearer ${KEY}`) return send(401, { message: 'bad key' });
    const raw = Buffer.concat(chunks);
    const q = Object.fromEntries([...url.searchParams].map(([k, v]) => [k, v.replace(/^(eq|lt)\./, '')]));
    const table = url.pathname.match(/^\/rest\/v1\/(nt_content|nt_sessions|nt_messages)$/)?.[1];

    if (table === 'nt_content') {
      if (req.method === 'GET') {
        const r = db.nt_content.get(q.key);
        return send(200, r ? [r] : []);
      }
      if (req.method === 'POST') {
        const b = JSON.parse(raw);
        if (db.nt_content.has(b.key)) return send(409, { code: '23505' });
        db.nt_content.set(b.key, b);
        return send(201);
      }
      if (req.method === 'PATCH') {
        const r = db.nt_content.get(q.key);
        if (!r || String(r.version) !== q.version) return send(200, []);
        Object.assign(r, JSON.parse(raw));
        return send(200, [r]);
      }
    }
    if (table === 'nt_sessions') {
      if (req.method === 'POST') {
        const b = JSON.parse(raw);
        db.nt_sessions.set(b.id_hash, b);
        return send(201);
      }
      if (req.method === 'GET') {
        const r = db.nt_sessions.get(q.id_hash);
        return send(200, r ? [r] : []);
      }
      if (req.method === 'DELETE') {
        if (q.id_hash) db.nt_sessions.delete(q.id_hash);
        if (q.expires_at) for (const [k, v] of db.nt_sessions) if (Date.parse(v.expires_at) < Date.parse(q.expires_at)) db.nt_sessions.delete(k);
        return send(204);
      }
    }
    if (table === 'nt_messages') {
      if (req.method === 'POST') {
        const b = JSON.parse(raw);
        for (const k of ['id', 'created_at', 'name', 'email', 'message', 'read']) if (b[k] === undefined) return send(400, { message: `missing ${k}` });
        db.nt_messages.set(b.id, b);
        return send(201);
      }
      let rows = [...db.nt_messages.values()];
      if (q.read) rows = rows.filter((r) => String(r.read) === q.read);
      if (q.id) rows = rows.filter((r) => r.id === q.id);
      if (req.method === 'GET') {
        rows.sort((a, b) => (q.order === 'created_at.asc' ? 1 : -1) * (a.created_at < b.created_at ? -1 : 1));
        const off = Number(q.offset || 0);
        return send(200, rows.slice(off, off + Number(q.limit || 1000)));
      }
      if (req.method === 'PATCH') {
        const patch = JSON.parse(raw);
        rows.forEach((r) => Object.assign(r, patch));
        return send(200, rows);
      }
      if (req.method === 'DELETE') {
        rows.forEach((r) => db.nt_messages.delete(r.id));
        return send(200, rows);
      }
    }
    if (url.pathname === '/rest/v1/nt_records') {
      let rows = [...db.nt_records.values()].filter((r) => !q.collection || r.collection === q.collection);
      if (q.id) rows = rows.filter((r) => r.id === q.id);
      if (req.method === 'POST') {
        const b = JSON.parse(raw);
        for (const k of ['id', 'collection', 'created_at', 'data']) if (b[k] === undefined) return send(400, { message: `missing ${k}` });
        db.nt_records.set(b.id, b);
        return send(201);
      }
      if (req.method === 'GET') return send(200, rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).map((r) => ({ data: r.data })));
      if (req.method === 'PATCH') {
        const patch = JSON.parse(raw);
        rows.forEach((r) => Object.assign(r, patch));
        return send(204);
      }
      if (req.method === 'DELETE') {
        rows.forEach((r) => db.nt_records.delete(r.id));
        return send(200, rows);
      }
    }
    const priv = url.pathname.match(/^\/storage\/v1\/object\/(?:(authenticated|info\/authenticated)\/)?portfolio-private\/(.+)$/);
    if (priv) {
      const name = decodeURIComponent(priv[2]);
      if (req.method === 'POST' && !priv[1]) {
        privateObjects.set(name, raw);
        return send(200, { Key: name });
      }
      if (req.method === 'GET' && priv[1]) {
        if (!privateObjects.has(name)) return send(400, { statusCode: '404', error: 'not_found' });
        if (priv[1] === 'authenticated') {
          res.writeHead(200, { 'Content-Type': 'application/pdf' });
          return res.end(privateObjects.get(name));
        }
        return send(200, { name });
      }
    }
    if (url.pathname === '/storage/v1/object/portfolio-private' && req.method === 'DELETE') {
      JSON.parse(raw).prefixes.forEach((p) => privateObjects.delete(p));
      return send(200, []);
    }
    const obj = url.pathname.match(/^\/storage\/v1\/object\/portfolio\/(.+)$/);
    if (obj && req.method === 'POST') {
      if (req.headers['x-upsert'] !== 'true') return send(400, {});
      objects.set(decodeURIComponent(obj[1]), { type: req.headers['content-type'], body: raw });
      return send(200, { Key: obj[1] });
    }
    if (url.pathname === '/storage/v1/object/portfolio' && req.method === 'DELETE') {
      JSON.parse(raw).prefixes.forEach((p) => objects.delete(p));
      return send(200, []);
    }
    send(404, { message: 'unknown route' });
  });
}

let sb, srv, sbUrl;
before(async () => {
  sb = http.createServer(mock);
  await new Promise((r) => sb.listen(0, '127.0.0.1', r));
  sbUrl = `http://127.0.0.1:${sb.address().port}`;
  srv = await startTestServer({
    env: { STORAGE_DRIVER: 'supabase', SUPABASE_URL: sbUrl, SUPABASE_SECRET_KEY: KEY },
    store: (cfg) => createSupabaseStore(cfg.supabase),
  });
});
after(async () => {
  await srv.close();
  await new Promise((r) => sb.close(r));
});

test('Supabase driver: seed, login, save, conflict, upload, logout', async () => {
  const c = client(srv.base);
  const pub = await c.req('GET', '/api/content', { admin: false });
  assert.equal(pub.status, 200);
  assert.equal(db.nt_content.get('content').version, 1, 'seeded row created');

  assert.equal((await c.login()).status, 200);
  assert.equal(db.nt_sessions.size, 1);
  assert.ok(![...db.nt_sessions.keys()][0].includes(c.cookie.split('=')[1]), 'only a hash of the token is stored');

  const cur = (await c.req('GET', '/api/admin/content')).data;
  const d = structuredClone(cur.data);
  d.text.mind.title = 'ONE CREATIVE MIND — EDITED.';
  const saved = await c.req('PUT', '/api/admin/content', { json: { data: d, version: cur.version } });
  assert.equal(saved.status, 200);
  assert.equal(db.nt_content.get('content').value.text.mind.title, 'ONE CREATIVE MIND — EDITED.');
  assert.equal(db.nt_content.get('history').value.items[0].version, 1);
  assert.equal((await c.req('PUT', '/api/admin/content', { json: { data: d, version: cur.version } })).status, 409);

  const up = await c.req('POST', '/api/admin/upload', { body: PNG, headers: { 'Content-Type': 'image/png' } });
  assert.equal(up.status, 200);
  assert.equal(up.data.url, `${sbUrl}/storage/v1/object/public/portfolio/${[...objects.keys()][0]}`);
  assert.equal([...objects.values()][0].type, 'image/png');

  await c.req('POST', '/api/auth/logout');
  assert.equal(db.nt_sessions.size, 0, 'session row deleted on logout');
});

test('Supabase outage: clear error, saved content untouched', async () => {
  const s = createSupabaseStore({ url: 'http://127.0.0.1:1', key: KEY, bucket: 'portfolio' });
  await assert.rejects(() => s.getKV('content'), /unreachable/);
  assert.equal(db.nt_content.get('content').value.text.mind.title, 'ONE CREATIVE MIND — EDITED.');
});

test('Supabase driver: contact messages are stored in nt_messages and managed from the inbox', async () => {
  const r = await fetch(srv.base + '/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Visitor', email: 'v@example.com', category: 'work', message: 'A message long enough to be accepted.', lang: 'ar' }),
  });
  assert.equal(r.status, 201);
  const { id } = await r.json();
  const row = db.nt_messages.get(id);
  assert.equal(row.name, 'Visitor');
  assert.equal(row.category_label, "Let's work together");
  assert.equal(row.lang, 'en', 'Arabic no longer accepted: English');
  const c = client(srv.base);
  await c.login();
  const list = await c.req('GET', '/api/admin/messages');
  assert.equal(list.data.items[0].id, id);
  assert.equal(list.data.items[0].categoryLabel, "Let's work together");
  assert.equal(list.data.unread, 1);
  assert.equal((await c.req('PATCH', `/api/admin/messages/${id}`, { json: { read: true } })).data.item.read, true);
  assert.equal(db.nt_messages.get(id).read, true);
  assert.equal((await c.req('DELETE', `/api/admin/messages/${id}`)).status, 200);
  assert.equal(db.nt_messages.has(id), false);
});

test('Supabase driver: private PDF, lead stored in nt_records, signed download', async () => {
  const c = client(srv.base);
  await c.login();
  const up = await c.req('POST', '/api/admin/upload?access=private', { body: PDF, headers: { 'Content-Type': 'application/pdf' } });
  assert.equal(up.status, 200);
  assert.match(up.data.url, /^private:[a-f0-9]{64}\.pdf$/);
  assert.equal(privateObjects.size, 1, 'stored in the private bucket');
  assert.ok(![...objects.keys()].some((k) => k.endsWith('.pdf')), 'not in the public bucket');
  const cur = (await c.req('GET', '/api/admin/content')).data;
  const d = structuredClone(cur.data);
  d.products[0].file = up.data.url;
  assert.equal((await c.req('PUT', '/api/admin/content', { json: { data: d, version: cur.version } })).status, 200);
  const r = await fetch(srv.base + '/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product: d.products[0].slug, name: 'Reader', email: 'reader@example.com' }),
  });
  assert.equal(r.status, 201);
  const { url } = await r.json();
  assert.equal(db.nt_records.size, 1);
  const rec = [...db.nt_records.values()][0];
  assert.equal(rec.collection, 'leads');
  assert.equal(rec.data.email, 'reader@example.com');
  const dl = await fetch(srv.base + url);
  assert.equal(dl.status, 200);
  assert.ok(Buffer.from(await dl.arrayBuffer()).equals(PDF));
  assert.equal([...db.nt_records.values()][0].data.downloads, 1, 'download counted');
  const list = await c.req('GET', '/api/admin/leads');
  assert.equal(list.data.items[0].email, 'reader@example.com');
  assert.equal((await c.req('DELETE', `/api/admin/leads/${rec.id}`)).status, 200);
  assert.equal(db.nt_records.size, 0);
});
