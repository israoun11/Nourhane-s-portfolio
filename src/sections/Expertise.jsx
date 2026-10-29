import { useState } from 'react';
import { useContent } from '../content/ContentProvider.jsx';
import { Link } from '../router.jsx';
import { SplitHeading } from '../components/ui.jsx';
import { useT } from '../i18n/index.jsx';

export default function Expertise() {
  const { expertise, projects, text } = useContent();
  const t = useT();
  const getProject = (slug) => projects.find((p) => p.slug === slug);
  // touch screens have no hover: a tap on a discipline shows (or hides) its card
  const [open, setOpen] = useState(-1);
  return (
    <section id="expertise" className="section" aria-labelledby="exp-title">
      <div className="container">
        <SplitHeading id="exp-title" className="h2 exp__title" title={text.expertise.title} em={text.expertise.titleEm} />
        <ul className="exp">
          {expertise.map((e, i) => (
            <li
              key={`${e.title}-${e.n}`}
              className={`exp__row${open === i ? ' is-on' : ''}`}
              data-reveal
              onClick={(ev) => !ev.target.closest('a') && setOpen(open === i ? -1 : i)}
            >
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
              <p className="exp__text">
                {e.text}
                {e.link && (
                  <>
                    {' '}
                    <Link to={e.link} className="exp__link" {...(/^https?:/.test(e.link) ? { target: '_blank', rel: 'noreferrer' } : {})}>
                      {e.linkLabel || t('expertise.learnMore')} ↗
                    </Link>
                  </>
                )}
              </p>
              {/* the coloured card stays; the discipline image sits inside its circle / shape */}
              <div className="exp__peek" aria-hidden="true" style={{ background: e.bg }}>
                <span className={e.image ? 'has-img' : undefined} style={{ borderRadius: e.r, background: e.c }}>
                  {e.image && <img src={e.image} alt="" loading="lazy" />}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
