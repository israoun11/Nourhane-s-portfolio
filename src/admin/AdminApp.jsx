import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useRouter } from '../router.jsx';
import { api, onSessionExpired } from './api.js';
import { EditorProvider, ToastProvider, useEditor, useToast } from './state.jsx';
import { ConfirmProvider, Modal, useConfirm } from './ui.jsx';
import { History, Overview, ProjectEdit, Projects, SECTION_PAGES, SectionPage, SiteInfo, Texts } from './pages.jsx';
import { Inbox } from './Inbox.jsx';
import { Translations, useMissingCounts } from './Translations.jsx';
import { AdsPage, AiPage, AnalyticsPage, BookingPage, ContactPage, FilesPage, IntegrationsPage, LeadsPage, ProductsPage, SeoPage, StatsPage, StoryPage, ToolsPage, UiTextsPage } from './modules.jsx';
import { AdminI18n, EditLangProvider, LANGS, inputLangProps, useAdminT, useEditLang, useErrorText } from './i18n.jsx';
import LangSwitcher from '../components/LangSwitcher.jsx';
import './admin.css';

// ═════════════ Login ═════════════
function LoginForm({ onDone, compact = false }) {
  const t = useAdminT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) return setError(t('ad.login.missing'));
    setBusy(true);
    setError('');
    try {
      const r = await api('/api/auth/login', { method: 'POST', json: { email, password } });
      setPassword('');
      onDone(r);
    } catch (err) {
      setError(err.status === 401 ? t('ad.login.wrong') : err.status === 429 ? t('ad.login.rate') : err.status === 0 ? t('ad.err.network') : err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="ad-login__form" onSubmit={submit} noValidate>
      {!compact && <h1>{t('ad.login.title')}</h1>}
      <label className="ad-label" htmlFor="ad-email">{t('ad.login.email')}</label>
      <input id="ad-email" className="ad-input" type="email" dir="ltr" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label className="ad-label" htmlFor="ad-pass">{t('ad.login.password')}</label>
      <input id="ad-pass" className="ad-input" type="password" dir="ltr" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="ad-error" role="alert">{error}</p>}
      <button className="ad-btn ad-btn--primary ad-btn--block" type="submit" disabled={busy}>{busy ? t('ad.login.busy') : t('ad.login.submit')}</button>
    </form>
  );
}

function Brand() {
  const t = useAdminT();
  return <><span dir="ltr">NOURHANE THABET<sup>®</sup></span> <span className="ad-brand__tag">{t('ad.brand')}</span></>;
}

function LoginPage({ onDone, notConfigured }) {
  const t = useAdminT();
  const parts = t('ad.login.notConfigured', { cmd: '\u0001', vars: '\u0002' }).split(/[\u0001\u0002]/);
  return (
    <main className="ad-login">
      <div className="ad-login__card">
        <div className="ad-login__top">
          <p className="ad-brand"><Brand /></p>
          <LangSwitcher />
        </div>
        {notConfigured ? (
          <div className="ad-alert ad-alert--warn" role="alert">
            {parts[0]}<code>npm run admin:password</code>{parts[1]}<code>ADMIN_EMAIL</code> / <code>ADMIN_PASSWORD_HASH</code>{parts[2]}
          </div>
        ) : (
          <LoginForm onDone={onDone} />
        )}
        <a className="ad-link" href="/">{t('ad.login.back')}</a>
      </div>
    </main>
  );
}

