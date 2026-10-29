// Search engines: sitemap.xml (with the three languages), robots.txt, canonical and
// hreflang tags, structured data (JSON-LD), redirects and a link checker.
import { LANGS } from '../../shared/i18n/langs.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** The public address of the site: the one set in the dashboard, otherwise the request's. */
export function baseUrl(content, req, trustProxy) {
  const set = content.site && content.site.url;
  if (set && /^https?:\/\//.test(set)) return set.replace(/\/+$/, '');
  const proto = (trustProxy && String(req.headers['x-forwarded-proto'] || '').split(',')[0]) || (req.socket.encrypted ? 'https' : 'http');
  return `${proto}://${req.headers.host}`;
}

export const langUrl = (base, path, lang) => `${base}${path}${lang === 'en' ? '' : `${path.includes('?') ? '&' : '?'}lang=${lang}`}`;

/** Every public page of the site (the published ones). */
export function pages(pub) {
  return [
    { path: '/' },
    { path: '/work' },
    ...pub.projects.map((p) => ({ path: `/work/${p.slug}` })),
    ...pub.products.map((p) => ({ path: `/resources/${p.slug}` })),
  ];
}

export function sitemap(pub, base, updatedAt) {
  const lastmod = updatedAt ? new Date(updatedAt).toISOString().slice(0, 10) : '';
  const urls = pages(pub).map(({ path }) => {
    const alts = LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l.code}" href="${esc(langUrl(base, path, l.code))}"/>`).join('\n');
    return `  <url>\n    <loc>${esc(base + path)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n${alts}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(base + path)}"/>\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

export function robots(content, base) {
  const seo = content.seo || {};
  const lines = ['User-agent: *'];
  if (seo.indexing === false) lines.push('Disallow: /');
  else lines.push('Allow: /', 'Disallow: /admin', 'Disallow: /api/');
  if (seo.robotsExtra) lines.push('', ...String(seo.robotsExtra).split(/\r?\n/).map((l) => l.replace(/[^\x20-\x7E]/g, '').slice(0, 300)).filter(Boolean));
  lines.push('', `Sitemap: ${base}/sitemap.xml`);
  return `${lines.join('\n')}\n`;
}

/** Tags added to <head>: canonical, language alternates, robots, social image, JSON-LD. */
export function headTags({ content, loc, base, path, lang, project, product }) {
  const seo = content.seo || {};
  const tags = [`<link rel="canonical" href="${esc(langUrl(base, path, lang))}">`];
  for (const l of LANGS) tags.push(`<link rel="alternate" hreflang="${l.code}" href="${esc(langUrl(base, path, l.code))}">`);
  tags.push(`<link rel="alternate" hreflang="x-default" href="${esc(base + path)}">`);
  if (seo.indexing === false) tags.push('<meta name="robots" content="noindex, nofollow">');
  const img = (project && project.cover) || (product && product.image) || seo.ogImage || loc.site.portrait;
  if (img) tags.push(`<meta property="og:image" content="${esc(/^https?:/.test(img) ? img : base + img)}">`);
  tags.push(`<meta property="og:locale" content="${lang === 'ar' ? 'ar_TN' : lang === 'fr' ? 'fr_FR' : 'en_US'}">`);
  if (seo.structuredData !== false) {
    const person = {
      '@type': 'Person',
      name: loc.site.name,
      jobTitle: loc.site.role,
      url: base,
      ...(loc.site.portrait ? { image: /^https?:/.test(loc.site.portrait) ? loc.site.portrait : base + loc.site.portrait } : {}),
      sameAs: Object.values(loc.site.socials || {}).filter(Boolean),
    };
    let data = { '@context': 'https://schema.org', '@graph': [person, { '@type': 'WebSite', name: loc.site.name, url: base, inLanguage: lang }] };
    if (project) {
      data = {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: project.title,
        description: project.summary,
        url: base + path,
        inLanguage: lang,
        creator: person,
        ...(project.cover ? { image: /^https?:/.test(project.cover) ? project.cover : base + project.cover } : {}),
        ...(project.year ? { dateCreated: project.year } : {}),
        ...(project.tags && project.tags.length ? { keywords: project.tags.join(', ') } : {}),
      };
    } else if (product) {
      data = {
        '@context': 'https://schema.org',
        '@type': product.kind === 'free' ? 'DigitalDocument' : 'Product',
        name: product.t,
        description: product.d,
        url: base + path,
        inLanguage: lang,
        author: person,
        ...(product.image ? { image: /^https?:/.test(product.image) ? product.image : base + product.image } : {}),
        ...(product.kind === 'free' ? { isAccessibleForFree: true } : {}),
      };
    }
    tags.push(`<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`);
  }
  return tags.join('');
}

/** The redirect for a path, if one is set in the dashboard (exact match, trailing slash ignored). */
export function findRedirect(content, pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const r = ((content.seo && content.seo.redirects) || []).find((x) => (x.from.replace(/\/+$/, '') || '/') === clean);
  return r ? r.to : null;
}

/** Every link used in the content, with where it is used. */
export function collectLinks(content) {
  const out = [];
  const walk = (v, where) => {
    if (typeof v === 'string') {
      if (/^https?:\/\//.test(v) || (/^\/(?!\/)/.test(v) && !v.startsWith('/uploads/'))) out.push({ url: v, where });
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (k !== 'i18n' && k !== 'art') walk(x, where ? `${where}.${k}` : k);
  };
  walk(content, '');
  const seen = new Map();
  for (const l of out) {
    if (!seen.has(l.url)) seen.set(l.url, { url: l.url, where: [] });
    seen.get(l.url).where.push(l.where);
  }
  return [...seen.values()];
}

/** Checks links: internal paths against the real pages, external ones with a request. */
export async function checkLinks(links, { pub, fetchImpl = globalThis.fetch, max = 80, concurrency = 5 }) {
  const internal = new Set(pages(pub).map((p) => p.path));
  const list = links.slice(0, max);
  const results = [];
  let i = 0;
  async function worker() {
    while (i < list.length) {
      const l = list[i++];
      if (l.url.startsWith('/')) {
        const path = l.url.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
        const ok = internal.has(path) || /^\/(files|images|logos|fonts)\//.test(path);
        results.push({ ...l, ok, status: ok ? 200 : 404 });
        continue;
      }
      try {
        let res = await fetchImpl(l.url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(8000) });
        if (res.status === 405 || res.status === 403) res = await fetchImpl(l.url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(8000) });
        results.push({ ...l, ok: res.status < 400, status: res.status });
      } catch (e) {
        results.push({ ...l, ok: false, status: 0, error: e.name === 'TimeoutError' ? 'timeout' : 'unreachable' });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
  return { checked: results.length, total: links.length, results: results.sort((a, b) => Number(a.ok) - Number(b.ok)), checkedAt: new Date().toISOString() };
}
