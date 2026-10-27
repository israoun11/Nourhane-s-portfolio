import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const bool = (v, d = false) => (v === undefined || v === '' ? d : /^(1|true|yes)$/i.test(v));

/** Reads configuration from environment variables (see .env.example). */
export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const hasSupabase = !!(env.SUPABASE_URL && env.SUPABASE_SECRET_KEY);
  const driver = (env.STORAGE_DRIVER || (hasSupabase ? 'supabase' : 'file')).toLowerCase();

  const cfg = {
    root: ROOT,
    production,
    port: Number(env.PORT) || 8787,
    host: env.HOST || '0.0.0.0',
    distDir: path.resolve(ROOT, env.DIST_DIR || 'dist'),
    dataDir: path.resolve(ROOT, env.DATA_DIR || 'server/data'),
    driver,
    supabase: {
      url: (env.SUPABASE_URL || '').replace(/\/+$/, ''),
      key: env.SUPABASE_SECRET_KEY || '',
      bucket: env.SUPABASE_BUCKET || 'portfolio',
    },
    admin: {
      email: (env.ADMIN_EMAIL || '').trim().toLowerCase(),
      passwordHash: env.ADMIN_PASSWORD_HASH || '',
    },
    sessionHours: Math.min(72, Math.max(1, Number(env.SESSION_HOURS) || 8)),
    cookieSecure: bool(env.COOKIE_SECURE, production),
    trustProxy: bool(env.TRUST_PROXY, false),
    maxUploadBytes: Math.min(20, Math.max(1, Number(env.MAX_UPLOAD_MB) || 5)) * 1024 * 1024,
    allowFileInProduction: bool(env.ALLOW_FILE_STORAGE_IN_PRODUCTION, false),
    allowedOrigins: (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
    formEndpoint: env.VITE_FORM_ENDPOINT || '',
  };

  const problems = [];
  if (!['file', 'supabase'].includes(driver)) problems.push(`STORAGE_DRIVER must be "file" or "supabase" (got "${driver}").`);
  if (driver === 'supabase' && !hasSupabase) problems.push('STORAGE_DRIVER=supabase needs SUPABASE_URL and SUPABASE_SECRET_KEY.');
  if (production && driver === 'file' && !cfg.allowFileInProduction) {
    problems.push(
      'In production the file storage driver would lose content and images on redeploy. Configure Supabase ' +
        '(SUPABASE_URL + SUPABASE_SECRET_KEY), or set ALLOW_FILE_STORAGE_IN_PRODUCTION=true only if DATA_DIR is on a persistent disk.'
    );
  }
  cfg.problems = problems;
  cfg.adminConfigured = !!(cfg.admin.email && cfg.admin.passwordHash);
  return cfg;
}
