import { useContent } from '../content/ContentProvider.jsx';
import { PROJECT_RATIO } from '../data/layout.js';
import { Link } from '../router.jsx';
import { Button, Media, SplitHeading, orPlaceholder } from '../components/ui.jsx';
import { useT } from '../i18n/index.jsx';

export default function SelectedWork() {
  const { projects, text } = useContent();
  const t = text.work;
  const tr = useT();
  const meta = (p) => `${p.n} · ${orPlaceholder(p.industry, tr('work.industryPh')).toUpperCase()} · ${orPlaceholder(p.year, tr('work.yearPh'))}`;

  return (
    <section id="work" className="section" aria-labelledby="work-title">
      <div className="container">
        <div className="section-head">
          <SplitHeading id="work-title" title={t.title} em={t.titleEm} />
          <p data-reveal>{t.intro}</p>
        </div>

        {/* All projects: same card, same image frame and size. */}
        <div className="work-grid">
          {projects.map((p, i) => (
            <Link
              key={p.slug}
              to={`/work/${p.slug}`}
              className="card work-card"
              data-cursor={tr('cursor.view')}
              data-reveal
              style={{ '--d': `${(i % 3) * 0.08}s` }}
            >
              <Media className="work-card__media" src={p.cover} alt={p.coverAlt || tr('work.coverAlt', { title: p.title })} bg={p.bg} art={p.art} ratio={PROJECT_RATIO} label={tr('work.imagePh')} reveal />
              <span className="meta">{meta(p)}</span>
              <h3>
                {p.title} <span className="ar" aria-hidden="true">↗</span>
              </h3>
              <p>{p.tags.join(' · ')}</p>
            </Link>
          ))}
        </div>

        <div className="work-foot">
          {t.note && <p>{t.note}</p>}
          <Button to="/work" variant="ink" size="md" arrow magnetic>{t.cta}</Button>
        </div>
      </div>
    </section>
  );
}
