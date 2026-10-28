import { useContent } from '../content/ContentProvider.jsx';
import { Link } from '../router.jsx';
import { SplitHeading } from '../components/ui.jsx';
import { useT } from '../i18n/index.jsx';

export default function Expertise() {
  const { expertise, projects, text } = useContent();
  const t = useT();
  const getProject = (slug) => projects.find((p) => p.slug === slug);
  return (
    <section id="expertise" className="section" aria-labelledby="exp-title">
      <div className="container">
        <SplitHeading id="exp-title" className="h2 exp__title" title={text.expertise.title} em={text.expertise.titleEm} />
        <ul className="exp">
          {expertise.map((e) => (
            <li key={`${e.title}-${e.n}`} className="exp__row" data-reveal>
              <span className="exp__n">{e.n}</span>
              <div className="exp__main">
                <h3>{e.title}</h3>
                {e.proof.length > 0 && <p className="exp__proof">
                  <span>{t('expertise.evidence')}</span>
                  {e.proof.map((slug) => {
                    const p = getProject(slug);
                    return p ? (
                      <Link key={slug} to={`/work/${slug}`} className="chip chip--blue">
                        {p.title} ↗
                      </Link>
                    ) : null;
                  })}
                </p>}
              </div>
              <p className="exp__text">{e.text}</p>
              <div className="exp__peek only-desk" aria-hidden="true" style={{ background: e.bg }}>
                {e.image ? <img src={e.image} alt="" loading="lazy" /> : <span style={{ borderRadius: e.r, background: e.c }} />}
              </div>
              {e.image && <img className="exp__thumb only-mob" src={e.image} alt={e.title} loading="lazy" />}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
