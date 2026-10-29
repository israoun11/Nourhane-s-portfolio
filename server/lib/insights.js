// Read-only reporting from Google Analytics 4, Google Search Console, Google Ads and Meta Ads,
// plus an optional AI assistant. Every call is made by this server with credentials from the
// environment (never sent to the browser). Nothing here can change a campaign, a budget or
// an account: only report endpoints are called.
import crypto from 'node:crypto';

const TIMEOUT = 20000;
const DAY = 24 * 3600 * 1000;
const iso = (d) => new Date(d).toISOString().slice(0, 10);

export class IntegrationError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code; // AUTH | PERMISSION | RATE | HTTP | UNREACHABLE | CONFIG
    this.status = status;
  }
}

async function call(fetchImpl, url, opts = {}) {
  let res;
  try {
    res = await fetchImpl(url, { ...opts, signal: AbortSignal.timeout(TIMEOUT) });
  } catch (e) {
    throw new IntegrationError('UNREACHABLE', `The service could not be reached (${e.name}).`);
  }
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const msg = (body && ((body.error && (body.error.message || body.error.error_user_msg)) || body.message)) || `HTTP ${res.status}`;
    const code = res.status === 401 ? 'AUTH' : res.status === 403 ? 'PERMISSION' : res.status === 429 ? 'RATE' : 'HTTP';
    throw new IntegrationError(code, String(msg).slice(0, 300), res.status);
  }
  return body;
}

/** Date range of the last N days (yesterday included, today excluded: today is incomplete). */
export function rangeOf(days, now = Date.now()) {
  const n = [7, 28, 90].includes(Number(days)) ? Number(days) : 28;
  return { days: n, start: iso(now - n * DAY), end: iso(now - DAY) };
}

// ── Google service account (GA4 + Search Console) ──
function serviceAccount(cfg) {
  const raw = cfg.googleServiceAccount;
  if (!raw) return null;
  try {
    const txt = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const j = JSON.parse(txt);
    return j.client_email && j.private_key ? j : null;
  } catch {
    return null;
  }
}

