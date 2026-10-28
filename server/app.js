import fs from 'node:fs/promises';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { publicView } from '../shared/schema.js';
import { HttpError, clientIp, cookie, parseCookies, readBody, readJson, securityHeaders, sendJson } from './lib/http.js';
import { RateLimiter, newToken, safeEqual, tokenHash, verifyPassword } from './lib/auth.js';
import { createContentService } from './lib/content.js';
import { createMessageService, validateMessage } from './lib/messages.js';
import { localize } from '../shared/i18n/localize.js';
import { dirOf, isLang } from '../shared/i18n/langs.js';

const SESSION_COOKIE = 'nt_session';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf', '.map': 'application/json', '.mp3': 'audio/mpeg',
};
const UPLOAD_NAME = /^[a-f0-9]{64}\.(jpg|png|webp)$/;
const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createApp(cfg, store, log = console) {
  const content = createContentService(store, log);
  const loginIp = new RateLimiter({ max: 5, windowMs: 15 * 60 * 1000 });
  const loginGlobal = new RateLimiter({ max: 30, windowMs: 15 * 60 * 1000 });
  const uploads = new RateLimiter({ max: 60, windowMs: 60 * 60 * 1000 });
  const contactIp = new RateLimiter({ max: 5, windowMs: 10 * 60 * 1000 });
  const contactGlobal = new RateLimiter({ max: 100, windowMs: 60 * 60 * 1000 });
  const messages = createMessageService(store);
  const sec = securityHeaders({ production: cfg.production });

  // ── auth helpers ──
  async function session(req) {
    const token = parseCookies(req)[SESSION_COOKIE];
    if (!token || token.length > 100) return null;
    const idHash = tokenHash(token);
    const expiresAt = await store.getSession(idHash);
    if (!expiresAt || expiresAt <= Date.now()) {
      if (expiresAt) await store.deleteSession(idHash).catch(() => {});
      return null;
    }
    return { idHash, expiresAt };
  }
  async function requireAdmin(req) {
    const s = await session(req);
    if (!s) throw new HttpError(401, 'Your session has expired. Please log in again.', { code: 'SESSION' });
    return s;
  }
  // Cookies are SameSite=Strict; on top of that every state-changing call must carry a custom
  // header (impossible cross-site without CORS) and, when present, a same-site Origin.
  function checkCsrf(req) {
    if (req.headers['x-requested-with'] !== 'nt-admin') throw new HttpError(403, 'Request blocked.');
    const origin = req.headers.origin;
    if (origin) {
      let host = '';
      try {
        host = new URL(origin).host;
      } catch {
        /* invalid */
      }
      if (host !== req.headers.host && !cfg.allowedOrigins.includes(origin)) throw new HttpError(403, 'Request blocked.');
    }
  }
  const clearCookie = () => cookie(SESSION_COOKIE, '', { maxAge: 0, secure: cfg.cookieSecure });

  // ── API ──
  async function api(req, res, url) {
    const { pathname } = url;
    const m = req.method;

    if (pathname === '/api/health' && m === 'GET') return sendJson(res, 200, { ok: true });

    if (pathname === '/api/content' && m === 'GET') {
      const c = await content.get();
      const etag = `W/"v${c.version}"`;
      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, { ETag: etag, 'Cache-Control': 'no-cache' });
        return res.end();
      }
      return sendJson(res, 200, { data: publicView(c.data), version: c.version, updatedAt: c.updatedAt }, { ETag: etag, 'Cache-Control': 'no-cache' });
    }

    // Contact form: public, but only from this website (JSON + same Origin), rate-limited,
    // and validated again here. Answers 201 only once the message is stored.
    if (pathname === '/api/contact' && m === 'POST') {
      const origin = req.headers.origin;
      if (origin) {
        let host = '';
        try {
          host = new URL(origin).host;
        } catch {
          /* invalid */
        }
        if (host !== req.headers.host && !cfg.allowedOrigins.includes(origin)) throw new HttpError(403, 'Request blocked.', { code: 'BLOCKED' });
      }
      const ip = clientIp(req, cfg.trustProxy);
      const wait = contactIp.blocked(ip) || contactGlobal.blocked('all');
      if (wait) throw new HttpError(429, 'Too many messages. Please try again later.', { code: 'RATE', retryAfter: wait });
      const body = await readJson(req, 32 * 1024);
      if (body.company) throw new HttpError(400, 'Your message could not be sent.', { code: 'REJECTED' }); // honeypot
      const check = validateMessage(body);
      if (!check.ok) throw new HttpError(422, 'Some fields need attention.', { code: 'INVALID', fields: check.fields });
      contactIp.hit(ip);
      contactGlobal.hit('all');
      const c = await content.get();
      const path = c.data.contactPaths.find((p) => p.id === check.value.category);
      const saved = await messages.add(check.value, path ? path.title : '');
      return sendJson(res, 201, { ok: true, id: saved.id, receivedAt: saved.createdAt });
    }

    if (pathname === '/api/auth/login' && m === 'POST') {
      checkCsrf(req);
      if (!cfg.adminConfigured) throw new HttpError(503, 'The admin account is not configured yet. Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH (see README).');
      const ip = clientIp(req, cfg.trustProxy);
      const wait = loginIp.blocked(ip) || loginGlobal.blocked('all');
      if (wait) throw new HttpError(429, `Too many login attempts. Please wait ${Math.ceil(wait / 60)} minute(s) and try again.`, { retryAfter: wait });
      const body = await readJson(req, 10 * 1024);
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 200) : '';
      const password = typeof body.password === 'string' ? body.password.slice(0, 200) : '';
      const passOk = await verifyPassword(password, cfg.admin.passwordHash); // always runs: constant work
      const emailOk = safeEqual(email, cfg.admin.email);
      if (!passOk || !emailOk) {
        loginIp.hit(ip);
        loginGlobal.hit('all');
        await sleep(400);
        throw new HttpError(401, 'Incorrect email or password.');
      }
      loginIp.reset(ip);
      const token = newToken();
      const expiresAt = Date.now() + cfg.sessionHours * 3600 * 1000;
      await store.createSession(tokenHash(token), expiresAt);
      return sendJson(res, 200, { ok: true, email: cfg.admin.email, expiresAt }, {
        'Set-Cookie': cookie(SESSION_COOKIE, token, { maxAge: cfg.sessionHours * 3600, secure: cfg.cookieSecure }),
      });
    }

    if (pathname === '/api/auth/logout' && m === 'POST') {
      checkCsrf(req);
      const s = await session(req);
      if (s) await store.deleteSession(s.idHash);
      return sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearCookie() });
    }

    if (pathname === '/api/auth/session' && m === 'GET') {
      const s = await session(req);
      return sendJson(res, 200, s ? { authenticated: true, email: cfg.admin.email, expiresAt: s.expiresAt } : { authenticated: false, adminConfigured: cfg.adminConfigured });
    }

    if (pathname.startsWith('/api/admin/')) {
      if (m !== 'GET') checkCsrf(req);
      const s = await requireAdmin(req);

      if (pathname === '/api/admin/content' && m === 'GET') return sendJson(res, 200, await content.get());

      if (pathname === '/api/admin/content' && m === 'PUT') {
        const body = await readJson(req, 2 * 1024 * 1024);
        return sendJson(res, 200, await content.save(body.data, body.version));
      }

      if (pathname === '/api/admin/upload' && m === 'POST') {
        const key = s.idHash;
        if (uploads.blocked(key)) throw new HttpError(429, 'Upload limit reached. Please try again in an hour.');
        const type = String(req.headers['content-type'] || '');
        if (!/^image\/(jpeg|png|webp)$/.test(type)) throw new HttpError(415, 'Only JPEG, PNG and WebP images can be uploaded.');
        const buf = await readBody(req, cfg.maxUploadBytes);
        if (!buf.length) throw new HttpError(400, 'The file is empty.');
        uploads.hit(key);
        return sendJson(res, 200, await content.upload(buf));
      }

      if (pathname === '/api/admin/history' && m === 'GET') return sendJson(res, 200, { items: await content.history() });

      if (pathname === '/api/admin/restore' && m === 'POST') {
        const body = await readJson(req, 10 * 1024);
        return sendJson(res, 200, await content.restore(Number(body.version), Number(body.currentVersion)));
      }

      // ── inbox ──
      if (pathname === '/api/admin/messages' && m === 'GET') return sendJson(res, 200, await messages.list());
      const mm = pathname.match(/^\/api\/admin\/messages\/([^/]+)$/);
      if (mm && m === 'PATCH') {
        const body = await readJson(req, 4 * 1024);
        return sendJson(res, 200, { item: await messages.setRead(mm[1], body.read) });
      }
      if (mm && m === 'DELETE') {
        await messages.remove(mm[1]);
        return sendJson(res, 200, { ok: true });
      }

      if (pathname === '/api/admin/status' && m === 'GET') {
        const c = await content.get();
        return sendJson(res, 200, {
          storage: store.name,
          persistent: store.persistent || cfg.allowFileInProduction,
          production: cfg.production,
          version: c.version,
          updatedAt: c.updatedAt,
          media: await content.mediaCount(),
          maxUploadMb: Math.round(cfg.maxUploadBytes / 1024 / 1024),
          unreadMessages: await messages.unread(),
          sessionExpiresAt: s.expiresAt,
        });
      }
    }
    throw new HttpError(404, 'Not found.');
  }

  // ── static files & pages ──
  async function serveFile(res, file, { cache, status = 200 } = {}) {
    const ext = path.extname(file).toLowerCase();
    const st = await fs.stat(file);
    res.writeHead(status, {
      ...sec,
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': cache,
    });
    createReadStream(file).pipe(res);
  }

  async function page(req, res, pathname, url) {
    let html;
    try {
      html = await fs.readFile(path.join(cfg.distDir, 'index.html'), 'utf8');
    } catch {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('The website has not been built yet. Run "npm run build" (production) or use "npm run dev" (development).');
    }
    const clean = pathname.replace(/\/+$/, '') || '/';
    const isAdmin = clean === '/admin' || clean.startsWith('/admin/');
    const headers = { ...sec, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' };
    let status = 200;

    if (isAdmin) {
      headers['X-Robots-Tag'] = 'noindex, nofollow';
      headers['Cache-Control'] = 'no-store';
    } else {
      const c = await content.get();
      const pub = publicView(c.data);
      // The visitor's language (chosen with the language switcher, remembered in a cookie)
      // sets <html lang/dir> and the page title right away, so Arabic never flashes left-to-right.
      const cookieLang = parseCookies(req).nt_lang;
      const lang = isLang(url.searchParams.get('lang')) ? url.searchParams.get('lang') : isLang(cookieLang) ? cookieLang : 'en';
      const loc = localize(pub, lang);
      let title = loc.site.seoTitle || `${loc.site.name} — ${loc.site.role}`;
      let desc = loc.site.seoDescription || '';
      const mm = clean.match(/^\/work\/([^/]+)$/);
      if (mm) {
        const p = loc.projects.find((x) => x.slug === decodeURIComponent(mm[1]));
        if (p) {
          title = `${p.title} — ${loc.site.name}`;
          desc = p.summary;
        } else status = 404;
      } else if (clean === '/work') title = `Portfolio — ${loc.site.name}`;
      else if (clean !== '/') status = 404;
      html = html.replace(/<html[^>]*>/, `<html lang="${lang}" dir="${dirOf(lang)}">`);
      const json = JSON.stringify({ data: pub, version: c.version })
        .replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
      html = html
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${escHtml(title)}</title>`)
        .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escHtml(desc)}$2`)
        .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escHtml(title)}$2`)
        .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escHtml(desc)}$2`)
        .replace('</head>', `<script id="nt-content" type="application/json">${json}</script></head>`);
    }
    res.writeHead(status, headers);
    res.end(html);
  }

  async function staticOrPage(req, res, url) {
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      throw new HttpError(400, 'Bad request.');
    }
    if (pathname.includes('\0')) throw new HttpError(400, 'Bad request.');

    if (pathname.startsWith('/uploads/') && store.uploadsDir) {
      const name = pathname.slice('/uploads/'.length);
      if (!UPLOAD_NAME.test(name)) throw new HttpError(404, 'Not found.');
      try {
        return await serveFile(res, path.join(store.uploadsDir, name), { cache: 'public, max-age=31536000, immutable' });
      } catch {
        throw new HttpError(404, 'Not found.');
      }
    }

    if (pathname !== '/' && pathname !== '/index.html') {
      const file = path.normalize(path.join(cfg.distDir, pathname));
      if (file.startsWith(cfg.distDir + path.sep)) {
        try {
          const st = await fs.stat(file);
          if (st.isFile()) {
            const cache = pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';
            return await serveFile(res, file, { cache });
          }
        } catch {
          /* not a file → page */
        }
      }
      if (path.extname(pathname) && !pathname.startsWith('/work/')) throw new HttpError(404, 'Not found.');
    }
    return page(req, res, pathname, url);
  }

  // ── entry point ──
  return async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed.');
      return await staticOrPage(req, res, url);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) log.error?.(`[${req.method} ${url.pathname}] ${e.message}${e.detail ? ` — ${e.detail}` : ''}`);
      const message = status === 500 ? 'Something went wrong on the server. Your saved content is unchanged.' : e.message;
      const headers = {};
      if (status === 401 && e.extra && e.extra.code === 'SESSION') headers['Set-Cookie'] = clearCookie();
      if (e.extra && e.extra.retryAfter) headers['Retry-After'] = String(e.extra.retryAfter);
      if (res.headersSent) return res.end();
      return sendJson(res, status, { error: message, ...(e.extra || {}), retryAfter: undefined }, headers);
    }
  };
}
