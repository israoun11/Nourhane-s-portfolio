// Small HTTP helpers (no framework).

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function sendJson(res, status, body, headers = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(data);
}

/** Reads the request body up to `limit` bytes; rejects anything larger. */
export function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length']);
    if (declared && declared > limit) {
      reject(new HttpError(413, `The file is too large (maximum ${Math.round(limit / 1024 / 1024)} MB).`));
      req.resume();
      return;
    }
    const chunks = [];
    let size = 0;
    let done = false;
    req.on('data', (c) => {
      if (done) return;
      size += c.length;
      if (size > limit) {
        done = true;
        reject(new HttpError(413, `The file is too large (maximum ${Math.round(limit / 1024 / 1024)} MB).`));
        req.resume();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => !done && resolve(Buffer.concat(chunks)));
    req.on('error', (e) => !done && reject(e));
  });
}

export async function readJson(req, limit = 2 * 1024 * 1024) {
  const type = String(req.headers['content-type'] || '');
  if (!type.startsWith('application/json')) throw new HttpError(415, 'Expected JSON.');
  const buf = await readBody(req, limit);
  try {
    return JSON.parse(buf.toString('utf8') || '{}');
  } catch {
    throw new HttpError(400, 'Invalid JSON.');
  }
}

export function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || '')
    .split(';')
    .forEach((part) => {
      const i = part.indexOf('=');
      if (i > 0) {
        const k = part.slice(0, i).trim();
        try {
          out[k] = decodeURIComponent(part.slice(i + 1).trim());
        } catch {
          /* ignore malformed cookie */
        }
      }
    });
  return out;
}

export function cookie(name, value, { maxAge, secure, path = '/' } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, 'HttpOnly', 'SameSite=Strict'];
  if (secure) parts.push('Secure');
  if (maxAge !== undefined) parts.push(`Max-Age=${Math.floor(maxAge)}`);
  return parts.join('; ');
}

export function clientIp(req, trustProxy) {
  if (trustProxy) {
    const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (fwd) return fwd;
  }
  return req.socket.remoteAddress || 'unknown';
}

export function securityHeaders({ production, formEndpoint, extraImg = [] }) {
  let formOrigin = '';
  try {
    if (formEndpoint) formOrigin = new URL(formEndpoint).origin;
  } catch {
    /* ignore invalid endpoint */
  }
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    ["img-src 'self' data: blob: https:", ...extraImg].join(' '),
    "media-src 'self' https:",
    ['connect-src', "'self'", formOrigin].filter(Boolean).join(' '),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
  const h = {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
  };
  if (production) h['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  return h;
}
