// Where a visitor came from (UTM parameters, referring site, first page) — kept for this
// visit only (sessionStorage) and sent with the contact and download forms.
const KEY = 'nt_src';
const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

export function captureSource() {
  try {
    if (sessionStorage.getItem(KEY)) return;
    const q = new URLSearchParams(window.location.search);
    const src = {};
    for (const k of UTM) if (q.get(k)) src[k] = q.get(k).slice(0, 200);
    if (document.referrer) {
      const r = new URL(document.referrer);
      if (r.host !== window.location.host) src.referrer = r.host;
    }
    src.landing = window.location.pathname.slice(0, 200);
    sessionStorage.setItem(KEY, JSON.stringify(src));
  } catch {
    /* storage blocked: nothing is recorded */
  }
}

export function getSource() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}
