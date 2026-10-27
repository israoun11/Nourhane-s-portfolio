import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** Hash format: scrypt:N:r:p:<salt base64url>:<hash base64url>  (no $ or = so .env files never mangle it) */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(String(password).normalize('NFKC'), salt, 32, PARAMS);
  return `scrypt:${PARAMS.N}:${PARAMS.r}:${PARAMS.p}:${salt.toString('base64url')}:${key.toString('base64url')}`;
}

// Used when no valid hash is configured, so failures take the same time as real checks.
const DUMMY = 'scrypt:16384:8:1:AAAAAAAAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export async function verifyPassword(password, stored) {
  const parts = String(stored || DUMMY).trim().split(':');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, 'base64url');
  if (expected.length < 16) return false;
  try {
    const key = await scrypt(String(password).normalize('NFKC'), Buffer.from(saltB64, 'base64url'), expected.length, {
      N: Number(N), r: Number(r), p: Number(p), maxmem: PARAMS.maxmem,
    });
    return crypto.timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

export function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

export const newToken = () => crypto.randomBytes(32).toString('base64url');
export const tokenHash = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

/** Fixed-window counter used for login and upload limits (single-instance memory). */
export class RateLimiter {
  constructor({ max, windowMs }) {
    this.max = max;
    this.windowMs = windowMs;
    this.hits = new Map();
  }
  _entry(key) {
    const now = Date.now();
    let e = this.hits.get(key);
    if (!e || e.reset <= now) {
      e = { count: 0, reset: now + this.windowMs };
      this.hits.set(key, e);
    }
    if (this.hits.size > 5000) for (const [k, v] of this.hits) if (v.reset <= now) this.hits.delete(k);
    return e;
  }
  blocked(key) {
    const e = this._entry(key);
    return e.count >= this.max ? Math.ceil((e.reset - Date.now()) / 1000) : 0;
  }
  hit(key) {
    this._entry(key).count += 1;
  }
  reset(key) {
    this.hits.delete(key);
  }
}
