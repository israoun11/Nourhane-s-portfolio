# Nourhane Thabet — Website + Content Dashboard

**I think beyond the visual.** The personal brand website (React + Vite) in **English, French and Arabic**, with a secure dashboard at **`/admin`** where the owner edits texts (in the three languages), images, projects, every section — and reads the messages sent with the contact form. No code needed.

| Part | What it is |
|---|---|
| Public website | `/` landing page · `/work` portfolio · `/work/<project>` case studies |
| Dashboard | `/admin` — login, messages (contact form inbox), page texts in EN/FR/AR, website info & photos, projects & galleries, sections, preview, history — interface in EN/FR/AR |
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

In development, content, images and contact messages are saved in `server/data/` on your computer (the dashboard shows a yellow "Development storage" notice). The first start fills the database with the current approved content.

---

## 2. Using the dashboard (for the owner)

1. Go to **yourwebsite.com/admin** and sign in.
2. Choose what to edit in the menu:
   - **Messages** — everything sent with the contact form: name, email, category, message, date and time, language. Open a message (it is marked as read), mark it unread again, reply by email, or delete it. The number of unread messages shows next to "Messages".
   - **Projects** — add, edit, hide/show, reorder (↑ ↓) or delete projects. The first project is featured on the home page. Each project has its own page; "Preview page" shows it before saving.
     - **Cover & gallery**: "+ Add photos" uploads several images at once (they fill empty places first). For each image: Replace, ← → to reorder, ⌫ remove the image but keep its place, ✕ delete the place, and a caption. The gallery is "The work" on the project page; visitors can open each image full screen.
     - **"How it came together" — 4 cards**: each card has its own text and its own small image.
   - **Page texts** — every headline, introduction and button label, section by section.
   - **Website info & photos** — portrait, contact email, CV link, CodaStudio link and images, social profiles, training photos, Google title/description.
   - **Sections** — logo carousel (brand logos scrolling under the hero), ways of thinking, **My story** (each year has at least four photo places — same photo tools as galleries), journey milestones, method, expertise, CodaStudio capabilities, training offers, content series, digital products, testimonials, contact paths.
   - **History** — the last 10 saved versions; one click restores an older one.
3. When you change something, a dark bar appears at the bottom:
   - **Preview ↗** opens the website in a new tab with your unsaved changes (only you see it).
   - **Discard** returns to the last saved version.
   - **Save changes** (or Ctrl/⌘ + S) publishes. The green "Saved — your changes are now live" message appears **only after the server confirms it**.
4. **Images:** click *Upload image* / *Replace image*, pick a JPEG, PNG or WebP (max 5 MB). You see a preview and a progress bar; press **Save changes** to publish. *Undo* returns to the saved image, *Remove* shows the placeholder design again.
5. **Languages.**
   - *Dashboard language*: EN · FR · ع at the top of the menu (the dashboard itself switches, Arabic right to left).
   - *Content language*: on every editing page, choose **English · Français · العربية** at the top. English is the main version. In French or Arabic you edit the translation of each text; the English text is shown under each field for reference. An empty translation shows the English text on the website. Images, colours and links are the same in every language ("Same in all languages").
   - The website's own labels (menu, buttons, form messages…) are translated in `src/i18n/site/en.js`, `fr.js`, `ar.js`; the dashboard's in `src/i18n/admin/`. The first French/Arabic versions of the content come from `shared/i18n/content-fr.js` and `content-ar.js` (used only for texts that have no translation yet).
6. **Log out** at the bottom of the menu. Sessions also end automatically after 8 hours — if that happens while you're editing, you're asked to sign in again and **your unsaved changes are kept**.

Safety nets: leaving with unsaved changes asks for confirmation · deletions ask for confirmation · invalid fields are marked in red and nothing is saved · if a save fails, the previous version stays online · if the content was changed in another window, you're asked to reload instead of overwriting it.

---

## 3. Production setup (once)

