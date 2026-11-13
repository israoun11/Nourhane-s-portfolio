// PDF uploads from the dashboard: real PDFs only, saved into their field at once,
// file name kept, replace / remove, private vs public, and a Supabase project set up
// with an earlier version (bucket accepting images only) repaired automatically.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startTestServer, client, PDF, PNG } from './helpers.js';
import { createSupabaseStore } from '../lib/store-supabase.js';

const PDF2 = Buffer.concat([PDF.subarray(0, PDF.length - 6), Buffer.from('% second version\n%%EOF\n')]);
const PDF3 = Buffer.concat([PDF.subarray(0, PDF.length - 6), Buffer.from('% private guide\n%%EOF\n')]);
const pdfUpload = (c, buf, name, access = 'public') =>
  c.req('POST', `/api/admin/upload?access=${access}`, { body: buf, headers: { 'Content-Type': 'application/pdf', 'X-File-Name': encodeURIComponent(name) } });

let srv;
before(async () => {
  srv = await startTestServer();
});
after(() => srv.close());

test('CV: upload → saved into its field at once, name shown, opens the real file, survives a refresh', async () => {
  const c = client(srv.base);
  await c.login();
  const v0 = (await c.req('GET', '/api/admin/content')).data.version;
  const up = await pdfUpload(c, PDF, 'Nourhane Thabet – CV 2026.pdf');
  assert.equal(up.status, 200);
  assert.match(up.data.url, /^\/uploads\/[a-f0-9]{64}\.pdf$/);
  assert.equal(up.data.name, 'Nourhane Thabet – CV 2026.pdf');

  const set = await c.req('POST', '/api/admin/content/file', { json: { path: ['site', 'cvFile'], url: up.data.url, name: 'Nourhane Thabet – CV 2026.pdf' } });
  assert.equal(set.status, 200);
  assert.equal(set.data.version, v0 + 1, 'saved as a new version');
  assert.equal(set.data.data.site.cvFile, up.data.url);

  // "refresh": load again from the server
  const again = (await c.req('GET', '/api/admin/content')).data;
  assert.equal(again.data.site.cvFile, up.data.url);
  assert.equal(again.data.fileNames[up.data.url], 'Nourhane Thabet – CV 2026.pdf');

  // website: link to the real file, which is the uploaded PDF
  const pub = (await c.req('GET', '/api/content', { admin: false })).data.data;
  assert.equal(pub.site.cvFile, up.data.url);
  assert.equal(pub.fileNames, undefined, 'file names stay in the dashboard');
  const file = await fetch(srv.base + up.data.url);
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('content-type'), 'application/pdf');
  assert.ok(Buffer.from(await file.arrayBuffer()).equals(PDF));
});

test('replace the CV, then remove it — each change saved at once; old name forgotten', async () => {
  const c = client(srv.base);
  await c.login();
  const first = (await c.req('GET', '/api/admin/content')).data.data.site.cvFile;
  const up = await pdfUpload(c, PDF2, 'CV-updated.pdf');
  const set = await c.req('POST', '/api/admin/content/file', { json: { path: ['site', 'cvFile'], url: up.data.url, name: 'CV-updated.pdf' } });
  assert.equal(set.data.data.site.cvFile, up.data.url);
  assert.notEqual(up.data.url, first);
  assert.deepEqual(set.data.data.fileNames, { [up.data.url]: 'CV-updated.pdf' });
  assert.equal((await c.req('GET', '/api/content', { admin: false })).data.data.site.cvFile, up.data.url);

  const rm = await c.req('POST', '/api/admin/content/file', { json: { path: ['site', 'cvFile'], url: '' } });
  assert.equal(rm.status, 200);
  assert.equal(rm.data.data.site.cvFile, '');
  assert.deepEqual(rm.data.data.fileNames, {});
});

