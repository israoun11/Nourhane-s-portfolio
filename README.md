# Nourhane Thabet — Website + Content Dashboard

**I think beyond the visual.** The personal brand website (React + Vite) with a secure dashboard at **`/admin`** where the owner edits texts, images, projects and every section — no code needed.

| Part | What it is |
|---|---|
| Public website | `/` landing page · `/work` portfolio · `/work/<project>` case studies |
| Dashboard | `/admin` — login, page texts, website info & photos, projects, sections, preview, history |
| Server | `server/` — a small Node.js server with **no extra dependencies**: serves the site, the API, logins and uploads |
| Storage | **Supabase** in production (database + image storage), local files in development |

---

## 1. Quick start (on your computer)

Requires **Node.js 20.12 or newer** ([nodejs.org](https://nodejs.org), LTS).

```bash
cd nourhane-thabet
npm install
cp .env.example .env          # Windows: copy .env.example .env
npm run admin:password        # choose a password → copy the line it prints into .env
```

Open `.env` and set `ADMIN_EMAIL=` to the email you'll log in with. Then:

```bash
npm run dev
```

- Website: **http://localhost:5173**
- Dashboard: **http://localhost:5173/admin**

In development, content and images are saved in `server/data/` on your computer (the dashboard shows a yellow "Development storage" notice). The first start fills the database with the current approved content.

---

## 2. Using the dashboard (for the owner)

1. Go to **yourwebsite.com/admin** and sign in.
2. Choose what to edit in the menu:
   - **Projects** — add, edit, hide/show, reorder (↑ ↓) or delete projects. The first project is featured on the home page. Each project has its own page; "Preview page" shows it before saving.
   - **Page texts** — every headline, introduction and button label, section by section.
   - **Website info & photos** — portrait, contact email, CV link, CodaStudio link and images, social profiles, training photos, Google title/description.
   - **Sections** — ways of thinking, journey milestones, method, expertise, CodaStudio capabilities, training offers, content series, digital products, testimonials, contact paths.
   - **History** — the last 10 saved versions; one click restores an older one.
3. When you change something, a dark bar appears at the bottom:
   - **Preview ↗** opens the website in a new tab with your unsaved changes (only you see it).
   - **Discard** returns to the last saved version.
   - **Save changes** (or Ctrl/⌘ + S) publishes. The green "Saved — your changes are now live" message appears **only after the server confirms it**.
4. **Images:** click *Upload image* / *Replace image*, pick a JPEG, PNG or WebP (max 5 MB). You see a preview and a progress bar; press **Save changes** to publish. *Undo* returns to the saved image, *Remove* shows the placeholder design again.
5. **Log out** at the bottom of the menu. Sessions also end automatically after 8 hours — if that happens while you're editing, you're asked to sign in again and **your unsaved changes are kept**.

Safety nets: leaving with unsaved changes asks for confirmation · deletions ask for confirmation · invalid fields are marked in red and nothing is saved · if a save fails, the previous version stays online · if the content was changed in another window, you're asked to reload instead of overwriting it.

---

## 3. Production setup (once)

### 3.1 Create the Supabase project (database + images) — free plan is enough
1. Create an account at [supabase.com](https://supabase.com) → **New project**.
2. **SQL Editor → New query** → paste the content of [`server/supabase.sql`](server/supabase.sql) → **Run**. This creates the two tables (locked so only your server can use them) and the public `portfolio` image bucket (images only, max 5 MB).
3. **Project Settings → API Keys**: copy the **Project URL** and the **secret key** (`sb_secret_…`; the legacy `service_role` key also works). Keep the secret key private — it only goes into the server settings, never into the website code.

### 3.2 Deploy (example: Render)
1. Push this folder to a GitHub repository (`.env` and `server/data` are ignored automatically).
2. On [render.com](https://render.com): **New → Blueprint** → choose the repository. `render.yaml` sets everything up.
3. Fill in the requested values:

| Variable | Value |
|---|---|
| `ADMIN_EMAIL` | the email the owner logs in with |
| `ADMIN_PASSWORD_HASH` | the line from `npm run admin:password` (the part after `=`) |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SECRET_KEY` | Supabase secret key |
| `VITE_FORM_ENDPOINT` | optional — Formspree endpoint for the contact form |

4. Deploy. Visit `https://<your-site>/admin` and sign in. On first start the server copies the approved content into Supabase.

Any Node host works the same way (Railway, Fly.io, a VPS): build with `npm install && npm run build`, start with `npm start`, set `NODE_ENV=production` and the variables above (`TRUST_PROXY=true` behind a proxy).
Static-only hosts (Netlify drop, GitHub Pages) **cannot** run the dashboard.

> The server refuses to start in production with local file storage, so content can never silently vanish on redeploy. If you host on a machine with a persistent disk, you may set `ALLOW_FILE_STORAGE_IN_PRODUCTION=true` and `DATA_DIR=/path/on/that/disk`.

### 3.3 Contact form (optional)
Create a form at [formspree.io](https://formspree.io), put its endpoint in `VITE_FORM_ENDPOINT` (in `.env` locally and in the hosting settings), rebuild. Without it, the form validates but clearly says sending is not connected — it never fakes a success.

### 3.4 Changing the admin password
Run `npm run admin:password` again, replace `ADMIN_PASSWORD_HASH` in your hosting settings, redeploy/restart. Sessions already open stay valid until they expire (max 8 h); to end them immediately, delete the rows in the Supabase table `nt_sessions`.

---

## 4. All environment variables

See [`.env.example`](.env.example) — placeholders only. Only variables starting with `VITE_` reach the browser; never give a secret a `VITE_` name.

| Variable | Default | Purpose |
|---|---|---|
| `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` | — | the only admin account (no public registration) |
| `SESSION_HOURS` | 8 | login lifetime (1–72) |
| `STORAGE_DRIVER` | `supabase` if Supabase vars are set, else `file` | where content and images live |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_BUCKET` | —, —, `portfolio` | production storage |
| `MAX_UPLOAD_MB` | 5 | upload limit (keep in line with the bucket limit) |
| `PORT` | 8787 | server port |
| `TRUST_PROXY` | false | use the visitor IP from `X-Forwarded-For` (rate limiting) behind a proxy |
| `COOKIE_SECURE` | true in production | session cookie only over HTTPS |
| `ALLOW_FILE_STORAGE_IN_PRODUCTION`, `DATA_DIR` | false, `server/data` | file storage on a persistent disk |
| `ALLOWED_ORIGINS` | — | extra allowed origins for admin requests (normally not needed) |
| `VITE_FORM_ENDPOINT` | — | contact form delivery |

---

## 5. How it works (for developers)

- **Content model:** one validated JSON document. `shared/schema.js` defines every field once and drives both the **server validation** and the **dashboard forms**. `shared/default-content.js` is the approved content used to seed the database (and as offline fallback).
- **Public pages:** the server embeds the latest published content in the HTML (`<script id="nt-content" type="application/json">`, safely escaped), sets per-page titles/descriptions and returns real 404s. No rebuild is needed after content edits. Hidden projects are removed server-side.
- **API:** `GET /api/content` (public) · `POST /api/auth/login|logout` · `GET /api/auth/session` · `GET|PUT /api/admin/content` · `POST /api/admin/upload` · `GET /api/admin/history` · `POST /api/admin/restore` · `GET /api/admin/status` · `GET /api/health`.
- **Saving:** optimistic version check (409 instead of overwriting newer content) · previous 10 versions kept · uploads no longer used anywhere (including history) are deleted after 24 h.
- **Security:** scrypt-hashed password from env · random session tokens, only their SHA-256 stored · `HttpOnly; SameSite=Strict; Secure` cookie · CSRF: custom header + Origin check on every state change · login rate limit (5 failures / 15 min per IP, 30 overall) · server-side validation of every field (URLs limited to `https://` or site paths — no `javascript:`) · uploads checked by file content (JPEG/PNG/WebP magic bytes, not the name), size-limited, stored under their SHA-256 name (duplicates reused) · CSP, `nosniff`, `frame-ancestors 'none'`, HSTS in production · no stack traces or secrets in responses · React escapes all text (no raw HTML rendering).
- **Motion:** words of headings rise in sequence, images open with a clip reveal and drift gently inside their frame (parallax), page transitions, header entrance, mobile menu closing animation, scroll progress line, plus the existing hero sequence, orbit, journey and hover effects. Everything is CSS transforms/opacity driven by one shared `requestAnimationFrame` loop and IntersectionObserver; all of it is disabled with *reduce motion*.
- **Dashboard bundle** is lazy-loaded: visitors never download it.

### Scripts
| Command | Does |
|---|---|
| `npm run dev` | API server (8787, auto-restart) + Vite (5173, proxies `/api` and `/uploads`) |
| `npm run build` | production build into `dist/` |
| `npm start` | production server (serves `dist/` + API) |
| `npm run preview` | build, then start the production server locally |
| `npm test` | server test suite (13 tests: auth, CSRF, rate limit, validation, conflicts, uploads, history, page injection, path traversal, Supabase driver against a local mock) |
| `npm run admin:password` | create a password hash |

---

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| Server exits with "Configuration problem" | Read the message: in production Supabase must be configured (or persistent disk opt-in). |
| Login page says the admin account is not set up | `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` are missing on the server. |
| "Too many login attempts" | Wait 15 minutes (protection against password guessing). |
| "Storage service error 401/403" in server logs | Wrong `SUPABASE_SECRET_KEY` (use the secret / service_role key, not the publishable/anon key). |
| "Storage service error 404" on first start | `server/supabase.sql` was not run in the Supabase project. |
| Uploads fail with "Only JPEG, PNG and WebP…" | The file isn't really one of those formats (e.g. HEIC from iPhone, or SVG). Export as JPEG. |
| Images upload locally but disappear online | Production must use Supabase, not the file driver. |
| `/admin` shows "website has not been built yet" | Run `npm run build` before `npm start` (or use `npm run dev`). |
| Changes don't appear | Make sure you pressed **Save changes** and saw the green confirmation. Visitors' open tabs refresh content when they come back to the tab. |
| Port already in use | Set another `PORT` in `.env`. |

---

**Brand tokens** (top of `src/styles/base.css`): Royal Blue `#1534DD` · Creative Pink `#F174AB` · Warm Ivory `#FFF9F5` · Midnight Ink `#202033` · Soft Aqua `#B9E8E5` — Playfair Display, Manrope, Barlow Condensed.