### 3.1 Create the Supabase project (database + images) — free plan is enough
1. Create an account at [supabase.com](https://supabase.com) → **New project**.
2. **SQL Editor → New query** → paste the content of [`server/supabase.sql`](server/supabase.sql) → **Run**. This creates the three tables — content, sessions and **contact messages** (`nt_messages`) — locked so only your server can use them, and the public `portfolio` image bucket (images only, max 5 MB).
   **Already set up an earlier version?** Run the same file again: it only adds what is missing (the `nt_messages` table). Without it, sending the contact form fails with an error (nothing is lost silently).
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
| `VITE_ARABIC_HEADING_FONT` | optional — `bukra` once the licensed 29LT Bukra files are added (see 3.3) |

4. Deploy. Visit `https://<your-site>/admin` and sign in. On first start the server copies the approved content into Supabase.

Any Node host works the same way (Railway, Fly.io, a VPS): build with `npm install && npm run build`, start with `npm start`, set `NODE_ENV=production` and the variables above (`TRUST_PROXY=true` behind a proxy).
Static-only hosts (Netlify drop, GitHub Pages) **cannot** run the dashboard.

> The server refuses to start in production with local file storage, so content can never silently vanish on redeploy. If you host on a machine with a persistent disk, you may set `ALLOW_FILE_STORAGE_IN_PRODUCTION=true` and `DATA_DIR=/path/on/that/disk`.

### 3.3 Contact form & Arabic fonts
- **Contact form**: nothing to set up. Messages are sent to this server (`POST /api/contact`), checked again there, stored with the content (Supabase table `nt_messages` in production) and shown in the dashboard. The visitor sees "Thank you" only after the server confirms the message is stored; otherwise a clear error. Protection: same-site only, JSON only, 5 messages per 10 minutes per visitor (100/hour overall), hidden anti-bot field, length limits, plain text only.
- **Arabic typography**: paragraphs use **Tajawal** (self-hosted in `public/fonts/tajawal`, open licence). Titles are meant for **29LT Bukra Bold**, subtitles **29LT Bukra Medium** — a commercial font that is **not included**: add the licensed web-font files as `public/fonts/bukra/29LT-Bukra-Bold.woff2` and `29LT-Bukra-Medium.woff2`, set `VITE_ARABIC_HEADING_FONT=bukra`, rebuild. Until then titles use Tajawal ExtraBold and subtitles Tajawal Bold. Details: `public/fonts/README.txt`.

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
| `VITE_ARABIC_HEADING_FONT` | — | `bukra` = use the licensed 29LT Bukra files for Arabic titles |

---

## 5. How it works (for developers)

- **Content model:** one validated JSON document. `shared/schema.js` defines every field once and drives both the **server validation** and the **dashboard forms**. `shared/default-content.js` is the approved content used to seed the database (and as offline fallback).
- **Public pages:** the server embeds the latest published content in the HTML (`<script id="nt-content" type="application/json">`, safely escaped), sets per-page titles/descriptions and returns real 404s. No rebuild is needed after content edits. Hidden projects are removed server-side.
- **Languages:** `src/i18n/index.jsx` (choice remembered in this browser and in an `nt_lang` cookie, so the server sends `<html lang dir>` right away; `?lang=fr` also works). Content translations live next to each English text as `i18n: { fr: {…}, ar: {…} }` inside the same object (they move with reordering). `shared/i18n/localize.js` returns the content in one language; `shared/migrate.js` upgrades older saved content (single story image → photo list, approach text → text + image, missing logos) without losing anything and adds the default translations. Arabic layout and typography: `src/styles/rtl.css`.
- **API:** `GET /api/content` (public) · `POST /api/contact` (public, rate-limited) · `GET /api/admin/messages` · `PATCH|DELETE /api/admin/messages/<id>` · `POST /api/auth/login|logout` · `GET /api/auth/session` · `GET|PUT /api/admin/content` · `POST /api/admin/upload` · `GET /api/admin/history` · `POST /api/admin/restore` · `GET /api/admin/status` · `GET /api/health`.
- **Saving:** optimistic version check (409 instead of overwriting newer content) · previous 10 versions kept · uploads no longer used anywhere (including history) are deleted after 24 h.
- **Security:** scrypt-hashed password from env · random session tokens, only their SHA-256 stored · `HttpOnly; SameSite=Strict; Secure` cookie · CSRF: custom header + Origin check on every state change · login rate limit (5 failures / 15 min per IP, 30 overall) · server-side validation of every field (URLs limited to `https://` or site paths — no `javascript:`) · uploads checked by file content (JPEG/PNG/WebP magic bytes, not the name), size-limited, stored under their SHA-256 name (duplicates reused) · CSP, `nosniff`, `frame-ancestors 'none'`, HSTS in production · no stack traces or secrets in responses · React escapes all text (no raw HTML rendering).
- **Scroll reveal:** shown elements are marked with a `data-in` attribute (not a class, which React would remove when a component changes its classes — the cause of the contact cards disappearing).
- **Motion:** words of headings rise in sequence, images open with a clip reveal and drift gently inside their frame (parallax), page transitions, header entrance, mobile menu closing animation, scroll progress line, plus the existing hero sequence, orbit, journey and hover effects. Everything is CSS transforms/opacity driven by one shared `requestAnimationFrame` loop and IntersectionObserver; all of it is disabled with *reduce motion*.
- **Logo carousel:** `src/sections/LogoMarquee.jsx` + `.logos*` rules in `src/styles/home.css`. Pure CSS animation: two identical groups slide by exactly one group width, so the loop has no seam; each group repeats the logos until it is wider than the screen. Speed is `SPEED` (px/s) at the top of the component. Pauses on hover (mouse only) and keyboard focus; with *reduce motion* it becomes a static, swipeable row. Default logo files live in `public/logos/`, listed in `shared/default-content.js` → `logos`.
- **Dashboard bundle** is lazy-loaded: visitors never download it.

### Scripts
| Command | Does |
|---|---|
| `npm run dev` | API server (8787, auto-restart) + Vite (5173, proxies `/api` and `/uploads`) |
| `npm run build` | production build into `dist/` |
| `npm start` | production server (serves `dist/` + API) |
| `npm run preview` | build, then start the production server locally |
| `npm test` | test suite (27 tests: auth, CSRF, rate limits, validation, conflicts, uploads, history, page injection & language, path traversal, contact messages + inbox on both storage drivers, content migration, translations complete in all 3 languages) |
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
| Contact form says the message was not sent (production) | Run `server/supabase.sql` again in Supabase — it adds the `nt_messages` table needed by the inbox. |
| Arabic titles are not in 29LT Bukra | Expected until the licensed font files are added — see section 3.3. |

---

**Brand tokens** (top of `src/styles/base.css`): Royal Blue `#1534DD` · Creative Pink `#F174AB` · Warm Ivory `#FFF9F5` · Midnight Ink `#202033` · Soft Aqua `#B9E8E5` — Playfair Display, Manrope, Barlow Condensed.