test('free resource: private PDF saved into the product, delivered after the form', async () => {
  const c = client(srv.base);
  await c.login();
  const up = await pdfUpload(c, PDF3, 'Guide gratuit.pdf', 'private');
  assert.match(up.data.url, /^private:[a-f0-9]{64}\.pdf$/);
  const set = await c.req('POST', '/api/admin/content/file', { json: { path: ['products', 0, 'file'], url: up.data.url, name: 'Guide gratuit.pdf' } });
  assert.equal(set.status, 200);
  assert.equal(set.data.data.products[0].file, up.data.url);
  assert.equal(set.data.data.fileNames[up.data.url], 'Guide gratuit.pdf');
  const pub = (await c.req('GET', '/api/content', { admin: false })).data.data;
  assert.equal(pub.products[0].hasFile, true);
  assert.equal(pub.products[0].file, undefined, 'private reference never sent to visitors');
  assert.equal((await fetch(srv.base + '/uploads/' + up.data.url.slice(8))).status, 404, 'not reachable directly');
  const lead = await fetch(srv.base + '/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: srv.base }, body: JSON.stringify({ name: 'Amira', email: 'amira@example.com', product: pub.products[0].slug, consent: false }) });
  assert.equal(lead.status, 201);
  const { url: download } = await lead.json();
  const dl = await fetch(srv.base + download);
  assert.equal(dl.status, 200);
  assert.ok(Buffer.from(await dl.arrayBuffer()).equals(PDF3), 'the actual uploaded PDF');
});

test('only real PDFs, only PDF fields, only uploaded files; images unaffected', async () => {
  const c = client(srv.base);
  await c.login();
  const fake = await c.req('POST', '/api/admin/upload?access=public', { body: Buffer.from('not a pdf, just text pretending to be one '.repeat(4)), headers: { 'Content-Type': 'application/pdf' } });
  assert.equal(fake.status, 415);
  const up = await pdfUpload(c, PDF, 'a.pdf');
  assert.equal((await c.req('POST', '/api/admin/content/file', { json: { path: ['site', 'name'], url: up.data.url } })).status, 400, 'not a PDF field');
  assert.equal((await c.req('POST', '/api/admin/content/file', { json: { path: ['site', 'cvFile'], url: '/uploads/' + 'a'.repeat(64) + '.pdf' } })).status, 400, 'never uploaded');
  assert.equal((await c.req('POST', '/api/admin/content/file', { json: { path: ['products', 0, 'file'], url: up.data.url } })).status, 400, 'public PDF refused in a private field');
  const missing = await c.req('POST', '/api/admin/content/file', { json: { path: ['products', 19, 'file'], url: '' } });
  assert.equal(missing.status, 409);
  assert.equal(missing.data.code, 'NOT_SAVED');
  assert.equal((await client(srv.base).req('POST', '/api/admin/content/file', { json: { path: ['site', 'cvFile'], url: '' } })).status, 401, 'login required');
  const img = await c.req('POST', '/api/admin/upload', { body: PNG, headers: { 'Content-Type': 'image/png' } });
  assert.equal(img.status, 200);
  assert.match(img.data.url, /^\/uploads\/[a-f0-9]{64}\.png$/);
});

test('saving the rest of the dashboard keeps the PDF and its name', async () => {
  const c = client(srv.base);
  await c.login();
  const up = await pdfUpload(c, PDF, 'kept.pdf');
  await c.req('POST', '/api/admin/content/file', { json: { path: ['site', 'cvFile'], url: up.data.url, name: 'kept.pdf' } });
  const cur = (await c.req('GET', '/api/admin/content')).data;
  const d = structuredClone(cur.data);
  d.site.role = 'Creative & Digital Marketing Strategist';
  const saved = await c.req('PUT', '/api/admin/content', { json: { data: d, version: cur.version } });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.data.site.cvFile, up.data.url);
  assert.equal(saved.data.data.fileNames[up.data.url], 'kept.pdf');
});