// ═════════════ Shell ═════════════
function useNav() {
  const t = useAdminT();
  return [
    { to: '/admin', label: t('ad.nav.overview') },
    { group: t('ad.nav.g.content') },
    { to: '/admin/projects', label: t('ad.nav.projects') },
    { to: '/admin/products', label: t('ad.mod.products') },
    { to: '/admin/story', label: t('ad.mod.story') },
    { to: '/admin/tools', label: t('ad.mod.tools') },
    { to: '/admin/stats', label: t('ad.mod.stats') },
    { to: '/admin/texts', label: t('ad.nav.texts') },
    { group: t('ad.nav.g.relations') },
    { to: '/admin/inbox', label: t('ad.nav.inbox'), badge: true },
    { to: '/admin/leads', label: t('ad.mod.leads') },
    { to: '/admin/booking', label: t('ad.mod.booking') },
    { to: '/admin/contact', label: t('ad.mod.contact') },
    { to: '/admin/files', label: t('ad.mod.files') },
    { group: t('ad.nav.g.growth') },
    { to: '/admin/seo', label: t('ad.mod.seo') },
    { to: '/admin/analytics', label: t('ad.mod.analytics') },
    { to: '/admin/ads', label: t('ad.mod.ads') },
    { to: '/admin/ai', label: t('ad.mod.ai') },
    { to: '/admin/integrations', label: t('ad.mod.integrations') },
    { group: t('ad.nav.g.languages') },
    { to: '/admin/translations', label: t('ad.nav.translations'), missing: true },
    { to: '/admin/interface', label: t('ad.mod.ui') },
    { group: t('ad.nav.sections') },
    ...SECTION_PAGES.map((k) => ({ to: `/admin/sections/${k}`, label: t(`ad.sec.${k}`) })),
    { group: t('ad.nav.safety') },
    { to: '/admin/site', label: t('ad.nav.site') },
    { to: '/admin/history', label: t('ad.nav.history') },
  ];
}

/** English · Français · العربية — which version of the texts is being edited. */
function EditLangBar() {
  const { editLang, setEditLang } = useEditLang();
  const t = useAdminT();
  const cur = LANGS.find((l) => l.code === editLang);
  return (
    <div className="ad-editlang" role="group" aria-label={t('ad.editLang')}>
      <span className="ad-editlang__k">{t('ad.editLang')}</span>
      <div className="ad-editlang__btns">
        {LANGS.map((l) => (
          <button key={l.code} type="button" {...inputLangProps(l.code)} className={`ad-chip${editLang === l.code ? ' is-on' : ''}`} aria-pressed={editLang === l.code} onClick={() => setEditLang(l.code)}>
            {l.label}
          </button>
        ))}
      </div>
      <p className="ad-editlang__note">{editLang === 'en' ? t('ad.editLang.en') : t('ad.editLang.other', { lang: cur.label })}</p>
    </div>
  );
}

function SaveBar() {
  const { dirty, saving, save, discard, preview, draft } = useEditor();
  const { editLang } = useEditLang();
  const confirm = useConfirm();
  const t = useAdminT();
  const { path } = useRouter();
  if (!dirty) return null;
  const m = path.match(/^\/admin\/projects\/(\d+)$/);
  const proj = m && draft.projects[Number(m[1])];
  return (
    <div className="ad-savebar" role="region" aria-label={t('ad.save.region')}>
      <span><b>{t('ad.save.unsaved')}</b> {t('ad.save.unsavedText')}</span>
      <div className="ad-row">
        <button type="button" className="ad-btn ad-btn--ghost ad-btn--light" onClick={async () => (await confirm({ title: t('ad.save.discardTitle'), body: t('ad.save.discardBody'), ok: t('ad.save.discard'), danger: true })) && discard()} disabled={saving}>
          {t('ad.save.discard')}
        </button>
        <button type="button" className="ad-btn ad-btn--ghost ad-btn--light" onClick={() => (proj ? preview(`/work/${proj.slug}?lang=${editLang}`, proj.slug) : preview(`/?lang=${editLang}`))} disabled={saving}>{t('ad.save.preview')}</button>
        <button type="button" className="ad-btn ad-btn--pink" onClick={save} disabled={saving} aria-busy={saving}>{saving ? t('ad.save.saving') : t('ad.save.save')}</button>
      </div>
    </div>
  );
}

const EDITING = /^\/admin\/(projects\/\d+|texts|site|sections\/|products|story|tools|stats|contact|booking|files|seo|leads|interface|ads)/;

