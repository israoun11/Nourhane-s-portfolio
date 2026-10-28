import { useRef, useState } from 'react';
import Header from '../components/Header.jsx';
import Lightbox from '../components/Lightbox.jsx';
import { Link } from '../router.jsx';
import { defaultGalleryKeys } from '../data/layout.js';
import { useContent } from '../content/ContentProvider.jsx';
import { Media, orPlaceholder } from '../components/ui.jsx';
import { useMeta, useScrollVar } from '../hooks/motion.js';
import { useT } from '../i18n/index.jsx';

// Gallery rhythm: wide, tall, squares… repeats for any number of images.
const galleryLayout = [
  { flex: '2 1 560px', ratio: '16 / 10', bg: '#2E2E46', art: { width: '60%', left: '40%', top: '-10%', borderRadius: '50%', background: '#1534DD' } },
  { flex: '1 1 300px', ratio: '4 / 5', bg: '#F174AB', art: { width: '50%', left: '30%', top: '20%', background: '#FFF9F5' } },
  { flex: '1 1 300px', ratio: '1 / 1', bg: '#B9E8E5', art: { width: '56%', left: '10%', top: '30%', borderRadius: '50%', background: '#1534DD' } },
  { flex: '1 1 300px', ratio: '1 / 1', bg: '#EFE6DC', art: { width: '40%', left: '50%', top: '10%', borderRadius: '16px', background: '#202033' } },
  { flex: '1 1 300px', ratio: '1 / 1', bg: '#1534DD', art: { width: '44%', left: '20%', top: '36%', borderRadius: '50%', background: '#F174AB' } },
  { flex: '1 1 100%', ratio: '21 / 8', bg: '#2E2E46', art: { width: '24%', left: '66%', top: '-20%', borderRadius: '50%', background: '#F174AB' } },
];

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
  useMeta(t('cs.title', { title: p.title, name: site.name }), p.summary);
  const coverRef = useRef(null);
  useScrollVar(coverRef, { mode: 'cover', from: 0.05, to: 0.45, name: '--u' });
  const [viewer, setViewer] = useState(-1);

  const idx = projects.findIndex((x) => x.slug === p.slug);
  const next = projects[(idx + 1) % projects.length];
  const own = (p.gallery || []).filter((g) => g.src || g.label || g.hint);
  // No images yet → clean frames that show what will be added.
  const gallery = own.length ? own : defaultGalleryKeys.map((k) => ({ label: t(`gal.${k}`), hint: t(`gal.${k}h`), src: '' }));
  const real = gallery.filter((g) => g.src);
  const [t1, ...t2] = p.title.split(' / ');
  const hasFeedback = !!(p.feedback && p.feedback.quote);

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
                <div><dt>{t('cs.client')}</dt><dd>{p.title}</dd></div>
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
            <Media src={p.cover} alt={t('cs.coverAlt', { title: p.title })} bg={p.bg} art={p.art} mono={p.mono} monoColor="#F174AB" className="cs-cover__media" />
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

        <section className="cs-section" aria-labelledby="gal-title">
          <div className="cs-wrap">
            <div className="cs-gal__head">
              <h2 id="gal-title" className="h2 cs-gal__title" data-reveal>{t('cs.workA')} <em>{t('cs.workB')}</em></h2>
              {real.length > 0 ? <p className="cs-gal__count">{t('cs.galleryCount', { n: real.length })}</p> : <p className="cs-gal__note">{t('cs.galleryEmpty')}</p>}
            </div>
            <div className="cs-gallery">
              {gallery.map((g, i) => {
                const l = galleryLayout[i % galleryLayout.length];
                const media = <Media src={g.src} alt={g.label} bg={l.bg} art={[l.art]} ratio={l.ratio} className="cs-fig__media" reveal parallax />;
                return (
                  <figure key={`${i}-${g.src}`} className={`cs-fig${g.src ? ' has-img' : ''}`} data-reveal style={{ flex: l.flex, '--d': `${(i % 3) * 0.08}s` }}>
                    {g.src ? (
                      <button type="button" className="cs-fig__btn" onClick={() => setViewer(real.indexOf(g))} aria-label={t('cs.open', { label: g.label || String(i + 1) })} data-cursor={t("cursor.view")}>
                        {media}
                      </button>
                    ) : (
                      media
                    )}
                    {g.src ? (
                      g.label && <figcaption className="cs-fig__cap cs-fig__cap--real">{g.label}</figcaption>
                    ) : (
                      <figcaption className="cs-fig__cap"><strong>{g.label}</strong>{g.hint ? ` — ${g.hint}` : ''}</figcaption>
                    )}
                  </figure>
                );
              })}
            </div>
          </div>
        </section>

        <section className="cs-section cs-results" aria-labelledby="res-title">
          <div className="cs-wrap">
            <div className="section-head">
              <h2 id="res-title" className="h2" data-reveal>{t('cs.outcomeA')} <em>{t('cs.outcomeB')}</em></h2>
              <p className="cs-results__note">{t('cs.resultsNote')}</p>
            </div>
            <div className="cs-metrics">
              {(p.results.length ? p.results : [{}, {}, {}]).map((r, i) => (
                <div key={i} className="cs-metric" data-reveal style={{ '--d': `${i * 0.1}s` }}>
                  <p className="cs-metric__v">{r.value || '[—]'}</p>
                  <p className="cs-metric__l">{r.label || t('cs.metricPh', { n: i + 1 })}</p>
                </div>
              ))}
            </div>
            <figure className={`cs-quote${hasFeedback ? ' is-real' : ''}`} data-reveal>
              <blockquote>{hasFeedback ? p.feedback.quote : t('cs.quotePh')}</blockquote>
              <figcaption>{hasFeedback ? [p.feedback.name, p.feedback.role].filter(Boolean).join(' · ') : t('cs.quoteNamePh')}</figcaption>
            </figure>
          </div>
        </section>

        <section className="cs-section cs-learning" aria-label={t('cs.learning')}>
          <p className="eyebrow">{t('cs.takeaway')}</p>
          <p className="cs-learning__q" data-reveal>“{orPlaceholder(p.learning, t('cs.learningPh'))}”</p>
        </section>

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
