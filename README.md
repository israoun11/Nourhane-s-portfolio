# Nourhane Thabet — Website + Content Dashboard

**I think beyond the visual.** The personal brand website (React + Vite) in **English and French**, with a secure dashboard at **`/admin`** where the owner edits texts (in the three languages), images, projects, every section — and reads the messages sent with the contact form. No code needed.

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
   - **Content**
     - **Projects** — add, edit, hide/show, **archive** (hidden but kept), reorder (↑ ↓) or delete projects. The first project is featured on the home page. Each project page shows the case study: context, problem, role, **objective, strategy, execution, tools used, project website, source code, other links, related case studies**, gallery, results (real figures only) and its own search title/description. Parts left empty are simply not shown.
     - **Digital products** — free PDFs, paid products (price shown, online payment not connected yet) and "coming soon". Each product has a page at `/resources/<address>`. For a free product, upload the PDF: it stays **private** and visitors get a temporary download link after entering their name and email.
     - **My story** — no slider: each year's design has photo positions (its circles, squares, cards, screens). Photo 1 fills position 1, photo 2 position 2… Upload, replace, delete and reorder (← →) photos per year; the page shows a preview of which photo goes in which position. Extra photos open in the viewer with a "+N" button.
     - **Tools & technologies** — 16 categories / 55 tools seeded from your list. Add, edit, delete, reorder and hide categories and tools, upload a logo, move a tool to another category. Brand icons come from Simple Icons (CC0) where the brand is published there; others show a neutral letter until you upload an official logo you may use.
     - **Statistics** — "+70 Projects", "+50 Candidates"… value, label, description, link, visibility. Publish only accurate figures.
     - **Page texts** — every headline, introduction and button label, section by section.
   - **Contacts & leads**
     - **Messages** — everything sent with the contact form: search, filter by status (new / in progress / done), private notes, where the visitor came from (UTM / referrer), CSV export, reply by email, delete.
     - **Leads (downloads)** — people who downloaded a free PDF: search, filter by product or newsletter consent, number of downloads, CSV export, delete. Privacy notice, consent checkbox (never pre-ticked) and **retention** (automatic deletion after N months) are set here.
     - **Booking calendar** — the built-in calendar (default): weekly availability, time zone, meeting types and durations, start-time interval, break between meetings, minimum notice, booking window, days off, and an on/off switch (**off by default** — switch it on once your hours are right). Visitors pick a day and a free time (shown in their own time zone), enter name and email, and get a confirmation with an "Add to my calendar" file and a private link to cancel. Booked times disappear immediately (no double booking). Appointments are listed here: mark done, cancel, delete, reply by email. No email is sent automatically (no email service is connected). Calendly or Cal.com can still be chosen instead.
     - **Contact & social links** — email (`mailto:`), WhatsApp (`https://wa.me/<number>` + optional pre-filled message), Instagram, LinkedIn, and the contact cards (form / booking, order, visibility). Empty methods are hidden on the website.
     - **CV & downloads** — upload, preview, replace or remove your CV (checked to be a real PDF).
   - **Visibility** — **SEO** (website address, home and portfolio search texts, sharing image, indexing on/off, extra robots rules, structured data, redirects, missing alt texts and translations, broken-link checker; sitemap.xml and robots.txt are generated) and **Integrations** (honest connection status; Search Console, GA4, Google Ads, Meta Ads, AI assistant and payments arrive in phase 2).
   - **Languages** — **Translations** (every text still missing in French) and **Interface texts** (change any button, label or message of the website, per language).
   - **Sections** — logo carousel, ways of thinking ("One creative mind": the photo sits in a frame, the coloured shapes stay), method, expertise (image shown in the hover card, link), CodaStudio capabilities, training offers, content series, testimonials.
   - **Website info & photos** and **History** — portrait (description, focus point), CodaStudio, training photos; the last 10 saved versions with one-click restore.
