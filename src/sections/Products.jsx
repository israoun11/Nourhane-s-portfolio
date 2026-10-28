import { useContent } from '../content/ContentProvider.jsx';
import { Link } from '../router.jsx';
import { SplitHeading } from '../components/ui.jsx';
import { useT } from '../i18n/index.jsx';

export default function Products() {
  const { products, text } = useContent();
  const t = useT();
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
              <div className="prod__art" aria-hidden={!p.image} style={{ background: p.bg }}>
                {p.image ? <img src={p.image} alt={p.t} loading="lazy" /> : <span style={{ boxShadow: `10px 10px 0 ${p.c}` }} />}
              </div>
              <span className="status status--soon">{t('status.soon')}</span>
              <h3>{p.t}</h3>
              <p>{p.d}</p>
              <Link to="/#contact" className="ulink prod__link">{t('products.notify')}</Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
