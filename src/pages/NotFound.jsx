import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { Button } from '../components/ui.jsx';
import { useMeta } from '../hooks/motion.js';

export default function NotFound() {
  useMeta('Page not found — Nourhane Thabet');
  return (
    <>
      <Header />
      <main id="main" className="notfound">
        <h1>404</h1>
        <p>This page went beyond the visual — and got lost.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <Button to="/" arrow>BACK TO HOME</Button>
          <Button to="/work" variant="outline">SEE THE WORK</Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
