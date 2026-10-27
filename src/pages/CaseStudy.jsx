import { useRef } from 'react';
import Header from '../components/Header.jsx';
import { Link } from '../router.jsx';
import { defaultGallery } from '../data/layout.js';
import { useContent } from '../content/ContentProvider.jsx';
import { Media, orPlaceholder } from '../components/ui.jsx';
import { useMeta, useScrollVar } from '../hooks/motion.js';

const galleryLayout = [
  { flex: '2 1 560px', ratio: '16 / 10', bg: '#2E2E46', art: { width: '60%', left: '40%', top: '-10%', borderRadius: '50%', background: '#1534DD' } },
  { flex: '1 1 300px', ratio: '4 / 5', bg: '#F174AB', art: { width: '50%', left: '30%', top: '20%', background: '#FFF9F5' } },
  { flex: '1 1 300px', ratio: '1 / 1', bg: '#B9E8E5', art: { width: '56%', left: '10%', top: '30%', borderRadius: '50%', background: '#1534DD' } },
  { flex: '1 1 300px', ratio: '1 / 1', bg: '#EFE6DC', art: { width: '40%', left: '50%', top: '10%', borderRadius: '16px', background: '#202033' } },
  { flex: '1 1 300px', ratio: '1 / 1', bg: '#1534DD', art: { width: '44%', left: '20%', top: '36%', borderRadius: '50%', background: '#F174AB' } },
  { flex: '1 1 100%', ratio: '21 / 8', bg: '#2E2E46', art: { width: '24%', left: '66%', top: '-20%', borderRadius: '50%', background: '#F174AB' } },
];

const steps = [
  { k: '01 — UNDERSTAND', ph: '[Research, audience and market insights gathered for this project.]', cls: 'step--line', kc: 'c-pink' },
  { k: '02 — STRATEGIZE', ph: '[Positioning, channels and objectives that were chosen — and why.]', cls: 'step--blue' },
  { k: '03 — CREATE', ph: '[Campaigns, content, visuals and digital work produced.]', cls: 'step--pink' },
  { k: '04 — LEARN & OPTIMIZE', ph: '[What was measured, tested and refined along the way.]', cls: 'step--line', kc: 'c-aqua' },
];

