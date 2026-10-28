import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { Button } from '../components/ui.jsx';
import { useMeta } from '../hooks/motion.js';
import { useContent } from '../content/ContentProvider.jsx';
import { useT } from '../i18n/index.jsx';

export default function NotFound() {
  const { site } = useContent();
  const t = useT();
  useMeta(t('nf.title', { name: site.name }));
  return (
    <>
      <Header />
      <main id="main" className="notfound">
        <h1>404</h1>
        <p>{t('nf.text')}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <Button to="/" arrow>{t('nf.home')}</Button>
          <Button to="/work" variant="outline">{t('nf.work')}</Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
