import { Suspense, lazy, useEffect } from 'react';
import { scrollToHash, useRouter } from './router.jsx';
import { exitPreview, useContent, useIsPreview } from './content/ContentProvider.jsx';
import Home from './pages/Home.jsx';
import Work from './pages/Work.jsx';
import CaseStudy from './pages/CaseStudy.jsx';
import NotFound from './pages/NotFound.jsx';
import RevealObserver from './components/RevealObserver.jsx';
import ViewCursor from './components/ViewCursor.jsx';
import { useT } from './i18n/index.jsx';

// The dashboard is loaded only when someone opens /admin — visitors never download it.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

function PublicPage({ path }) {
  const { projects } = useContent();
  const clean = path.replace(/\/+$/, '') || '/';
  if (clean === '/') return <Home />;
  if (clean === '/work') return <Work />;
  const m = clean.match(/^\/work\/([^/]+)$/);
  if (m) {
    const project = projects.find((p) => p.slug === decodeURIComponent(m[1]));
    return project ? <CaseStudy key={project.slug} project={project} /> : <NotFound />;
  }
  return <NotFound />;
}

function PreviewBar() {
  const t = useT();
  return (
    <div className="preview-bar" role="status">
      <span><strong>{t('app.preview')}</strong> — {t('app.previewText')}</span>
      <button type="button" onClick={exitPreview}>{t('app.closePreview')}</button>
    </div>
  );
}

export default function App() {
  const { path } = useRouter();
  const preview = useIsPreview();
  const t = useT();
  const isAdmin = path === '/admin' || path.startsWith('/admin/');

  // On page change: jump to the #section if there is one, otherwise to the top.
  useEffect(() => {
    if (isAdmin) return;
    const hash = window.location.hash;
    if (hash) {
      requestAnimationFrame(() => {
        if (!scrollToHash(hash, true)) window.scrollTo({ top: 0, behavior: 'instant' });
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [path, isAdmin]);

  if (isAdmin) {
    return (
      <Suspense fallback={<div className="admin-loading" role="status">{t('app.loadingAdmin')}</div>}>
        <AdminApp />
      </Suspense>
    );
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main">{t('app.skip')}</a>
      <RevealObserver />
      <ViewCursor />
      {preview && <PreviewBar />}
      <div key={path} className="page">
        <PublicPage path={path} />
      </div>
    </div>
  );
}