function Route({ path, status, email, unread, setUnread }) {
  const t = useAdminT();
  const clean = path.replace(/\/+$/, '');
  if (clean === '/admin') return <Overview status={status} email={email} unread={unread} />;
  if (clean === '/admin/inbox') return <Inbox onUnread={setUnread} />;
  if (clean === '/admin/translations') return <Translations />;
  if (clean === '/admin/projects') return <Projects />;
  const pm = clean.match(/^\/admin\/projects\/(\d+)$/);
  if (pm) return <ProjectEdit index={Number(pm[1])} />;
  if (clean === '/admin/texts') return <Texts />;
  if (clean === '/admin/site') return <SiteInfo />;
  if (clean === '/admin/history') return <History />;
  const MODULES = {
    '/admin/story': StoryPage, '/admin/stats': StatsPage, '/admin/tools': ToolsPage, '/admin/products': ProductsPage,
    '/admin/leads': LeadsPage, '/admin/contact': ContactPage, '/admin/booking': BookingPage, '/admin/files': FilesPage,
    '/admin/seo': SeoPage, '/admin/interface': UiTextsPage, '/admin/integrations': IntegrationsPage,
    '/admin/analytics': AnalyticsPage, '/admin/ads': AdsPage, '/admin/ai': AiPage,
  };
  const Mod = MODULES[clean];
  if (Mod) return <Mod status={status} />;
  const sm = clean.match(/^\/admin\/sections\/([a-zA-Z]+)$/);
  if (sm) return <SectionPage k={sm[1]} />;
  return <p className="ad-empty">{t('ad.notFound')} <Link to="/admin">{t('ad.toOverview')}</Link></p>;
}