3. When you change something, a dark bar appears at the bottom:
   - **Preview ↗** opens the website in a new tab with your unsaved changes (only you see it).
   - **Discard** returns to the last saved version.
   - **Save changes** (or Ctrl/⌘ + S) publishes. The green "Saved — your changes are now live" message appears **only after the server confirms it**.
4. **Images:** click *Upload image* / *Replace image*, pick a JPEG, PNG or WebP (max 5 MB). You see a preview and a progress bar; press **Save changes** to publish. *Undo* returns to the saved image, *Remove* shows the placeholder design again.
5. **Languages.**
   - *Dashboard language*: EN · FR at the top of the menu.
   - *Content language*: on every editing page, choose **English · Français** at the top. English is the main version. In French you edit the translation of each text; the English text is shown under each field for reference. An empty translation shows the English text on the website. Images, colours and links are the same in every language ("Same in all languages").
   - The website's own labels (menu, buttons, form messages…) are translated in `src/i18n/site/en.js` and `fr.js`; the dashboard's in `src/i18n/admin/`. The first French versions of the content come from `shared/i18n/content-fr.js` (used only for texts that have no translation yet).
6. **Log out** at the bottom of the menu. Sessions also end automatically after 8 hours — if that happens while you're editing, you're asked to sign in again and **your unsaved changes are kept**.

Safety nets: leaving with unsaved changes asks for confirmation · deletions ask for confirmation · invalid fields are marked in red and nothing is saved · if a save fails, the previous version stays online · if the content was changed in another window, you're asked to reload instead of overwriting it.

---

## 3. Production setup (once)

