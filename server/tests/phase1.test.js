import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, client, PDF, PNG } from './helpers.js';

let srv;
let c;
// Fake Calendly API (no real network in tests)
const calls = [];
const fakeFetch = async (url, opts = {}) => {
  calls.push(String(url));
  const u = String(url);
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
  if (u.startsWith('https://api.calendly.com/users/me')) return json({ resource: { uri: 'https://api.calendly.com/users/U1' } });
  if (u.startsWith('https://api.calendly.com/scheduled_events?'))
    return json({ collection: [{ uri: 'https://api.calendly.com/scheduled_events/E1', name: 'Intro call', start_time: '2030-01-02T10:00:00Z', end_time: '2030-01-02T10:30:00Z', status: 'active', location: { join_url: 'https://meet.example/x' } }] });
  if (u.includes('/invitees')) return json({ collection: [{ name: 'Guest', email: 'guest@example.com', cancel_url: 'https://calendly.com/cancel', reschedule_url: 'https://calendly.com/re' }] });
  if (u === 'https://ok.example/') return new Response('', { status: 200 });
  if (u === 'https://broken.example/') return new Response('', { status: 404 });
  throw new TypeError('fetch failed');
};

before(async () => {
  srv = await startTestServer({ env: { CALENDLY_TOKEN: 'test-token', DOWNLOAD_SECRET: 'x'.repeat(40) }, deps: { fetch: fakeFetch } });
  c = client(srv.base);
  await c.login();
});
after(async () => srv.close());

const getContent = async () => (await c.req('GET', '/api/admin/content')).data;
async function save(mut) {
  const cur = await getContent();
  const data = structuredClone(cur.data);
  mut(data);
  const r = await c.req('PUT', '/api/admin/content', { json: { data, version: cur.version } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return r.data;
}
const lead = (body, headers = {}) =>
  fetch(srv.base + '/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('PDF upload: real PDFs only; private files are not public', async () => {
  const up = (body, access) => c.req('POST', `/api/admin/upload?access=${access}`, { body, headers: { 'Content-Type': 'application/pdf' } });
  assert.equal((await up(PNG, 'public')).status, 415, 'a PNG renamed as PDF is refused');
  const pub = await up(PDF, 'public');
  assert.equal(pub.status, 200);
  assert.match(pub.data.url, /^\/uploads\/[a-f0-9]{64}\.pdf$/);
  const served = await fetch(srv.base + pub.data.url);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('content-type'), 'application/pdf');
  const PDF2 = Buffer.concat([PDF.subarray(0, 9), Buffer.from('% private copy\n'), PDF.subarray(9)]);
  const priv = await up(PDF2, 'private');
  assert.match(priv.data.url, /^private:[a-f0-9]{64}\.pdf$/);
  const name = priv.data.url.slice(8);
  assert.equal((await fetch(srv.base + '/uploads/' + name)).status, 404, 'private file not under /uploads');
  assert.equal((await client(srv.base).req('GET', '/api/admin/file?name=' + encodeURIComponent(priv.data.url))).status, 401);
  const prev = await c.req('GET', '/api/admin/file?name=' + encodeURIComponent(priv.data.url));
  assert.equal(prev.status, 200);
});