export default function CaseStudy({ project }) {
  const { projects, site } = useContent();
  const p = project;
  useMeta(`${p.title} — Case study — ${site.name}`, p.summary);
  const coverRef = useRef(null);
  useScrollVar(coverRef, { mode: 'cover', from: 0.05, to: 0.45, name: '--u' });

  const idx = projects.findIndex((x) => x.slug === p.slug);
  const next = projects[(idx + 1) % projects.length];
  const gallery = (p.gallery && p.gallery.length ? p.gallery : defaultGallery).slice(0, 6);
  const [t1, ...t2] = p.title.split(' / ');
  const hasFeedback = !!(p.feedback && p.feedback.quote);

  return (
    <>
      <Header progress />
      <main id="main" className="casepage">
        <section className="cs-hero" aria-labelledby="cs-title">
          <div className="cs-wrap">
            <p className="cs-crumb in-1">
              <Link className="ulink" to="/work">PORTFOLIO</Link> / <span>CASE {p.n}</span>
            </p>
            <h1 id="cs-title" className="cs-title">
              <span className="line"><span style={{ animationDelay: '.1s' }}>{t1} {t2.length > 0 && <em>/ {t2.join(' / ')}</em>}</span></span>
            </h1>
            <div className="cs-intro in-2">
              <p className="cs-summary">{p.summary}</p>
              <dl className="cs-facts">
                <div><dt>CLIENT</dt><dd>{p.title}</dd></div>
                <div><dt>YEAR</dt><dd>{orPlaceholder(p.year, '[Year]')}</dd></div>
                <div><dt>MY ROLE</dt><dd>{orPlaceholder(p.role, '[Role — to verify]')}</dd></div>
                <div><dt>DELIVERABLES</dt><dd>{orPlaceholder(p.deliverables, '[Deliverables]')}</dd></div>
                <div className="cs-facts__wide">
                  <dt>DISCIPLINES</dt>
                  <dd><ul className="chips">{p.tags.map((t) => <li key={t} className="chip chip--line">{t}</li>)}</ul></dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section className="cs-cover-wrap" aria-label="Cover image">
          <div ref={coverRef} className="cs-cover">
            <Media src={p.cover} alt={`${p.title} — cover`} bg={p.bg} art={p.art} mono={p.mono} monoColor="#F174AB" className="cs-cover__media" />
            {!p.cover && <span className="cs-cover__cap">Cover image placeholder — hero visual of the project (2400 × 1200)</span>}
          </div>
        </section>

        <section className="cs-section" aria-labelledby="ov-title">
          <div className="cs-wrap cs-overview">
            <h2 id="ov-title" className="h2" data-reveal>The <em>challenge.</em></h2>
            <div className="cs-overview__body">
              <div data-reveal>
                <h3 className="cs-k">CONTEXT</h3>
                <p>{orPlaceholder(p.context, '[Who the client is, the market they operate in, and where things stood before the project. 2–4 sentences.]')}</p>
              </div>
              <div data-reveal style={{ '--d': '.1s' }}>
                <h3 className="cs-k">THE PROBLEM</h3>
                <p>{orPlaceholder(p.problem || p.challenge, '[The business problem to solve — not the deliverable. What needed to change, for whom, and why it mattered.]')}</p>
              </div>
              <div className="cs-role" data-reveal>
                <h3 className="cs-k">MY ROLE</h3>
                <p>{orPlaceholder(p.solution || p.role, '[What Nourhane owned personally — strategy, content, ads, design — and who she worked with.]')}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="cs-section cs-approach on-dark" aria-labelledby="pr-title">
          <div className="cs-wrap">
            <p className="pill-eyebrow">THE APPROACH</p>
            <h2 id="pr-title" className="h2 cs-approach__title" data-reveal>How it came <em className="c-pink">together.</em></h2>
            <ol className="cs-steps">
              {steps.map((s, i) => (
                <li key={s.k} className={`step ${s.cls}`} data-reveal style={{ '--d': `${i * 0.1}s` }}>
                  <span className={s.kc}>{s.k}</span>
                  <p>{orPlaceholder(p.approach && p.approach[i], s.ph)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="cs-section" aria-labelledby="gal-title">
          <div className="cs-wrap">
            <h2 id="gal-title" className="h2 cs-gal__title" data-reveal>The <em>work.</em></h2>
            <div className="cs-gallery">
              {gallery.map((g, i) => {
                const l = galleryLayout[i % galleryLayout.length];
                return (
                  <figure key={i} className="cs-fig" data-reveal style={{ flex: l.flex, '--d': `${(i % 3) * 0.08}s` }}>
                    <Media src={g.src} alt={g.label} bg={l.bg} art={[l.art]} ratio={l.ratio} className="cs-fig__media" reveal parallax />
                    {g.src ? (
                      <figcaption className="cs-fig__cap cs-fig__cap--real">{g.label}</figcaption>
                    ) : (
                      <figcaption className="cs-fig__cap"><strong>{g.label}</strong> — {g.hint}</figcaption>
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
              <h2 id="res-title" className="h2" data-reveal>The <em>outcome.</em></h2>
              <p className="cs-results__note">Only verified figures go here. Leave a slot empty rather than estimating.</p>
            </div>
            <div className="cs-metrics">
              {(p.results.length ? p.results : [{}, {}, {}]).map((r, i) => (
                <div key={i} className="cs-metric" data-reveal style={{ '--d': `${i * 0.1}s` }}>
                  <p className="cs-metric__v">{r.value || '[—]'}</p>
                  <p className="cs-metric__l">{r.label || `[Metric ${i + 1} — a verified result]`}</p>
                </div>
              ))}
            </div>
            <figure className={`cs-quote${hasFeedback ? ' is-real' : ''}`} data-reveal>
              <blockquote>{hasFeedback ? p.feedback.quote : '[Client feedback on this project — only if verified and approved.]'}</blockquote>
              <figcaption>{hasFeedback ? [p.feedback.name, p.feedback.role].filter(Boolean).join(' · ') : '[Client name · Role]'}</figcaption>
            </figure>
          </div>
        </section>

        <section className="cs-section cs-learning" aria-label="Key learning">
          <p className="eyebrow">WHAT I TOOK AWAY</p>
          <p className="cs-learning__q" data-reveal>“{orPlaceholder(p.learning, "[A key learning from this project, in Nourhane's own words.]")}”</p>
        </section>

        <Link to={`/work/${next.slug}`} className="cs-next" data-cursor="Next">
          <div className="cs-wrap cs-next__inner">
            <div>
              <span className="cs-next__k">NEXT PROJECT · {next.n}</span>
              <p className="cs-next__t">{next.title}</p>
            </div>
            <span className="cs-next__ar" aria-hidden="true">↗</span>
          </div>
        </Link>
      </main>
      <footer className="footer--slim on-dark">
        <span>© {new Date().getFullYear()} {site.name}</span>
        <span className="footer__legal">
          <Link className="ulink" to="/work">← All projects</Link>
          <Link className="ulink" to="/">Home</Link>
        </span>
      </footer>
    </>
  );
}