function Dashboard({ session, onLogout, expired, onRelogin }) {
  const { path } = useRouter();
  const editor = useEditor();
  const toast = useToast();
  const confirm = useConfirm();
  const t = useAdminT();
  const errText = useErrorText();
  const nav = useNav();
  const missing = useMissingCounts();
  const [status, setStatus] = useState(null);
  const [unread, setUnread] = useState(null);
  const [menu, setMenu] = useState(false);
  const mainRef = useRef(null);

  useEffect(() => {
    api('/api/admin/status').then((s) => {
      setStatus(s);
      setUnread(s.unreadMessages);
      window.__ntMaxUploadMb = s.maxUploadMb;
      window.__ntMaxPdfMb = s.maxPdfMb;
    }, () => {});
  }, [editor.saved && editor.saved.version]);

  // New page: close the mobile menu, move focus to the content for keyboard/screen-reader users.
  useEffect(() => {
    setMenu(false);
    if (mainRef.current) mainRef.current.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [path]);

  // Ctrl/Cmd + S saves.
  useEffect(() => {
    const k = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (editor.dirty) editor.save();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [editor]);

  const logout = async () => {
    if (editor.dirty && !(await confirm({ title: t('ad.logout.title'), body: t('ad.logout.body'), ok: t('ad.logout.ok'), danger: true }))) return;
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      /* the cookie is cleared server-side when possible; continue */
    }
    toast(t('ad.logout.done'));
    onLogout();
  };

  if (editor.loadError) {
    return (
      <main className="ad-login">
        <div className="ad-login__card">
          <p className="ad-error" role="alert">{t('ad.loadError', { msg: editor.loadError })}</p>
          <button type="button" className="ad-btn ad-btn--primary" onClick={editor.load}>{t('ad.tryAgain')}</button>
        </div>
      </main>
    );
  }
  if (!editor.draft) return <div className="admin-loading" role="status">{t('ad.loadingContent')}</div>;

  const current = (to) => (to === '/admin' ? path.replace(/\/+$/, '') === '/admin' : path.startsWith(to));

  return (
    <div className="ad-shell">
      <a className="skip-link" href="#ad-main">{t('ad.skip')}</a>
      <aside className={`ad-side${menu ? ' is-open' : ''}`}>
        <div className="ad-side__top">
          <Link to="/admin" className="ad-brand"><Brand /></Link>
          <button type="button" className="ad-menu-btn" aria-expanded={menu} aria-controls="ad-nav" onClick={() => setMenu((m) => !m)}>
            {menu ? t('ad.nav.close') : t('ad.nav.menu')}
          </button>
        </div>
        <nav id="ad-nav" className="ad-nav" aria-label={t('ad.nav.label')}>
          <div className="ad-nav__lang">
            <span>{t('ad.interfaceLang')}</span>
            <LangSwitcher className="lang--light" />
          </div>
          {nav.map((n, i) =>
            n.group ? (
              <span key={i} className="ad-nav__group">{n.group}</span>
            ) : (
              <Link key={n.to} to={n.to} className="ad-nav__link" aria-current={current(n.to) ? 'page' : undefined}>
                {n.label}
                {n.badge && unread > 0 && <span className="ad-nav__badge" aria-label={t('ad.unreadBadge', { n: unread })}>{unread}</span>}
                {n.missing && missing.fr + missing.ar > 0 && <span className="ad-nav__badge ad-nav__badge--warn" aria-label={t('ad.tr.badge', { n: missing.fr + missing.ar })}>{missing.fr + missing.ar}</span>}
              </Link>
            )
          )}
          <div className="ad-nav__foot">
            {editor.dirty && <span className="ad-dot" role="status">{t('ad.unsavedDot')}</span>}
            <a className="ad-nav__link" href="/" target="_blank" rel="noreferrer">{t('ad.nav.view')}</a>
            <button type="button" className="ad-nav__link ad-nav__logout" onClick={logout}>{t('ad.nav.logout')}</button>
          </div>
        </nav>
      </aside>
      <main id="ad-main" ref={mainRef} tabIndex={-1} className="ad-main">
        {EDITING.test(path) && <EditLangBar />}
        {editor.errors.length > 0 && (
          <div className="ad-alert ad-alert--error" role="alert">
            <strong>{t('ad.save.fix')}</strong>
            <ul>{editor.errors.slice(0, 8).map((e, i) => <li key={i}>{errText(e)}</li>)}</ul>
          </div>
        )}
        <Route path={path} status={status} email={session.email} unread={unread} setUnread={setUnread} />
      </main>
      <SaveBar />

      {editor.conflict && (
        <Modal title={t('ad.conflict.title')} onClose={null}>
          <p className="ad-modal__body">{t('ad.conflict.body')}</p>
          <div className="ad-row ad-row--end">
            <button type="button" className="ad-btn ad-btn--primary" onClick={editor.load} data-autofocus>{t('ad.conflict.reload')}</button>
          </div>
        </Modal>
      )}
      {expired && (
        <Modal title={t('ad.expired.title')} onClose={null}>
          <p className="ad-modal__body">{t('ad.expired.body')}</p>
          <LoginForm compact onDone={onRelogin} />
        </Modal>
      )}
    </div>
  );
}

// ═════════════ Root ═════════════
function AdminRoot() {
  const t = useAdminT();
  const [session, setSession] = useState(null); // null = checking
  const [expired, setExpired] = useState(false);

  const check = useCallback(async () => {
    try {
      setSession(await api('/api/auth/session'));
    } catch {
      setSession({ authenticated: false, error: true });
    }
  }, []);
  useEffect(() => {
    let m = document.querySelector('meta[name="robots"]');
    if (!m) {
      m = document.createElement('meta');
      m.name = 'robots';
      document.head.appendChild(m);
    }
    m.content = 'noindex, nofollow';
    check();
    return onSessionExpired(() => setExpired(true));
  }, [check]);
  useEffect(() => {
    document.title = t('ad.title');
  }, [t]);

  let body;
  if (!session) body = <div className="admin-loading" role="status">{t('ad.checking')}</div>;
  else if (!session.authenticated)
    body = <LoginPage notConfigured={session.adminConfigured === false} onDone={(r) => setSession({ authenticated: true, email: r.email, expiresAt: r.expiresAt })} />;
  else
    body = (
      <EditorProvider>
        <EditLangProvider>
          <Dashboard
            session={session}
            expired={expired}
            onRelogin={(r) => {
              setSession({ authenticated: true, email: r.email, expiresAt: r.expiresAt });
              setExpired(false);
            }}
            onLogout={() => setSession({ authenticated: false })}
          />
        </EditLangProvider>
      </EditorProvider>
    );

  return <div className="admin">{body}</div>;
}

export default function AdminApp() {
  return (
    <AdminI18n>
      <ToastProvider>
        <ConfirmProvider>
          <AdminRoot />
        </ConfirmProvider>
      </ToastProvider>
    </AdminI18n>
  );
}
