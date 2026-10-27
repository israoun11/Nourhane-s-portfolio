import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../lib/config.js';
import { createFileStore } from '../lib/store-file.js';
import { createApp } from '../app.js';
import { hashPassword } from '../lib/auth.js';

export const EMAIL = 'owner@example.com';
export const PASSWORD = 'a long test passphrase';
export const quiet = process.env.TEST_LOG ? console : { info() {}, warn() {}, error() {} };

// 1×1 PNG
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

export async function startTestServer({ store: makeStore, env = {} } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nt-test-'));
  const dist = path.join(dir, 'dist');
  await fs.mkdir(path.join(dist, 'assets'), { recursive: true });
  await fs.writeFile(
    path.join(dist, 'index.html'),
    '<!doctype html><html><head><title>x</title><meta name="description" content="d" /><meta property="og:title" content="x" /><meta property="og:description" content="d" /></head><body><div id="root"></div></body></html>'
  );
  await fs.writeFile(path.join(dist, 'assets', 'app.js'), 'console.log(1)');
  const cfg = loadConfig({
    ADMIN_EMAIL: EMAIL,
    ADMIN_PASSWORD_HASH: await hashPassword(PASSWORD),
    DIST_DIR: dist,
    DATA_DIR: path.join(dir, 'data'),
    ...env,
  });
  const store = makeStore ? makeStore(cfg) : createFileStore(cfg.dataDir);
  const server = http.createServer(createApp(cfg, store, quiet));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base, cfg, store, dir,
    async close() {
      await new Promise((r) => server.close(r));
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
}

/** Minimal client that keeps the session cookie and sends the admin header. */
export function client(base) {
  let cookie = '';
  const req = async (method, p, { json, body, headers = {}, admin = true } = {}) => {
    const h = { ...headers };
    if (cookie) h.Cookie = cookie;
    if (admin) h['X-Requested-With'] = 'nt-admin';
    if (json !== undefined) h['Content-Type'] = 'application/json';
    const res = await fetch(base + p, { method, headers: h, body: json !== undefined ? JSON.stringify(json) : body, redirect: 'manual' });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('json') ? await res.json() : await res.text();
    return { status: res.status, data, headers: res.headers, setCookie: set };
  };
  return {
    req,
    get cookie() { return cookie; },
    set cookie(v) { cookie = v; },
    login: (email = EMAIL, password = PASSWORD) => req('POST', '/api/auth/login', { json: { email, password } }),
  };
}
