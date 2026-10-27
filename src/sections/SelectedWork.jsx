import { useContent } from '../content/ContentProvider.jsx';
import { homeGridLayout } from '../data/layout.js';
import { Link } from '../router.jsx';
import { Button, Media, SplitHeading, orPlaceholder } from '../components/ui.jsx';

export default function SelectedWork() {
  const { projects, text } = useContent();
  const t = text.work;
  const [featured, ...rest] = projects;
  const meta = (p) => `${p.n} · ${orPlaceholder(p.industry, '[INDUSTRY]').toUpperCase()} · ${orPlaceholder(p.year, '[YEAR]')}`;

  return (
    <section id="work" className="section" aria-labelledby="work-title">
      <div className="container">
        <div className="section-head">
          <SplitHeading id="work-title" title={t.title} em={t.titleEm} />
          <p data-reveal>{t.intro}</p>
        </div>

        {featured && (
        <Link to={`/work/${featured.slug}`} className="card feature" data-cursor="View" data-reveal>
          <Media
            className="feature__media"
            src={featured.cover}
            alt={`${featured.title} — cover`}
            bg={featured.bg}
            art={featured.art}
            mono={featured.mono}
            monoColor="#FFF9F5"
            label="FEATURED · IMAGE PLACEHOLDER"
            reveal
            parallax
          />
          <div className="feature__body">
            <span className="meta">{meta(featured)}</span>
            <h3>{featured.title}</h3>
            <ul className="chips">
              {featured.tags.map((t) => <li key={t} className="chip chip--aqua">{t}</li>)}
            </ul>
            <dl className="feature__dl">
              <div><dt>MY ROLE</dt><dd>{orPlaceholder(featured.role, '[To verify]')}</dd></div>
              <div><dt>CHALLENGE</dt><dd>{orPlaceholder(featured.challenge, '[One line]')}</dd></div>
            </dl>
            <span className="feature__cta">READ THE CASE STUDY <span className="ar" aria-hidden="true">↗</span></span>
          </div>
        </Link>
        )}

        <div className="work-grid">
          {rest.map((p, i) => {
            const l = homeGridLayout[i % homeGridLayout.length];
            return (
              <Link
                key={p.slug}
                to={`/work/${p.slug}`}
                className="card work-card"
                data-cursor="View"
                data-reveal
                style={{ flex: l.flex, marginTop: l.offset, '--d': `${(i % 2) * 0.1}s` }}
              >
                <Media src={p.cover} alt={`${p.title} — cover`} bg={p.bg} art={p.art} ratio={l.ratio} label="IMAGE PLACEHOLDER" reveal parallax />
                <span className="meta">{meta(p)}</span>
                <h3>
                  {p.title} <span className="ar" aria-hidden="true">↗</span>
                </h3>
                <p>{p.tags.join(' · ')}</p>
              </Link>
            );
          })}
        </div>

        <div className="work-foot">
          {t.note && <p>{t.note}</p>}
          <Button to="/work" variant="ink" size="md" arrow magnetic>{t.cta}</Button>
        </div>
      </div>
    </section>
  );
}
