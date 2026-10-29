// Read-only reports (GA4, Search Console, Google Ads, Meta Ads) and the AI assistant,
// against imitation APIs. Checks request shapes, read-only endpoints and honest states.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { startTestServer, client } from './helpers.js';

const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const SA = JSON.stringify({ client_email: 'reports@example.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) });
const calls = [];
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
async function fake(url, opts = {}) {
  const u = String(url);
  calls.push({ u, method: opts.method || 'GET', body: opts.body ? String(opts.body) : '', headers: opts.headers || {} });
  if (u === 'https://oauth2.googleapis.com/token') return json({ access_token: 'tok', expires_in: 3600 });
  if (u.includes('analyticsdata.googleapis.com')) {
    const b = JSON.parse(opts.body);
    if (b.dimensions[0].name === 'date') return json({ rows: [{ dimensionValues: [{ value: '20300101' }], metricValues: [{ value: '10' }, { value: '8' }, { value: '1' }] }, { dimensionValues: [{ value: '20300102' }], metricValues: [{ value: '20' }, { value: '15' }, { value: '2' }] }] });
    return json({ rows: [{ dimensionValues: [{ value: 'Organic Search' }], metricValues: [{ value: '18' }, { value: '14' }, { value: '2' }] }, { dimensionValues: [{ value: 'Paid Social' }], metricValues: [{ value: '12' }, { value: '9' }, { value: '1' }] }] });
  }
  if (u.includes('searchAnalytics/query')) {
    const b = JSON.parse(opts.body);
    const k = b.dimensions[0];
    return json({ rows: [{ keys: [k === 'date' ? '2030-01-01' : k === 'query' ? 'brand strategist tunisia' : 'https://example.com/'], clicks: 5, impressions: 100, ctr: 0.05, position: 7.5 }] });
  }
  if (u.includes('googleads.googleapis.com')) {
    return json([{ results: [{ campaign: { id: '1', name: 'Search — brand', status: 'ENABLED' }, campaignBudget: { amountMicros: '20000000' }, metrics: { impressions: '1000', clicks: '50', ctr: 0.05, averageCpc: '400000', conversions: 5, conversionsValue: 300, costMicros: '20000000' } }] }]);
  }
  if (u.includes('graph.facebook.com')) {
    if (u.includes('access_token=bad')) return json({ error: { message: 'Invalid OAuth access token.' } }, 401);
    return json({ data: [{ campaign_id: '9', campaign_name: 'Leads — e-book', impressions: '5000', reach: '3000', clicks: '100', ctr: '2', cpc: '0.5', cpm: '10', spend: '50', actions: [{ action_type: 'lead', value: '10' }, { action_type: 'purchase', value: '2' }], action_values: [{ action_type: 'purchase', value: '150' }] }] });
  }
  if (u === 'https://api.anthropic.com/v1/messages') return json({ content: [{ type: 'text', text: 'Title: Nourhane Thabet\nDescription: Strategy.' }] });
  throw new TypeError('fetch failed');
}

const ENV = {
  GOOGLE_SERVICE_ACCOUNT_JSON: SA, GA4_PROPERTY_ID: '123', GSC_SITE_URL: 'https://example.com/',
  GOOGLE_ADS_DEVELOPER_TOKEN: 'dev', GOOGLE_ADS_CLIENT_ID: 'cid', GOOGLE_ADS_CLIENT_SECRET: 'sec', GOOGLE_ADS_REFRESH_TOKEN: 'ref', GOOGLE_ADS_CUSTOMER_ID: '123-456-7890',
  META_ACCESS_TOKEN: 'good', META_AD_ACCOUNT_ID: 'act_42', AI_PROVIDER: 'anthropic', AI_API_KEY: 'k', AI_MODEL: 'some-model',
};

test('without credentials: every report says “not connected” and lists what is needed (no numbers)', async () => {
  const srv = await startTestServer({ deps: { fetch: fake } });
  try {
    const c = client(srv.base);
    await c.login();
    for (const k of ['analytics', 'search', 'google-ads', 'meta-ads']) {
      const r = (await c.req('GET', `/api/admin/insights/${k}?days=28`)).data;
      assert.equal(r.connected, false, k);
      assert.ok(r.needs.length > 0);
      assert.equal(r.totals, undefined);
    }
    assert.equal((await c.req('POST', '/api/admin/ai', { json: { task: 'meta', input: 'x' } })).data.connected, false);
    const st = (await c.req('GET', '/api/admin/status')).data.integrations;
    assert.equal(st.analytics.connected, false);
    assert.equal(calls.length, 0, 'no external call without credentials');
    assert.equal((await client(srv.base).req('GET', '/api/admin/insights/analytics')).status, 401, 'admin only');
  } finally {
    await srv.close();
  }
});

test('with credentials: real figures are mapped; only read endpoints are called', async () => {
  const srv = await startTestServer({ env: ENV, deps: { fetch: fake } });
  try {
    const c = client(srv.base);
    await c.login();
    const ga = (await c.req('GET', '/api/admin/insights/analytics?days=7')).data;
    assert.equal(ga.totals.sessions, 30);
    assert.deepEqual(ga.organicVsPaid, { organic: 18, paid: 12 });
    assert.equal(ga.daily[0].date, '2030-01-01');
    assert.equal(ga.range.days, 7);
    const tokenCall = calls.find((x) => x.u === 'https://oauth2.googleapis.com/token' && x.body.includes('jwt-bearer'));
    assert.ok(tokenCall, 'service account JWT exchanged for a token');
    const jwt = new URLSearchParams(tokenCall.body).get('assertion').split('.');
    assert.match(Buffer.from(jwt[1], 'base64url').toString(), /analytics\.readonly/);
    const sc = (await c.req('GET', '/api/admin/insights/search')).data;
    assert.equal(sc.totals.clicks, 5);
    assert.equal(sc.queries[0].query, 'brand strategist tunisia');
    const g = (await c.req('GET', '/api/admin/insights/google-ads')).data;
    assert.equal(g.campaigns[0].spend, 20);
    assert.equal(g.campaigns[0].cpc, 0.4);
    assert.equal(g.totals.roas, 15);
    const adsCall = calls.find((x) => x.u.includes('googleads'));
    assert.match(adsCall.u, /customers\/1234567890\/googleAds:searchStream$/);
    assert.equal(adsCall.headers['developer-token'], 'dev');
    assert.match(JSON.parse(adsCall.body).query, /^SELECT /, 'a report query (GAQL SELECT), nothing that mutates');
    const m = (await c.req('GET', '/api/admin/insights/meta-ads')).data;
    assert.equal(m.campaigns[0].leads, 10);
    assert.equal(m.totals.roas, 3);
    assert.ok(calls.filter((x) => x.u.includes('graph.facebook.com')).every((x) => x.method === 'GET' && x.u.includes('/insights?')));
    const ai = (await c.req('POST', '/api/admin/ai', { json: { task: 'meta', input: 'Strategist in Tunisia' } })).data;
    assert.match(ai.draft, /^Title:/);
    assert.equal((await c.req('POST', '/api/admin/ai', { json: { task: 'hack', input: 'x' } })).data.error, 'Unknown task.');
    // secrets never in a response
    const st = JSON.stringify((await c.req('GET', '/api/admin/status')).data);
    for (const v of ['tok', 'sec', 'ref', 'good', 'PRIVATE KEY']) assert.ok(!st.includes(`"${v}"`) && !st.includes('PRIVATE KEY'));
  } finally {
    await srv.close();
  }
});

test('expired or refused token: a clear error, not zeros', async () => {
  const srv = await startTestServer({ env: { ...ENV, META_ACCESS_TOKEN: 'bad' }, deps: { fetch: fake } });
  try {
    const c = client(srv.base);
    await c.login();
    const m = (await c.req('GET', '/api/admin/insights/meta-ads')).data;
    assert.equal(m.errorCode, 'AUTH');
    assert.match(m.error, /Invalid OAuth/);
    assert.equal(m.totals, undefined);
  } finally {
    await srv.close();
  }
});

test('ad budget alerts are not part of the public content', async () => {
  const srv = await startTestServer();
  try {
    const pub = await (await fetch(srv.base + '/api/content')).json();
    assert.equal(pub.data.ads, undefined);
  } finally {
    await srv.close();
  }
});
