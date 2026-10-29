import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, client, PNG, EMAIL } from './helpers.js';
import { tokenHash } from '../lib/auth.js';

let srv;
before(async () => (srv = await startTestServer()));
after(async () => srv.close());

test('public content is seeded from the approved content and cacheable', async () => {
  const c = client(srv.base);
  const r = await c.req('GET', '/api/content', { admin: false });
  assert.equal(r.status, 200);
  assert.equal(r.data.data.text.hero.line3, 'Visual.');
  assert.equal(r.data.data.projects.length, 6);
  const etag = r.headers.get('etag');
  const r2 = await fetch(srv.base + '/api/content', { headers: { 'If-None-Match': etag } });
  assert.equal(r2.status, 304);
});

test('admin API rejects requests without a session', async () => {
  const c = client(srv.base);
  for (const [m, p] of [['GET', '/api/admin/content'], ['GET', '/api/admin/status'], ['GET', '/api/admin/history']]) {
    assert.equal((await c.req(m, p)).status, 401, `${m} ${p}`);
  }
  assert.equal((await c.req('PUT', '/api/admin/content', { json: { data: {}, version: 1 } })).status, 401);
  assert.equal((await c.req('POST', '/api/admin/upload', { body: PNG, headers: { 'Content-Type': 'image/png' } })).status, 401);
});

test('CSRF protection: missing header or foreign Origin is blocked', async () => {
  const c = client(srv.base);
  assert.equal((await c.req('POST', '/api/auth/login', { json: { email: EMAIL, password: 'x' }, admin: false })).status, 403);
  const r = await c.req('POST', '/api/auth/login', { json: { email: EMAIL, password: 'x' }, headers: { Origin: 'https://evil.example' } });
  assert.equal(r.status, 403);
});

test('wrong credentials get a safe, generic error', async () => {
  const c = client(srv.base);
  const r = await c.login(EMAIL, 'wrong password here');
  assert.equal(r.status, 401);
  assert.equal(r.data.error, 'Incorrect email or password.');
  const r2 = await c.login('someone@else.com', 'a long test passphrase');
  assert.equal(r2.data.error, 'Incorrect email or password.');
  assert.equal(r2.setCookie, null);
});

test('valid login sets a secure-by-default session cookie; logout invalidates it', async () => {
  const c = client(srv.base);
  const r = await c.login();
  assert.equal(r.status, 200);
  assert.match(r.setCookie, /HttpOnly/);
  assert.match(r.setCookie, /SameSite=Strict/);
  assert.match(r.setCookie, /Max-Age=28800/);
  assert.equal((await c.req('GET', '/api/auth/session')).data.authenticated, true);
  const stolen = c.cookie;
  assert.equal((await c.req('POST', '/api/auth/logout')).status, 200);
  c.cookie = stolen; // replaying the old cookie must not work
  assert.equal((await c.req('GET', '/api/admin/content')).status, 401);
});

test('expired sessions are rejected', async () => {
  const c = client(srv.base);
  await srv.store.createSession(tokenHash('expired-token'), Date.now() - 1000);
  c.cookie = 'nt_session=expired-token';
  const r = await c.req('GET', '/api/admin/content');
  assert.equal(r.status, 401);
  assert.equal(r.data.code, 'SESSION');
});

test('content edits are validated, persisted, versioned and visible publicly', async () => {
  const c = client(srv.base);
  await c.login();
  const cur = await c.req('GET', '/api/admin/content');
  assert.equal(cur.status, 200);
  const v = cur.data.version;

  // invalid → rejected, nothing changes
  const bad = structuredClone(cur.data.data);
  bad.text.hero.line1 = '';
  bad.site.socials.linkedin = 'javascript:alert(1)';
  const r1 = await c.req('PUT', '/api/admin/content', { json: { data: bad, version: v } });
  assert.equal(r1.status, 422);
  assert.ok(r1.data.errors.length >= 2);
  assert.equal((await c.req('GET', '/api/admin/content')).data.version, v);

  // valid → saved
  const good = structuredClone(cur.data.data);
  good.text.hero.intro = 'Updated introduction from the dashboard.';
  good.projects[1].published = false;
  const r2 = await c.req('PUT', '/api/admin/content', { json: { data: good, version: v } });
  assert.equal(r2.status, 200);
  assert.equal(r2.data.version, v + 1);

  const pub = await c.req('GET', '/api/content', { admin: false });
  assert.equal(pub.data.data.text.hero.intro, 'Updated introduction from the dashboard.');
  assert.ok(!pub.data.data.projects.some((p) => p.slug === 'novaseeds'), 'hidden project not public');
  assert.ok(!pub.data.data.expertise.some((e) => e.proof.includes('novaseeds')), 'no links to hidden project');

  // stale version → conflict, newer content kept
  const r3 = await c.req('PUT', '/api/admin/content', { json: { data: cur.data.data, version: v } });
  assert.equal(r3.status, 409);
  assert.equal((await c.req('GET', '/api/content', { admin: false })).data.data.text.hero.intro, 'Updated introduction from the dashboard.');

  // previous version listed in history and restorable
  const h = await c.req('GET', '/api/admin/history');
  assert.equal(h.data.items[0].version, v);
  const rr = await c.req('POST', '/api/admin/restore', { json: { version: v, currentVersion: v + 1 } });
  assert.equal(rr.status, 200);
  assert.equal(rr.data.data.projects[1].published, true);
});