### 3.1 Create the Supabase project (database + images) — free plan is enough
1. Create an account at [supabase.com](https://supabase.com) → **New project**.
2. **SQL Editor → New query** → paste the content of [`server/supabase.sql`](server/supabase.sql) → **Run**. This creates the three tables — content, sessions and **contact messages** (`nt_messages`) — locked so only your server can use them, and the public `portfolio` image bucket (images only, max 5 MB).
   It also creates the **private** `portfolio-private` bucket (PDFs given after the lead form) and the `nt_records` table (leads).
   **Already set up an earlier version?** Run the same file again: it only adds what is missing (message status/notes/source columns, `nt_records`, the private bucket, PDF in the public bucket). Without it, the new features answer with a clear error (nothing is lost silently).
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
| `DOWNLOAD_SECRET` | generated automatically by the blueprint (signs download links) |
| `CALENDLY_TOKEN` or `CALCOM_API_KEY` | optional — lists your appointments in the dashboard |

4. Deploy. Visit `https://<your-site>/admin` and sign in. On first start the server copies the approved content into Supabase.

Any Node host works the same way (Railway, Fly.io, a VPS): build with `npm install && npm run build`, start with `npm start`, set `NODE_ENV=production` and the variables above (`TRUST_PROXY=true` behind a proxy).
Static-only hosts (Netlify drop, GitHub Pages) **cannot** run the dashboard.

> The server refuses to start in production with local file storage, so content can never silently vanish on redeploy. If you host on a machine with a persistent disk, you may set `ALLOW_FILE_STORAGE_IN_PRODUCTION=true` and `DATA_DIR=/path/on/that/disk`.

### 3.3 Downloads, booking, SEO
- **Free PDFs**: visitors enter name + email on the product page; the server stores the lead and answers with a signed link valid for the hours set in the dashboard (24 h by default). The PDF itself lives in the private bucket and is never public. If the PDF is missing, the visitor sees a clear message and nothing is stored.
- **Booking**: availability, time zones, confirmations, cancellations and double-booking protection are handled by Calendly / Cal.com; the website shows their calendar inside the "Book a meeting" card. Nothing is shown as booked by this website.
- **SEO**: `/sitemap.xml` (with the three languages), `/robots.txt`, canonical and `hreflang` links, social image and JSON-LD are generated by the server from the content. Redirects set in the dashboard answer with 301.

### 3.4 Analytics, Search Console, Google Ads, Meta Ads, AI assistant (optional)
All read-only, all server-side (see `.env.example` for the exact variables):
- **GA4 & Search Console**: create a Google Cloud service account, paste its JSON key in `GOOGLE_SERVICE_ACCOUNT_JSON`, give its e-mail *Viewer* access in GA4 (property id in `GA4_PROPERTY_ID`) and add it as a user in Search Console (`GSC_SITE_URL`).
- **Google Ads**: an approved developer token, an OAuth client id/secret and a refresh token for the account, plus the customer id. Reports use `googleAds:searchStream` (SELECT queries only).
- **Meta Ads**: a system-user token with `ads_read` and the ad account id. Reports use the `/insights` endpoint only.
- **AI assistant**: `AI_PROVIDER` (`anthropic` or `openai`), `AI_API_KEY`, `AI_MODEL`. It only writes drafts; nothing is published automatically.
Until a service is configured, its dashboard page says "Not connected" and lists what is missing — no figures are shown.

### 3.5 Contact form
- **Contact form**: nothing to set up. Messages are sent to this server (`POST /api/contact`), checked again there, stored with the content (Supabase table `nt_messages` in production) and shown in the dashboard. The visitor sees "Thank you" only after the server confirms the message is stored; otherwise a clear error. Protection: same-site only, JSON only, 5 messages per 10 minutes per visitor (100/hour overall), hidden anti-bot field, length limits, plain text only.

### 3.6 Changing the admin password
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
| `MAX_UPLOAD_MB` | 5 | image upload limit (keep in line with the bucket limit) |
| `MAX_PDF_MB` | 20 | PDF upload limit (CV, e-books) |
| `SUPABASE_PRIVATE_BUCKET` | `portfolio-private` | private PDFs (lead downloads) |
| `DOWNLOAD_SECRET` | generated and stored | signs the temporary download links |
| `CALENDLY_TOKEN`, `CALCOM_API_KEY` | — | read-only list of upcoming appointments in the dashboard |
| `PORT` | 8787 | server port |
| `TRUST_PROXY` | false | use the visitor IP from `X-Forwarded-For` (rate limiting) behind a proxy |
| `COOKIE_SECURE` | true in production | session cookie only over HTTPS |
| `ALLOW_FILE_STORAGE_IN_PRODUCTION`, `DATA_DIR` | false, `server/data` | file storage on a persistent disk |
| `ALLOWED_ORIGINS` | — | extra allowed origins for admin requests (normally not needed) |

---

## 5. How it works (for developers)

- **Content model:** one validated JSON document. `shared/schema.js` defines every field once and drives both the **server validation** and the **dashboard forms**. `shared/default-content.js` is the approved content used to seed the database (and as offline fallback).
- **Public pages:** the server embeds the latest published content in the HTML (`<script id="nt-content" type="application/json">`, safely escaped), sets per-page titles/descriptions and returns real 404s. No rebuild is needed after content edits. Hidden projects are removed server-side.
- **Languages:** `src/i18n/index.jsx` (choice remembered in this browser and in an `nt_lang` cookie, so the server sends `<html lang dir>` right away; `?lang=fr` also works). Content translations live next to each English text as `i18n: { fr: {…} }` inside the same object (they move with reordering). `shared/i18n/localize.js` returns the content in one language; `shared/migrate.js` upgrades older saved content (single story image → photo list, approach text → text + image, missing logos) without losing anything and adds the default translations. Arabic was removed as a website language; Arabic texts saved by an earlier version stay in the stored content untouched (not shown, not deleted).
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

---

**Brand tokens** (top of `src/styles/base.css`): Royal Blue `#1534DD` · Creative Pink `#F174AB` · Warm Ivory `#FFF9F5` · Midnight Ink `#202033` · Soft Aqua `#B9E8E5` — Playfair Display, Manrope, Barlow Condensed.