function createGoogleAuth(cfg, fetchImpl) {
  const cache = new Map(); // scope → { token, exp }
  return async function token(scope) {
    const hit = cache.get(scope);
    if (hit && hit.exp > Date.now() + 60000) return hit.token;
    const sa = serviceAccount(cfg);
    if (!sa) throw new IntegrationError('CONFIG', 'GOOGLE_SERVICE_ACCOUNT_JSON is missing or invalid.');
    const now = Math.floor(Date.now() / 1000);
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
    let sig;
    try {
      sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
    } catch {
      throw new IntegrationError('CONFIG', 'The private key of the Google service account could not be read.');
    }
    const body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` });
    const r = await call(fetchImpl, 'https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    cache.set(scope, { token: r.access_token, exp: Date.now() + (r.expires_in || 3600) * 1000 });
    return r.access_token;
  };
}

export function createInsights(cfg, fetchImpl = globalThis.fetch) {
  const googleToken = createGoogleAuth(cfg, fetchImpl);
  let adsToken = null;

  const status = () => ({
    analytics: { connected: !!(serviceAccount(cfg) && cfg.ga4PropertyId), needs: ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GA4_PROPERTY_ID'] },
    searchConsole: { connected: !!(serviceAccount(cfg) && cfg.gscSiteUrl), needs: ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GSC_SITE_URL'] },
    googleAds: {
      connected: !!(cfg.googleAds.developerToken && cfg.googleAds.clientId && cfg.googleAds.clientSecret && cfg.googleAds.refreshToken && cfg.googleAds.customerId),
      needs: ['GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_REFRESH_TOKEN', 'GOOGLE_ADS_CUSTOMER_ID'],
    },
    metaAds: { connected: !!(cfg.meta.accessToken && cfg.meta.adAccountId), needs: ['META_ACCESS_TOKEN', 'META_AD_ACCOUNT_ID'] },
    ai: { connected: !!(cfg.ai.provider && cfg.ai.apiKey && cfg.ai.model), needs: ['AI_PROVIDER', 'AI_API_KEY', 'AI_MODEL'] },
  });

  /** Runs a report, or answers { connected:false } / { error } — never invented numbers. */
  async function guard(key, fn) {
    const s = status()[key];
    if (!s.connected) return { connected: false, needs: s.needs };
    try {
      return { connected: true, ...(await fn()), fetchedAt: new Date().toISOString() };
    } catch (e) {
      return { connected: true, error: e.message, errorCode: e.code || 'ERROR' };
    }
  }

  // ── GA4 ──
  async function analytics(days) {
    return guard('analytics', async () => {
      const r = rangeOf(days);
      const tok = await googleToken('https://www.googleapis.com/auth/analytics.readonly');
      const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(cfg.ga4PropertyId)}:runReport`;
      const run = (body) => call(fetchImpl, url, { method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ dateRanges: [{ startDate: r.start, endDate: r.end }], ...body }) });
      const metrics = [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'keyEvents' }];
      const [byDay, byChannel] = await Promise.all([
        run({ dimensions: [{ name: 'date' }], metrics, orderBys: [{ dimension: { dimensionName: 'date' } }] }),
        run({ dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics }),
      ]);
      const rows = (rep) => (rep && rep.rows) || [];
      const num = (row, i) => Number(row.metricValues[i].value) || 0;
      const daily = rows(byDay).map((x) => ({ date: x.dimensionValues[0].value.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'), sessions: num(x, 0), users: num(x, 1), conversions: num(x, 2) }));
      const channels = rows(byChannel).map((x) => ({ channel: x.dimensionValues[0].value, sessions: num(x, 0), users: num(x, 1), conversions: num(x, 2) }));
      const sum = (k) => daily.reduce((n, d) => n + d[k], 0);
      const bucket = (re) => channels.filter((c) => re.test(c.channel)).reduce((n, c) => n + c.sessions, 0);
      return {
        range: r,
        totals: { sessions: sum('sessions'), users: sum('users'), conversions: sum('conversions') },
        organicVsPaid: { organic: bucket(/^Organic/i), paid: bucket(/^Paid|Cross-network|Display/i) },
        daily,
        channels,
      };
    });
  }

  // ── Search Console ──
  async function search(days) {
    return guard('searchConsole', async () => {
      const r = rangeOf(days);
      const tok = await googleToken('https://www.googleapis.com/auth/webmasters.readonly');
      const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(cfg.gscSiteUrl)}/searchAnalytics/query`;
      const q = (dims, rowLimit) => call(fetchImpl, url, { method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate: r.start, endDate: r.end, dimensions: dims, rowLimit }) });
      const [byDay, queries, pages] = await Promise.all([q(['date'], 500), q(['query'], 20), q(['page'], 20)]);
      const map = (rep, key) => ((rep && rep.rows) || []).map((x) => ({ [key]: x.keys[0], clicks: x.clicks, impressions: x.impressions, ctr: x.ctr, position: x.position }));
      const daily = map(byDay, 'date');
      const clicks = daily.reduce((n, d) => n + d.clicks, 0);
      const impressions = daily.reduce((n, d) => n + d.impressions, 0);
      const position = impressions ? daily.reduce((n, d) => n + d.position * d.impressions, 0) / impressions : 0;
      return { range: r, totals: { clicks, impressions, ctr: impressions ? clicks / impressions : 0, position }, daily, queries: map(queries, 'query'), pages: map(pages, 'page') };
    });
  }

  // ── Google Ads (read-only: googleAds:searchStream) ──
  async function googleAds(days) {
    return guard('googleAds', async () => {
      const r = rangeOf(days);
      const g = cfg.googleAds;
      if (!adsToken || adsToken.exp < Date.now() + 60000) {
        const t = await call(fetchImpl, 'https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ grant_type: 'refresh_token', client_id: g.clientId, client_secret: g.clientSecret, refresh_token: g.refreshToken }),
        });
        adsToken = { token: t.access_token, exp: Date.now() + (t.expires_in || 3600) * 1000 };
      }
      const cid = String(g.customerId).replace(/\D/g, '');
      const headers = { Authorization: `Bearer ${adsToken.token}`, 'developer-token': g.developerToken, 'Content-Type': 'application/json' };
      if (g.loginCustomerId) headers['login-customer-id'] = String(g.loginCustomerId).replace(/\D/g, '');
      const query = `SELECT campaign.id, campaign.name, campaign.status, campaign_budget.amount_micros, metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.conversions, metrics.conversions_value, metrics.cost_micros FROM campaign WHERE segments.date BETWEEN '${r.start}' AND '${r.end}'`;
      const chunks = await call(fetchImpl, `https://googleads.googleapis.com/${g.apiVersion}/customers/${cid}/googleAds:searchStream`, { method: 'POST', headers, body: JSON.stringify({ query }) });
      const rows = (Array.isArray(chunks) ? chunks : [chunks]).flatMap((c) => (c && c.results) || []);
      const campaigns = rows.map((x) => {
        const m = x.metrics || {};
        const spend = Number(m.costMicros || 0) / 1e6;
        const value = Number(m.conversionsValue || 0);
        const conv = Number(m.conversions || 0);
        return {
          id: x.campaign.id, name: x.campaign.name, status: x.campaign.status,
          budget: Number((x.campaignBudget && x.campaignBudget.amountMicros) || 0) / 1e6,
          impressions: Number(m.impressions || 0), clicks: Number(m.clicks || 0), ctr: Number(m.ctr || 0), cpc: Number(m.averageCpc || 0) / 1e6,
          conversions: conv, spend, value, cpa: conv ? spend / conv : null, roas: spend ? value / spend : null,
        };
      });
      return { range: r, campaigns, totals: totalsOf(campaigns) };
    });
  }

  // ── Meta Ads (read-only: /insights) ──
  async function metaAds(days) {
    return guard('metaAds', async () => {
      const r = rangeOf(days);
      const m = cfg.meta;
      const act = String(m.adAccountId).replace(/^act_/, '');
      const q = new URLSearchParams({
        level: 'campaign',
        fields: 'campaign_id,campaign_name,impressions,reach,clicks,ctr,cpc,cpm,spend,actions,action_values',
        time_range: JSON.stringify({ since: r.start, until: r.end }),
        limit: '100',
        access_token: m.accessToken,
      });
      const res = await call(fetchImpl, `https://graph.facebook.com/${m.apiVersion}/act_${encodeURIComponent(act)}/insights?${q}`);
      const pick = (list, re) => ((list || []).filter((a) => re.test(a.action_type)).reduce((n, a) => n + Number(a.value || 0), 0));
      const campaigns = ((res && res.data) || []).map((x) => {
        const spend = Number(x.spend || 0);
        const value = pick(x.action_values, /purchase/);
        const leads = pick(x.actions, /^lead$|offsite_conversion\.fb_pixel_lead|onsite_conversion\.lead/);
        const purchases = pick(x.actions, /^purchase$|offsite_conversion\.fb_pixel_purchase/);
        return {
          id: x.campaign_id, name: x.campaign_name,
          impressions: Number(x.impressions || 0), reach: Number(x.reach || 0), clicks: Number(x.clicks || 0),
          ctr: Number(x.ctr || 0) / 100, cpc: Number(x.cpc || 0), cpm: Number(x.cpm || 0),
          leads, conversions: purchases, purchases, spend, value, cpa: purchases ? spend / purchases : null, roas: spend && value ? value / spend : null,
        };
      });
      return { range: r, campaigns, totals: totalsOf(campaigns) };
    });
  }

  // ── AI assistant (drafts only; never published automatically) ──
  async function ai(task, input) {
    const s = status().ai;
    if (!s.connected) return { connected: false, needs: s.needs };
    const prompts = {
      meta: 'You write SEO metadata. Reply with exactly two lines: "Title: …" (max 60 characters) and "Description: …" (max 155 characters). Use only facts from the text. Language: the same as the text.',
      keywords: 'You are an SEO assistant. From the text, suggest 10 search keywords or phrases people might use, one per line, without numbering. Do not invent facts.',
      ideas: 'You are a content strategist. Suggest 8 content topics for this personal brand, one per line, with a short angle each. Base them only on the text.',
      report: 'You write a short monthly marketing report draft from the JSON data provided (real figures from connected tools). Summarise trends, best and weakest campaigns, and 3 concrete recommendations. Never invent numbers; if data is missing, say so.',
      conversion: 'You review a landing section for conversion. Give 5 concrete, prioritised recommendations based only on the text.',
    };
    if (!prompts[task]) return { connected: true, error: 'Unknown task.', errorCode: 'INVALID' };
    const text = String(input || '').slice(0, 12000);
    try {
      let out = '';
      if (cfg.ai.provider === 'anthropic') {
        const r = await call(fetchImpl, 'https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': cfg.ai.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: cfg.ai.model, max_tokens: 1200, system: prompts[task], messages: [{ role: 'user', content: text }] }),
        });
        out = ((r && r.content) || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
      } else if (cfg.ai.provider === 'openai') {
        const r = await call(fetchImpl, 'https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${cfg.ai.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: cfg.ai.model, messages: [{ role: 'system', content: prompts[task] }, { role: 'user', content: text }] }),
        });
        out = (r && r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content) || '';
      } else {
        return { connected: false, needs: s.needs, error: 'AI_PROVIDER must be "anthropic" or "openai".' };
      }
      return { connected: true, draft: out.trim() };
    } catch (e) {
      return { connected: true, error: e.message, errorCode: e.code || 'ERROR' };
    }
  }

  return { status, analytics, search, googleAds, metaAds, ai };
}

function totalsOf(list) {
  const s = (k) => list.reduce((n, c) => n + (Number(c[k]) || 0), 0);
  const spend = s('spend');
  const clicks = s('clicks');
  const impressions = s('impressions');
  const conversions = s('conversions');
  const value = s('value');
  return {
    impressions, clicks, spend, conversions, value,
    ctr: impressions ? clicks / impressions : 0,
    cpc: clicks ? spend / clicks : 0,
    cpa: conversions ? spend / conversions : null,
    roas: spend && value ? value / spend : null,
    leads: s('leads'),
  };
}
