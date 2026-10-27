import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useRouter } from '../router.jsx';
import { api, onSessionExpired } from './api.js';
import { EditorProvider, ToastProvider, useEditor, useToast } from './state.jsx';
import { ConfirmProvider, Modal, useConfirm } from './ui.jsx';
import { History, Overview, ProjectEdit, Projects, SECTION_PAGES, SectionPage, SiteInfo, Texts } from './pages.jsx';
import './admin.css';

// ═════════════ Login ═════════════
function LoginForm({ onDone, compact = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) return setError('Please enter your email and password.');
    setBusy(true);
    setError('');
    try {
      const r = await api('/api/auth/login', { method: 'POST', json: { email, password } });
      setPassword('');
      onDone(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="ad-login__form" onSubmit={submit} noValidate>
      {!compact && <h1>Sign in</h1>}
      <label className="ad-label" htmlFor="ad-email">Email</label>
      <input id="ad-email" className="ad-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label className="ad-label" htmlFor="ad-pass">Password</label>
      <input id="ad-pass" className="ad-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="ad-error" role="alert">{error}</p>}
      <button className="ad-btn ad-btn--primary ad-btn--block" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}

function LoginPage({ onDone, notConfigured }) {
  return (
    <main className="ad-login">
      <div className="ad-login__card">
        <p className="ad-brand">NOURHANE THABET<sup>®</sup> <span>Dashboard</span></p>
        {notConfigured ? (
          <div className="ad-alert ad-alert--warn" role="alert">
            The admin account is not set up yet. Run <code>npm run admin:password</code> and add <code>ADMIN_EMAIL</code> and <code>ADMIN_PASSWORD_HASH</code> to the server settings (see README).
          </div>
        ) : (
          <LoginForm onDone={onDone} />
        )}
        <a className="ad-link" href="/">← Back to the website</a>
      </div>
    </main>
  );
}

// ═════════════ Shell ═════════════
const NAV = [
  { to: '/admin', label: 'Overview' },
  { to: '/admin/projects', label: 'Projects' },
  { to: '/admin/texts', label: 'Page texts' },
  { to: '/admin/site', label: 'Website info & photos' },
  { group: 'Sections' },
  ...SECTION_PAGES.map((s) => ({ to: `/admin/sections/${s.key}`, label: s.label })),
  { group: 'Safety' },
  { to: '/admin/history', label: 'History' },
];

function SaveBar() {
  const { dirty, saving, save, discard, preview, draft } = useEditor();
  const confirm = useConfirm();
  const { path } = useRouter();
  if (!dirty) return null;
  const m = path.match(/^\/admin\/projects\/(\d+)$/);
  const proj = m && draft.projects[Number(m[1])];
  return (
    <div className="ad-savebar" role="region" aria-label="Unsaved changes">
      <span><b>Unsaved changes</b> — not visible on the website yet.</span>
      <div className="ad-row">
        <button type="button" className="ad-btn ad-btn--ghost ad-btn--light" onClick={async () => (await confirm({ title: 'Discard all unsaved changes?', body: 'Everything returns to the last saved version.', ok: 'Discard', danger: true })) && discard()} disabled={saving}>
          Discard
        </button>
        <button type="button" className="ad-btn ad-btn--ghost ad-btn--light" onClick={() => (proj ? preview(`/work/${proj.slug}`, proj.slug) : preview('/'))} disabled={saving}>Preview ↗</button>
        <button type="button" className="ad-btn ad-btn--pink" onClick={save} disabled={saving} aria-busy={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </div>
    </div>
  );
}

function Route({ path, status, email }) {
  const clean = path.replace(/\/+$/, '');
  if (clean === '/admin') return <Overview status={status} email={email} />;
  if (clean === '/admin/projects') return <Projects />;
  const pm = clean.match(/^\/admin\/projects\/(\d+)$/);
  if (pm) return <ProjectEdit index={Number(pm[1])} />;
  if (clean === '/admin/texts') return <Texts />;
  if (clean === '/admin/site') return <SiteInfo />;
  if (clean === '/admin/history') return <History />;
  const sm = clean.match(/^\/admin\/sections\/([a-zA-Z]+)$/);
  if (sm) return <SectionPage k={sm[1]} />;
  return <p className="ad-empty">Page not found. <Link to="/admin">Go to the overview</Link></p>;
}

function Dashboard({ session, onLogout, expired, onRelogin }) {
  const { path } = useRouter();
  const editor = useEditor();
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState(null);
  const [menu, setMenu] = useState(false);
  const mainRef = useRef(null);

  useEffect(() => {
    api('/api/admin/status').then((s) => {
      setStatus(s);
      window.__ntMaxUploadMb = s.maxUploadMb;
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
    if (editor.dirty && !(await confirm({ title: 'Log out without saving?', body: 'Your unsaved changes will be lost.', ok: 'Log out', danger: true }))) return;
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      /* the cookie is cleared server-side when possible; continue */
    }
    toast('You are logged out.');
    onLogout();
  };

  if (editor.loadError) {
    return (
      <main className="ad-login">
        <div className="ad-login__card">
          <p className="ad-error" role="alert">Could not load your content: {editor.loadError}</p>
          <button type="button" className="ad-btn ad-btn--primary" onClick={editor.load}>Try again</button>
        </div>
      </main>
    );
  }
  if (!editor.draft) return <div className="admin-loading" role="status">Loading your content…</div>;

  const current = (to) => (to === '/admin' ? path.replace(/\/+$/, '') === '/admin' : path.startsWith(to));

  return (
    <div className="ad-shell">
      <a className="skip-link" href="#ad-main">Skip to content</a>
      <aside className={`ad-side${menu ? ' is-open' : ''}`}>
        <div className="ad-side__top">
          <Link to="/admin" className="ad-brand">NOURHANE THABET<sup>®</sup> <span>Dashboard</span></Link>
          <button type="button" className="ad-menu-btn" aria-expanded={menu} aria-controls="ad-nav" onClick={() => setMenu((m) => !m)}>
            {menu ? 'Close' : 'Menu'}
          </button>
        </div>
        <nav id="ad-nav" className="ad-nav" aria-label="Dashboard">
          {NAV.map((n, i) =>
            n.group ? (
              <span key={i} className="ad-nav__group">{n.group}</span>
            ) : (
              <Link key={n.to} to={n.to} className="ad-nav__link" aria-current={current(n.to) ? 'page' : undefined}>
                {n.label}
              </Link>
            )
          )}
          <div className="ad-nav__foot">
            {editor.dirty && <span className="ad-dot" role="status">Unsaved changes</span>}
            <a className="ad-nav__link" href="/" target="_blank" rel="noreferrer">View website ↗</a>
            <button type="button" className="ad-nav__link ad-nav__logout" onClick={logout}>Log out</button>
          </div>
        </nav>
      </aside>
      <main id="ad-main" ref={mainRef} tabIndex={-1} className="ad-main">
        {editor.errors.length > 0 && (
          <div className="ad-alert ad-alert--error" role="alert">
            <strong>Not saved yet — please fix:</strong>
            <ul>{editor.errors.slice(0, 8).map((e, i) => <li key={i}>{e.message}</li>)}</ul>
          </div>
        )}
        <Route path={path} status={status} email={session.email} />
      </main>
      <SaveBar />

      {editor.conflict && (
        <Modal title="Content changed somewhere else" onClose={null}>
          <p className="ad-modal__body">The website content was saved from another window or device since you opened the dashboard. To avoid overwriting those changes, reload the latest version. (Your unsaved edits here will be discarded.)</p>
          <div className="ad-row ad-row--end">
            <button type="button" className="ad-btn ad-btn--primary" onClick={editor.load} data-autofocus>Reload latest version</button>
          </div>
        </Modal>
      )}
      {expired && (
        <Modal title="Please sign in again" onClose={null}>
          <p className="ad-modal__body">Your session has ended. Sign in to continue — your unsaved changes are kept.</p>
          <LoginForm compact onDone={onRelogin} />
        </Modal>
      )}
    </div>
  );
}

// ═════════════ Root ═════════════
export default function AdminApp() {
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
    document.title = 'Dashboard — Nourhane Thabet';
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

  let body;
  if (!session) body = <div className="admin-loading" role="status">Checking your session…</div>;
  else if (!session.authenticated)
    body = <LoginPage notConfigured={session.adminConfigured === false} onDone={(r) => setSession({ authenticated: true, email: r.email, expiresAt: r.expiresAt })} />;
  else
    body = (
      <EditorProvider>
        <Dashboard
          session={session}
          expired={expired}
          onRelogin={(r) => {
            setSession({ authenticated: true, email: r.email, expiresAt: r.expiresAt });
            setExpired(false);
          }}
          onLogout={() => setSession({ authenticated: false })}
        />
      </EditorProvider>
    );

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="admin">{body}</div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