// ── Supabase project configured by an earlier version: public bucket = images only, 5 MB,
//    no private bucket. The first PDF upload repairs the buckets and succeeds. ──
const KEY = 'sb_secret_test_key';
const kv = new Map();
const buckets = new Map([['portfolio', { id: 'portfolio', public: true, file_size_limit: 5 * 1024 * 1024, allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'] }]]);
const objects = new Map();
const calls = [];
function mock(req, res) {
  const url = new URL(req.url, 'http://x');
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const raw = Buffer.concat(chunks);
    calls.push(`${req.method} ${url.pathname}`);
    const send = (s, body) => {
      res.writeHead(s, { 'Content-Type': 'application/json' });
      res.end(body === undefined ? '' : JSON.stringify(body));
    };
    if (req.headers.apikey !== KEY) return send(401, {});
    const q = Object.fromEntries([...url.searchParams].map(([k, v]) => [k, v.replace(/^eq\./, '')]));
    if (url.pathname === '/rest/v1/nt_content') {
      if (req.method === 'GET') return send(200, kv.has(q.key) ? [kv.get(q.key)] : []);
      if (req.method === 'POST') {
        const b = JSON.parse(raw);
        if (kv.has(b.key)) return send(409, { code: '23505' });
        kv.set(b.key, b);
        return send(201);
      }
      if (req.method === 'PATCH') {
        const r = kv.get(q.key);
        if (!r || String(r.version) !== q.version) return send(200, []);
        Object.assign(r, JSON.parse(raw));
        return send(200, [r]);
      }
    }
    if (url.pathname === '/rest/v1/nt_sessions') {
      if (req.method === 'POST') { const b = JSON.parse(raw); kv.set('s:' + b.id_hash, b); return send(201); }
      if (req.method === 'GET') { const r = kv.get('s:' + q.id_hash); return send(200, r ? [r] : []); }
      return send(204);
    }
    const bk = url.pathname.match(/^\/storage\/v1\/bucket(?:\/([^/]+))?$/);
    if (bk) {
      if (req.method === 'GET') return buckets.has(bk[1]) ? send(200, buckets.get(bk[1])) : send(400, { statusCode: '404', error: 'Bucket not found' });
      if (req.method === 'POST') { const b = JSON.parse(raw); buckets.set(b.id, b); return send(200, { name: b.id }); }
      if (req.method === 'PUT') { Object.assign(buckets.get(bk[1]), JSON.parse(raw)); return send(200, { message: 'Successfully updated' }); }
    }
    const obj = url.pathname.match(/^\/storage\/v1\/object\/(?:authenticated\/)?([^/]+)\/(.+)$/);
    if (obj) {
      const b = buckets.get(obj[1]);
      if (!b) return send(400, { statusCode: '404', error: 'Bucket not found', message: 'Bucket not found' });
      if (req.method === 'POST') {
        const type = req.headers['content-type'];
        if (b.allowed_mime_types && !b.allowed_mime_types.includes(type)) return send(400, { statusCode: '415', error: 'invalid_mime_type', message: `mime type ${type} is not supported` });
        if (b.file_size_limit && raw.length > b.file_size_limit) return send(400, { statusCode: '413', error: 'Payload too large' });
        objects.set(`${obj[1]}/${obj[2]}`, { raw, type });
        return send(200, { Key: obj[2] });
      }
      if (req.method === 'GET') {
        const o = objects.get(`${obj[1]}/${obj[2]}`);
        if (!o) return send(400, { statusCode: '404', error: 'not_found' });
        res.writeHead(200, { 'Content-Type': o.type });
        return res.end(o.raw);
      }
    }
    send(404, {});
  });
}

test('Supabase set up by an earlier version: PDF upload repairs the buckets and works', async () => {
  const sb = http.createServer(mock);
  await new Promise((r) => sb.listen(0, '127.0.0.1', r));
  const sbUrl = `http://127.0.0.1:${sb.address().port}`;
  const s2 = await startTestServer({ store: () => createSupabaseStore({ url: sbUrl, key: KEY, bucket: 'portfolio' }) });
  try {
    const c = client(s2.base);
    assert.equal((await c.login()).status, 200);
    const up = await pdfUpload(c, PDF, 'CV.pdf');
    assert.equal(up.status, 200, JSON.stringify(up.data));
    assert.equal(up.data.url, `${sbUrl}/storage/v1/object/public/portfolio/${up.data.url.split('/').pop()}`);
    assert.ok(buckets.get('portfolio').allowed_mime_types.includes('application/pdf'), 'public bucket now accepts PDF');
    assert.deepEqual(buckets.get('portfolio').allowed_mime_types.slice(0, 3), ['image/jpeg', 'image/png', 'image/webp'], 'images still accepted');
    assert.ok(buckets.get('portfolio').file_size_limit >= 20 * 1024 * 1024);
    const set = await c.req('POST', '/api/admin/content/file', { json: { path: ['site', 'cvFile'], url: up.data.url, name: 'CV.pdf' } });
    assert.equal(set.status, 200);
    assert.equal(kv.get('content').value.site.cvFile, up.data.url, 'stored in the database');
    assert.equal(kv.get('content').value.fileNames[up.data.url], 'CV.pdf');

    const priv = await pdfUpload(c, PDF2, 'Guide.pdf', 'private');
    assert.equal(priv.status, 200, JSON.stringify(priv.data));
    assert.equal(buckets.get('portfolio-private').public, false, 'private bucket created, not public');
    assert.ok(objects.has(`portfolio-private/${priv.data.url.slice(8)}`));

    const img = await c.req('POST', '/api/admin/upload', { body: PNG, headers: { 'Content-Type': 'image/png' } });
    assert.equal(img.status, 200, 'image uploads unaffected');
  } finally {
    await s2.close();
    await new Promise((r) => sb.close(r));
  }
});

test('storage refusing a PDF for another reason → clear error, nothing saved', async () => {
  const sb = http.createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      if (req.url.startsWith('/rest/v1/nt_content') && req.method === 'GET') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(kv.has('content') ? [kv.get('content')] : [])); }
      if (req.url.startsWith('/rest/v1/nt_sessions')) { res.writeHead(req.method === 'POST' ? 201 : 200, { 'Content-Type': 'application/json' }); return res.end(req.method === 'GET' ? JSON.stringify([{ id_hash: 'x', expires_at: new Date(Date.now() + 1e6).toISOString(), last_seen_at: new Date().toISOString(), created_at: new Date().toISOString() }]) : ''); }
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end('{"message":"internal"}');
    });
  });
  await new Promise((r) => sb.listen(0, '127.0.0.1', r));
  const s3 = await startTestServer({ store: () => createSupabaseStore({ url: `http://127.0.0.1:${sb.address().port}`, key: KEY, bucket: 'portfolio' }) });
  try {
    const c = client(s3.base);
    await c.login();
    const up = await pdfUpload(c, PDF, 'CV.pdf');
    assert.equal(up.status, 502);
    assert.match(up.data.error, /^The PDF could not be stored/);
  } finally {
    await s3.close();
    await new Promise((r) => sb.close(r));
  }
});
