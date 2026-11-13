import { useRef, useState } from 'react';
import Header from '../components/Header.jsx';
import Lightbox from '../components/Lightbox.jsx';
import WorkSlider from '../components/WorkSlider.jsx';
import { Link } from '../router.jsx';
import { useContent } from '../content/ContentProvider.jsx';
import { Media, orPlaceholder } from '../components/ui.jsx';
import { useMeta, useScrollVar } from '../hooks/motion.js';
import { useT } from '../i18n/index.jsx';

const steps = [
  { k: 'cs.step1', ph: 'cs.step1Ph', cls: 'step--line', kc: 'c-pink', bg: '#2E2E46', art: { width: '46%', left: '50%', top: '-20%', borderRadius: '50%', background: '#F174AB' } },
  { k: 'cs.step2', ph: 'cs.step2Ph', cls: 'step--blue', bg: '#2B49E6', art: { width: '38%', left: '12%', top: '30%', background: '#B9E8E5' } },
  { k: 'cs.step3', ph: 'cs.step3Ph', cls: 'step--pink', bg: '#F48BB9', art: { width: '44%', left: '40%', top: '18%', borderRadius: '50%', background: '#FFF9F5' } },
  { k: 'cs.step4', ph: 'cs.step4Ph', cls: 'step--line', kc: 'c-aqua', bg: '#2E2E46', art: { width: '30%', left: '58%', top: '26%', borderRadius: '12px', background: '#B9E8E5' } },
];