test('free PDF: no file → honest error and no lead stored; with file → signed link, download counted', async () => {
  const { data } = await getContent();
  const slug = data.products[0].slug;
  assert.equal(data.products[0].kind, 'free');
  let r = await lead({ product: slug, name: 'Lina', email: 'lina@example.com', consent: false });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, 'NO_FILE');
  assert.equal((await c.req('GET', '/api/admin/leads')).data.total, 0);

  const priv = await c.req('POST', '/api/admin/upload?access=private', { body: PDF, headers: { 'Content-Type': 'application/pdf' } });
  await save((d) => (d.products[0].file = priv.data.url));
  // the private reference never reaches the public site
  const pubContent = await (await fetch(srv.base + '/api/content')).json();
  assert.equal(pubContent.data.products[0].file, undefined);
  assert.equal(pubContent.data.products[0].hasFile, true);

  assert.equal((await lead({ product: slug, name: '', email: 'bad' })).status, 422);
  assert.equal((await lead({ product: slug, name: 'Bot', email: 'b@example.com', company: 'x' })).status, 400);
  assert.equal((await lead({ product: slug, name: 'Lina', email: 'lina@example.com' }, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await lead({ product: 'nope', name: 'Lina', email: 'lina@example.com' })).status, 404);

  r = await lead({ product: slug, name: 'Lina', email: 'Lina@Example.com', consent: false, lang: 'ar', source: { utm_source: 'insta' } });
  assert.equal(r.status, 201);
  const b = await r.json();
  assert.match(b.url, /^\/api\/download\/[\w.-]+$/);
  const dl = await fetch(srv.base + b.url);
  assert.equal(dl.status, 200);
  assert.equal(dl.headers.get('content-type'), 'application/pdf');
  assert.ok(Buffer.from(await dl.arrayBuffer()).equals(PDF));
  // tampered link refused
  assert.equal((await fetch(srv.base + b.url.slice(0, -3) + 'abc')).status, 410);

  const list = await c.req('GET', '/api/admin/leads');
  assert.equal(list.data.total, 1);
  const l = list.data.items[0];
  assert.equal(l.email, 'lina@example.com');
  assert.equal(l.consent, false, 'no consent unless the box was ticked');
  assert.equal(l.downloads, 1);
  assert.equal(l.source.utm_source, 'insta');
  assert.equal((await client(srv.base).req('GET', '/api/admin/leads')).status, 401);
  const csv = await c.req('GET', '/api/admin/leads.csv');
  assert.match(csv.data, /lina@example\.com/);
  assert.equal((await c.req('DELETE', `/api/admin/leads/${l.id}`)).status, 200);
  assert.equal((await c.req('GET', '/api/admin/leads')).data.total, 0);
  assert.equal((await c.req('DELETE', `/api/admin/leads/${l.id}`)).status, 404);
});

test('expired download link is refused', async () => {
  const { createLeadService } = await import('../lib/leads.js');
  const svc = createLeadService(srv.store, srv.cfg, { info() {} });
  const { data } = await getContent();
  const r = await svc.request(data.products[0], { name: 'A', email: 'a@example.com', consent: false, lang: 'en', source: {} }, { ...data.leads, linkHours: 1 });
  const realNow = Date.now;
  Date.now = () => realNow() + 2 * 3600 * 1000;
  try {
    assert.equal((await fetch(srv.base + r.url)).status, 410);
  } finally {
    Date.now = realNow;
  }
});

test('booking: read-only appointments from Calendly, honest status', async () => {
  await save((d) => (d.booking.provider = 'calendly'));
  const st = await c.req('GET', '/api/admin/status');
  assert.equal(st.data.integrations.booking.connected, true);
  assert.equal(st.data.integrations.ai.connected, false);
  assert.equal(st.data.integrations.googleAds.connected, false);
  const r = await c.req('GET', '/api/admin/bookings');
  assert.equal(r.status, 200);
  assert.equal(r.data.items.length, 1);
  assert.equal(r.data.items[0].invitees[0].email, 'guest@example.com');
  assert.ok(calls.every((u) => u.startsWith('https://api.calendly.com/') || u.includes('.example/')));
  // without a token: not connected, no invented appointments
  const other = await startTestServer({ deps: { fetch: fakeFetch } });
  try {
    const o = client(other.base);
    await o.login();
    const oc = (await o.req('GET', '/api/admin/content')).data;
    const od = structuredClone(oc.data);
    od.booking.provider = 'calendly';
    assert.equal((await o.req('PUT', '/api/admin/content', { json: { data: od, version: oc.version } })).status, 200);
    const b = await o.req('GET', '/api/admin/bookings');
    assert.equal(b.data.connected, false);
    assert.deepEqual(b.data.items, []);
  } finally {
    await other.close();
  }
});

test('booking URL must be a Calendly / Cal.com address', async () => {
  const cur = await getContent();
  const data = structuredClone(cur.data);
  data.booking.provider = 'calendly';
  data.booking.url = 'https://evil.example/book';
  const r = await c.req('PUT', '/api/admin/content', { json: { data, version: cur.version } });
  assert.equal(r.status, 422);
  await save((d) => {
    d.booking.provider = 'calendly';
    d.booking.url = 'https://calendly.com/someone/intro';
  });
  await save((d) => {
    d.booking.provider = 'builtin';
    d.booking.url = '';
  });
});

