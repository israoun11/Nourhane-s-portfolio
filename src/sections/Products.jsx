import { useContent } from '../content/ContentProvider.jsx';
import { Link } from '../router.jsx';
import { SplitHeading } from '../components/ui.jsx';

export default function Products() {
  const { products, text } = useContent();
  if (!products.length) return null;
  return (
    <section id="products" className="section" aria-labelledby="prod-title">
      <div className="container">
        <div className="section-head">
          <SplitHeading id="prod-title" title={text.products.title} em={text.products.titleEm} />
          <p className="prod__note" data-reveal>{text.products.note}</p>
        </div>
        <div className="prod">
          {products.map((p, i) => (
            <article key={`${p.t}-${i}`} className="prod__card" data-reveal style={{ '--d': `${i * 0.07}s` }}>
              <div className="prod__art" aria-hidden="true" style={{ background: p.bg }}>
                <span style={{ boxShadow: `10px 10px 0 ${p.c}` }} />
              </div>
              <span className="status status--soon">COMING SOON</span>
              <h3>{p.t}</h3>
              <p>{p.d}</p>
              <Link to="/#contact" className="ulink prod__link">Get notified ↗</Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
