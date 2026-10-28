import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, client } from './helpers.js';

let srv;
before(async () => (srv = await startTestServer()));
after(async () => srv.close());

const send = (body, headers = {}) =>
  fetch(srv.base + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const good = { name: 'Amira Test', email: 'amira@example.com', category: 'collab', message: 'Hello, I would like to talk about a project.', lang: 'fr' };

test('contact: a valid message is stored and confirmed only after saving', async () => {
  const r = await send(good);
  assert.equal(r.status, 201);
  const body = await r.json();
  assert.equal(body.ok, true);
  assert.match(body.id, /^[0-9a-f-]{36}$/);
  // it really is in storage
  const all = await srv.store.listMessages();
  const m = all.find((x) => x.id === body.id);
  assert.ok(m, 'message stored');
  assert.equal(m.name, 'Amira Test');
  assert.equal(m.category, 'collab');
  assert.equal(m.categoryLabel, "Let's collaborate");
  assert.equal(m.lang, 'fr');
  assert.equal(m.read, false);
  assert.ok(Date.parse(m.createdAt) > Date.now() - 60000);
});

test('contact: invalid fields are rejected with field codes, nothing stored', async () => {
  const before = (await srv.store.listMessages()).length;
  const r = await send({ name: ' ', email: 'not-an-email', message: 'short', category: 'hack' });
  assert.equal(r.status, 422);
  const b = await r.json();
  assert.equal(b.code, 'INVALID');
  assert.deepEqual(b.fields, { name: 'required', email: 'invalid', message: 'tooShort' });
  assert.equal(await (await send({ ...good, message: 'x'.repeat(5001) })).status, 422);
  assert.equal(await (await send({ ...good, company: 'bot inc' })).status, 400, 'honeypot');
  assert.equal((await srv.store.listMessages()).length, before);
});

test('contact: only from this website, JSON only', async () => {
  assert.equal((await send(good, { Origin: 'https://evil.example' })).status, 403);
  const form = await fetch(srv.base + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'name=x' });
  assert.equal(form.status, 415);
});

test('contact: text is stored as plain text (no HTML interpretation, control chars removed)', async () => {
  const r = await send({ ...good, name: 'Sam\u0007 <b>Bold</b>', message: 'Line one\r\nLine two <script>alert(1)</script> enough text here' });
  const { id } = await r.json();
  const m = (await srv.store.listMessages()).find((x) => x.id === id);
  assert.equal(m.name, 'Sam <b>Bold</b>');
  assert.equal(m.message, 'Line one\nLine two <script>alert(1)</script> enough text here');
});

test('inbox: admin only; list, mark read/unread, delete', async () => {
  const anon = client(srv.base);
  assert.equal((await anon.req('GET', '/api/admin/messages')).status, 401);
  const c = client(srv.base);
  await c.login();
  const list = await c.req('GET', '/api/admin/messages');
  assert.equal(list.status, 200);
  assert.ok(list.data.total >= 2);
  assert.equal(list.data.unread, list.data.total);
  const first = list.data.items[0];
  assert.ok(list.data.items.every((m, i, a) => i === 0 || a[i - 1].createdAt >= m.createdAt), 'newest first');
  // CSRF header required for changes
  assert.equal((await c.req('PATCH', `/api/admin/messages/${first.id}`, { json: { read: true }, admin: false })).status, 403);
  const r = await c.req('PATCH', `/api/admin/messages/${first.id}`, { json: { read: true } });
  assert.equal(r.status, 200);
  assert.equal(r.data.item.read, true);
  assert.equal((await c.req('GET', '/api/admin/status')).data.unreadMessages, list.data.unread - 1);
  assert.equal((await c.req('PATCH', `/api/admin/messages/${first.id}`, { json: { read: false } })).data.item.read, false);
  assert.equal((await c.req('PATCH', '/api/admin/messages/../../kv', { json: { read: true } })).status, 404);
  assert.equal((await c.req('DELETE', `/api/admin/messages/${first.id}`)).status, 200);
  assert.equal((await c.req('DELETE', `/api/admin/messages/${first.id}`)).status, 404);
  const after = await c.req('GET', '/api/admin/messages');
  assert.equal(after.data.total, list.data.total - 1);
});

test('contact: rate limit per visitor', async () => {
  const local = await startTestServer();
  try {
    let last;
    for (let i = 0; i < 6; i++) last = await fetch(local.base + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(good) });
    assert.equal(last.status, 429);
    assert.equal((await local.store.listMessages()).length, 5);
  } finally {
    await local.close();
  }
});