test('SEO: sitemap with languages, robots, head tags, redirects, noindex switch', async () => {
  const sm = await (await fetch(srv.base + '/sitemap.xml')).text();
  assert.match(sm, /<urlset/);
  assert.match(sm, /hreflang="ar"/);
  const { data } = await getContent();
  assert.ok(sm.includes(`/work/${data.projects.find((p) => p.published).slug}`));
  const rb = await (await fetch(srv.base + '/robots.txt')).text();
  assert.match(rb, /Disallow: \/admin/);
  assert.match(rb, /Sitemap: http/);
  const home = await (await fetch(srv.base + '/')).text();
  assert.match(home, /rel="canonical"/);
  assert.match(home, /application\/ld\+json/);
  const prod = await fetch(srv.base + `/resources/${data.products[0].slug}`);
  assert.equal(prod.status, 200);
  assert.equal((await fetch(srv.base + '/resources/does-not-exist')).status, 404);

  await save((d) => {
    d.seo.redirects = [{ from: '/old-page', to: '/work' }];
    d.seo.indexing = false;
  });
  const red = await fetch(srv.base + '/old-page', { redirect: 'manual' });
  assert.equal(red.status, 301);
  assert.equal(red.headers.get('location'), '/work');
  assert.match(await (await fetch(srv.base + '/robots.txt')).text(), /Disallow: \/\n/);
  assert.match(await (await fetch(srv.base + '/')).text(), /noindex, nofollow/);
  const cur = await getContent();
  const bad = structuredClone(cur.data);
  bad.seo.redirects = [{ from: 'no-slash', to: 'javascript:alert(1)' }];
  assert.equal((await c.req('PUT', '/api/admin/content', { json: { data: bad, version: cur.version } })).status, 422);
  await save((d) => {
    d.seo.redirects = [];
    d.seo.indexing = true;
  });
});

test('SEO link checker reports broken links (mocked network)', async () => {
  await save((d) => {
    d.site.socials.linkedin = 'https://ok.example/';
    d.site.socials.instagram = 'https://broken.example/';
  });
  const r = await c.req('POST', '/api/admin/seo/check-links');
  assert.equal(r.status, 200);
  const by = Object.fromEntries(r.data.results.map((x) => [x.url, x]));
  assert.equal(by['https://ok.example/'].ok, true);
  assert.equal(by['https://broken.example/'].ok, false);
});

test('CRM: status, notes and source on messages; CSV export', async () => {
  const r = await fetch(srv.base + '/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Sami', email: 'sami@example.com', category: 'collab', message: 'Hello, a project idea for you.', source: { utm_campaign: 'spring' } }),
  });
  assert.equal(r.status, 201);
  const { id } = await r.json();
  const list = await c.req('GET', '/api/admin/messages');
  const m = list.data.items.find((x) => x.id === id);
  assert.equal(m.status, 'new');
  assert.equal(m.source.utm_campaign, 'spring');
  const u = await c.req('PATCH', `/api/admin/messages/${id}`, { json: { status: 'progress', notes: 'Call on Monday' } });
  assert.equal(u.data.item.status, 'progress');
  assert.equal(u.data.item.notes, 'Call on Monday');
  assert.equal((await c.req('PATCH', `/api/admin/messages/${id}`, { json: { status: 'hacked' } })).status, 422);
  const csv = await c.req('GET', '/api/admin/messages.csv');
  assert.match(csv.data, /Call on Monday/);
  // the booking card is not a message category: stored as a general message
  const gen = await fetch(srv.base + '/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Sami', email: 'sami@example.com', category: 'booking', message: 'Hello, a project idea for you.' }),
  });
  assert.equal(gen.status, 201);
  const gid = (await gen.json()).id;
  const g = (await c.req('GET', '/api/admin/messages')).data.items.find((x) => x.id === gid);
  assert.equal(g.category, '');
});

test('CSV export neutralises spreadsheet formulas', async () => {
  const { toCsv } = await import('../lib/leads.js');
  const out = toCsv([{ a: '=HYPERLINK("x")' }], [{ label: 'A', get: (r) => r.a }]);
  assert.match(out, /"'=HYPERLINK\(""x""\)"/);
});