export default function CaseStudy({ project }) {
  const { projects, site } = useContent();
  const t = useT();
  const p = project;
  useMeta(p.seoTitle || t('cs.title', { title: p.title, name: site.name }), p.seoDescription || p.summary);
  const coverRef = useRef(null);
  useScrollVar(coverRef, { mode: 'cover', from: 0.05, to: 0.45, name: '--u' });
  const [viewer, setViewer] = useState(-1);

  const idx = projects.findIndex((x) => x.slug === p.slug);
  const next = projects[(idx + 1) % projects.length];
  // “The work” slider: this project's own uploaded images, in the dashboard order.
  const real = (p.gallery || []).filter((g) => g.src);
  // “The outcome”: this project's verified figures, each with its own image; client feedback only when real.
  const results = (p.results || []).filter((r) => r.value || r.label);
  const isPh = (v) => /^\s*\[.*\]\s*$/.test(v || '');
  const [t1, ...t2] = p.title.split(' / ');
  const hasFeedback = !!(p.feedback && p.feedback.quote && !isPh(p.feedback.quote));
  // Extra case-study parts: shown only once they are filled in (nothing is invented).
  const plan = [
    ['cs.objective', p.objective],
    ['cs.strategy', p.strategy],
    ['cs.execution', p.execution],
  ].filter(([, v]) => v && v.trim());
  const extLinks = [
    p.url && { label: t('cs.visit'), url: p.url },
    p.sourceUrl && { label: t('cs.source'), url: p.sourceUrl },
    ...(p.links || []).filter((l) => l.url),
  ].filter(Boolean);
  const tools = p.toolsUsed || [];
  const related = (p.related || []).map((s) => projects.find((x) => x.slug === s)).filter(Boolean);

  return (
    <>
      <Header progress />
      <main id="main" className="casepage">
        <section className="cs-hero" aria-labelledby="cs-title">
          <div className="cs-wrap">
            <p className="cs-crumb in-1">
              <Link className="ulink" to="/work">{t('cs.portfolio')}</Link> / <span>{t('cs.case', { n: p.n })}</span>
            </p>
            <h1 id="cs-title" className="cs-title">
              <span className="line"><span style={{ animationDelay: '.1s' }}>{t1} {t2.length > 0 && <em>/ {t2.join(' / ')}</em>}</span></span>
            </h1>
            <div className="cs-intro in-2">
              <p className="cs-summary">{p.summary}</p>
              <dl className="cs-facts">
                <div><dt>{t('cs.client')}</dt><dd>{p.client || p.title}</dd></div>
                <div><dt>{t('cs.year')}</dt><dd>{orPlaceholder(p.year, t('cs.yearPh'))}</dd></div>
                <div><dt>{t('cs.role')}</dt><dd>{orPlaceholder(p.role, t('cs.rolePh'))}</dd></div>
                <div><dt>{t('cs.deliverables')}</dt><dd>{orPlaceholder(p.deliverables, t('cs.deliverablesPh'))}</dd></div>
                <div className="cs-facts__wide">
                  <dt>{t('cs.disciplines')}</dt>
                  <dd><ul className="chips">{p.tags.map((tag) => <li key={tag} className="chip chip--line">{tag}</li>)}</ul></dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section className="cs-cover-wrap" aria-label={t('cs.cover')}>
          <div ref={coverRef} className="cs-cover">
            <Media src={p.cover} alt={p.coverAlt || t('cs.coverAlt', { title: p.title })} bg={p.bg} art={p.art} mono={p.mono} monoColor="#F174AB" className="cs-cover__media" />
            {!p.cover && <span className="cs-cover__cap">{t('cs.coverPh')}</span>}
          </div>
        </section>

        <section className="cs-section" aria-labelledby="ov-title">
          <div className="cs-wrap cs-overview">
            <h2 id="ov-title" className="h2" data-reveal>{t('cs.challengeA')} <em>{t('cs.challengeB')}</em></h2>
            <div className="cs-overview__body">
              <div data-reveal>
                <h3 className="cs-k">{t('cs.context')}</h3>
                <p>{orPlaceholder(p.context, t('cs.contextPh'))}</p>
              </div>
              <div data-reveal style={{ '--d': '.1s' }}>
                <h3 className="cs-k">{t('cs.problem')}</h3>
                <p>{orPlaceholder(p.problem || p.challenge, t('cs.problemPh'))}</p>
              </div>
              <div className="cs-role" data-reveal>
                <h3 className="cs-k">{t('cs.myRole')}</h3>
                <p>{orPlaceholder(p.solution || p.role, t('cs.myRolePh'))}</p>
              </div>
            </div>
          </div>
        </section>

        {plan.length > 0 && (
          <section className="cs-section cs-plan" aria-label={t('cs.planLabel')}>
            <div className="cs-wrap cs-plan__grid">
              {plan.map(([k, v], i) => (
                <div key={k} className="cs-plan__item" data-reveal style={{ '--d': `${i * 0.08}s` }}>
                  <h3 className="cs-k">{t(k)}</h3>
                  <p>{v}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="cs-section cs-approach on-dark" aria-labelledby="pr-title">
          <div className="cs-wrap">
            <p className="pill-eyebrow">{t('cs.approach')}</p>
            <h2 id="pr-title" className="h2 cs-approach__title" data-reveal>{t('cs.approachA')} <em className="c-pink">{t('cs.approachB')}</em></h2>
            <ol className="cs-steps">
              {steps.map((s, i) => {
                const a = (p.approach && p.approach[i]) || {};
                return (
                  <li key={s.k} className={`step ${s.cls}`} data-reveal style={{ '--d': `${i * 0.1}s` }}>
                    <Media
                      className="step__media"
                      src={a.image}
                      alt={t('cs.stepImageAlt', { step: t(s.k), title: p.title })}
                      bg={s.bg}
                      art={[s.art]}
                      ratio="16 / 10"
                      label={a.image ? undefined : t('cs.stepImagePh')}
                    />
                    <span className={s.kc}>{t(s.k)}</span>
                    <p>{orPlaceholder(a.text, t(s.ph))}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {real.length > 0 && (
          <section className="cs-section cs-work" aria-labelledby="gal-title">
            <div className="cs-wrap">
              <div className="cs-gal__head">
                <h2 id="gal-title" className="h2 cs-gal__title" data-reveal>{t('cs.workA')} <em>{t('cs.workB')}</em></h2>
                <p className="cs-gal__count">{t('cs.galleryCount', { n: real.length })}</p>
              </div>
              <WorkSlider images={real} title={p.title} onOpen={setViewer} />
            </div>
          </section>
        )}

        {(results.length > 0 || hasFeedback) && (
          <section className="cs-section cs-outcome" aria-labelledby="res-title">
            <div className="cs-wrap">
              <header className="cs-outcome__head">
                <h2 id="res-title" className="cs-outcome__title" data-reveal>{t('cs.outcomeA')} {t('cs.outcomeB').replace(/\.$/, '')}</h2>
                {p.resultsIntro && <p className="cs-outcome__intro">{p.resultsIntro}</p>}
              </header>
              {results.length > 0 && (
                <ul className={`cs-outcome__grid n${Math.min(results.length, 6)}`}>
                  {results.map((r, i) => (
                    <li key={i} className="cs-out" data-reveal style={{ '--d': `${(i % 4) * 0.08}s` }}>
                      <p className="cs-out__v">{r.value}</p>
                      {r.label && <p className="cs-out__l">{r.label}</p>}
                      <div className={`cs-out__img${r.image ? '' : ' is-empty'}`}>
                        {r.image ? (
                          <img src={r.image} alt={r.imageAlt || [r.value, r.label].filter(Boolean).join(' — ')} loading="lazy" decoding="async" />
                        ) : (
                          <span className="cs-out__art" aria-hidden="true"><i /><b /></span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {hasFeedback && (
                <figure className="cs-quote is-real" data-reveal>
                  <blockquote>{p.feedback.quote}</blockquote>
                  {(p.feedback.name || p.feedback.role) && <figcaption>{[p.feedback.name, p.feedback.role].filter(Boolean).join(' · ')}</figcaption>}
                </figure>
              )}
            </div>
          </section>
        )}

        {(tools.length > 0 || extLinks.length > 0) && (
          <section className="cs-section cs-tools" aria-labelledby="tl-title">
            <div className="cs-wrap cs-tools__grid">
              {tools.length > 0 && (
                <div>
                  <h2 id="tl-title" className="cs-k">{t('cs.tools')}</h2>
                  <ul className="chips">{tools.map((x) => <li key={x} className="chip chip--line">{x}</li>)}</ul>
                </div>
              )}
              {extLinks.length > 0 && (
                <div>
                  <h2 className="cs-k" id={tools.length ? undefined : 'tl-title'}>{t('cs.links')}</h2>
                  <ul className="cs-links">
                    {extLinks.map((l) => (
                      <li key={l.url}>
                        <a className="ulink" href={l.url} target={/^https?:/.test(l.url) ? '_blank' : undefined} rel="noreferrer">{l.label} <span aria-hidden="true">↗</span></a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="cs-section cs-related" aria-labelledby="rel-title">
            <div className="cs-wrap">
              <h2 id="rel-title" className="h2" data-reveal>{t('cs.relatedA')} <em>{t('cs.relatedB')}</em></h2>
              <div className="cs-related__grid">
                {related.map((r) => (
                  <Link key={r.slug} to={`/work/${r.slug}`} className="card work-card" data-cursor={t('cursor.view')}>
                    <Media src={r.cover} alt={r.coverAlt || t('work.coverAlt', { title: r.title })} bg={r.bg} art={r.art} ratio="4 / 3" label={t('work.imagePh')} framed />
                    <span className="meta">{t('cs.case', { n: r.n })}</span>
                    <h3>{r.title} <span className="ar" aria-hidden="true">↗</span></h3>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <Link to={`/work/${next.slug}`} className="cs-next" data-cursor={t('cs.nextCursor')}>
          <div className="cs-wrap cs-next__inner">
            <div>
              <span className="cs-next__k">{t('cs.next', { n: next.n })}</span>
              <p className="cs-next__t">{next.title}</p>
            </div>
            <span className="cs-next__ar ar" aria-hidden="true">↗</span>
          </div>
        </Link>
      </main>
      <footer className="footer--slim on-dark">
        <span>© {new Date().getFullYear()} {site.name}</span>
        <span className="footer__legal">
          <Link className="ulink" to="/work">{t('cs.allProjects')}</Link>
          <Link className="ulink" to="/">{t('cs.home')}</Link>
        </span>
      </footer>
      {viewer >= 0 && (
        <Lightbox
          start={viewer}
          onClose={() => setViewer(-1)}
          images={real.map((g) => ({ src: g.src, alt: g.label, caption: g.label }))}
        />
      )}
    </>
  );
}