test('pages: content injected safely, SEO titles, 404 status for hidden/unknown pages', async () => {
  const c = client(srv.base);
  await c.login();
  const cur = (await c.req('GET', '/api/admin/content')).data;
  const d = structuredClone(cur.data);
  d.text.hero.intro = '</script><script>alert(1)</script>';
  d.projects[2].published = false;
  assert.equal((await c.req('PUT', '/api/admin/content', { json: { data: d, version: cur.version } })).status, 200);

  const home = await fetch(srv.base + '/');
  const html = await home.text();
  assert.equal(home.status, 200);
  assert.ok(html.includes('id="nt-content"'));
  assert.ok(!html.includes('</script><script>alert(1)'), 'script breakout prevented');
  assert.match(home.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(home.headers.get('x-frame-options'), 'DENY');

  const cs = await fetch(srv.base + '/work/vxn-moto-procap');
  assert.equal(cs.status, 200);
  assert.match(await cs.text(), /<title>VXN Moto \/ PROCAP — Nourhane Thabet<\/title>/);
  // language chosen by the visitor (cookie) → <html lang/dir> and translated title
  const ar = await (await fetch(srv.base + '/', { headers: { Cookie: 'nt_lang=ar' } })).text();
  assert.match(ar, /<html lang="en" dir="ltr">/, 'Arabic is no longer a website language');
  const fr = await (await fetch(srv.base + '/?lang=fr')).text();
  assert.match(fr, /<html lang="fr" dir="ltr">/);
  const bad = await (await fetch(srv.base + '/', { headers: { Cookie: 'nt_lang="><script>' } })).text();
  assert.match(bad, /<html lang="en" dir="ltr">/, 'unknown language falls back to English');
  assert.equal((await fetch(srv.base + '/work/dar-el-keswa')).status, 404, 'hidden project page');
  assert.equal((await fetch(srv.base + '/no-such-page')).status, 404);
  const admin = await fetch(srv.base + '/admin');
  assert.equal(admin.status, 200);
  assert.equal(admin.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.ok(!(await admin.text()).includes('nt-content'));
});

test('static files: long cache for assets, no path traversal', async () => {
  const a = await fetch(srv.base + '/assets/app.js');
  assert.equal(a.status, 200);
  assert.match(a.headers.get('cache-control'), /immutable/);
  for (const p of ['/../server/app.js', '/%2e%2e/server/app.js', '/assets/../../package.json', '/uploads/../kv/content.json']) {
    const r = await fetch(srv.base + p);
    const t = await r.text();
    assert.ok(!t.includes('createApp') && !t.includes('"version"'), `traversal blocked for ${p}`);
  }
});

test('uploads: type sniffing, size limit, dedupe, safe serving', async () => {
  const c = client(srv.base);
  await c.login();
  const up = (body, type) => c.req('POST', '/api/admin/upload', { body, headers: { 'Content-Type': type } });
  assert.equal((await up(Buffer.from('<svg onload=alert(1)>'), 'image/svg+xml')).status, 415);
  assert.equal((await up(Buffer.from('not really a jpeg'), 'image/jpeg')).status, 415, 'content is checked, not the label');
  assert.equal((await up(Buffer.alloc(6 * 1024 * 1024, 1), 'image/png')).status, 413);
  const ok = await up(PNG, 'image/png');
  assert.equal(ok.status, 200);
  assert.match(ok.data.url, /^\/uploads\/[a-f0-9]{64}\.png$/);
  const again = await up(PNG, 'image/png');
  assert.equal(again.data.reused, true);
  const img = await fetch(srv.base + ok.data.url);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png');
  assert.equal(img.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await fetch(srv.base + '/uploads/evil.html')).status, 404);

  // image saved into content persists
  const cur = (await c.req('GET', '/api/admin/content')).data;
  const d = structuredClone(cur.data);
  d.site.portrait = ok.data.url;
  assert.equal((await c.req('PUT', '/api/admin/content', { json: { data: d, version: cur.version } })).status, 200);
  assert.equal((await c.req('GET', '/api/content', { admin: false })).data.data.site.portrait, ok.data.url);
});

test('login is rate limited', async () => {
  const c = client(srv.base);
  const statuses = [];
  for (let i = 0; i < 7; i++) statuses.push((await c.login(EMAIL, 'definitely wrong ' + i)).status);
  assert.ok(statuses.includes(429), `got ${statuses.join(',')}`);
  const r = await c.login();
  assert.equal(r.status, 429, 'still blocked even with the right password during the lock window');
});
