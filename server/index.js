// Website + admin server. Start with:  npm start   (production)  or  npm run dev  (development)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './lib/config.js';
import { createFileStore } from './lib/store-file.js';
import { createSupabaseStore } from './lib/store-supabase.js';
import { createApp } from './app.js';

const envFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');
if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(envFile);

const cfg = loadConfig();
if (cfg.problems.length) {
  console.error('\n✖ Configuration problem:\n  - ' + cfg.problems.join('\n  - ') + '\n');
  process.exit(1);
}

const store = cfg.driver === 'supabase' ? createSupabaseStore(cfg.supabase) : createFileStore(cfg.dataDir);
const server = http.createServer(createApp(cfg, store));
server.requestTimeout = 60_000;
server.headersTimeout = 20_000;

server.listen(cfg.port, cfg.host, () => {
  console.log(`\n✓ Server running on http://localhost:${cfg.port}`);
  console.log(`  Storage: ${store.name}${store.name === 'file' ? ` (${path.relative(cfg.root, cfg.dataDir)})` : ''}`);
  console.log(`  Admin:   ${cfg.adminConfigured ? 'configured' : 'NOT configured — run "npm run admin:password" and set ADMIN_EMAIL / ADMIN_PASSWORD_HASH'}`);
  if (cfg.production && !cfg.cookieSecure) console.warn('  ! COOKIE_SECURE is off in production — only do this if you serve over plain HTTP on purpose.');
});

const stop = () => server.close(() => process.exit(0));
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
