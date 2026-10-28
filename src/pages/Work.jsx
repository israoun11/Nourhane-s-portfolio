import { useEffect, useRef, useState } from 'react';
import Header from '../components/Header.jsx';
import { Link } from '../router.jsx';
import { filters } from '../data/layout.js';
import { useContent } from '../content/ContentProvider.jsx';
import { Button, Media, Words, countWords, orPlaceholder } from '../components/ui.jsx';
import { isReduced, useMeta, useScrollVar } from '../hooks/motion.js';
import { useT } from '../i18n/index.jsx';

const layout = [
  { flex: '2 1 560px', ratio: '16 / 10', offset: '0px' },
  { flex: '1 1 340px', ratio: '4 / 5', offset: 'clamp(0px, 6vw, 96px)' },
  { flex: '1 1 340px', ratio: '4 / 5', offset: '0px' },
  { flex: '2 1 560px', ratio: '16 / 10', offset: 'clamp(0px, 4vw, 64px)' },
];

/** Drag-to-orbit project stage. Positions are written straight to the DOM for smooth 60fps motion. */
function Orbit({ projects }) {
  const t = useT();
  const N = Math.max(1, projects.length);
  const stage = useRef(null);
  const tiles = useRef([]);
  const angle = useRef(0);
  const drag = useRef(null);
  const moved = useRef(false);
  const [auto, setAuto] = useState(() => !isReduced());
  const autoRef = useRef(auto);
  autoRef.current = auto;
  const [grabbing, setGrabbing] = useState(false);

  useEffect(() => {
    let raf = 0;
    const place = () => {
      tiles.current.forEach((el, i) => {
        if (!el) return;
        const t = angle.current + (i / N) * Math.PI * 2;
        const depth = (Math.sin(t) + 1) / 2;
        el.style.left = `${50 + 37 * Math.cos(t)}%`;
        el.style.top = `${50 + 30 * Math.sin(t)}%`;
        el.style.transform = `translate(-50%, -50%) scale(${0.62 + 0.42 * depth})`;
        el.style.zIndex = String(Math.round(depth * 40) + 1);
        el.style.opacity = String(0.45 + 0.55 * depth);
      });
    };
    const loop = () => {
      if (autoRef.current && !drag.current) angle.current += 0.0028;
      place();
      raf = requestAnimationFrame(loop);
    };
    place();
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [N]);

  const down = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    drag.current = { x: e.clientX, a: angle.current };
    moved.current = false;
    setGrabbing(true);
  };
  const move = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    if (Math.abs(dx) > 5 && !moved.current) {
      moved.current = true;
      try { stage.current.setPointerCapture(e.pointerId); } catch { /* noop */ }
    }
    angle.current = drag.current.a + dx * 0.006;
  };
  const up = () => {
    drag.current = null;
    setGrabbing(false);
  };
  const rotate = (d) => (angle.current += (d * Math.PI) / 3);

  return (
    <div
      ref={stage}
      className={`orbit${grabbing ? ' is-grabbing' : ''}`}
      role="group"
      aria-label={t('pf.orbit')}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
    >
      <div className="orbit__rings" aria-hidden="true">
        <span className="orbit__ring orbit__ring--a" />
        <span className="orbit__ring orbit__ring--b" />
        <span className="orbit__dot" />
      </div>
      {projects.map((p, i) => (
        <Link
          key={p.slug}
          to={`/work/${p.slug}`}
          ref={(el) => (tiles.current[i] = el)}
          className="orbit__tile"
          draggable="false"
          style={{ background: p.bg, color: p.fg }}
          onClick={(e) => moved.current && e.preventDefault()}
        >
          {p.cover ? (
            <img className="media__img" src={p.cover} alt="" draggable="false" />
          ) : (
            p.art.map((s, k) => <span key={k} className="orbit__shape" aria-hidden="true" style={s} />)
          )}
          <span className="orbit__n">{p.n}</span>
          <span className="orbit__cap">
            <strong>{p.title}</strong>
            {p.short}
          </span>
        </Link>
      ))}
      <div className="orbit__pulse" aria-hidden="true" />
      <div className="orbit__core" aria-hidden="true">{t('pf.drag').split('\n').map((x, k) => (k ? [<br key={k} />, x] : x))}</div>
      <div className="orbit__controls">
        <button type="button" className="round-btn round-btn--light" onClick={() => rotate(-1)} aria-label={t('pf.left')}>←</button>
        <button type="button" className="round-btn round-btn--light" onClick={() => rotate(1)} aria-label={t('pf.right')}>→</button>
        <button type="button" className="orbit__toggle" aria-pressed={!auto} onClick={() => setAuto((a) => !a)}>
          {auto ? t('pf.pause') : t('pf.play')}
        </button>
      </div>
      <p className="orbit__count">{t('pf.count', { n: projects.length })}{projects.some((p) => !p.cover) ? t('pf.imagesToAdd') : ''}</p>
    </div>
  );
}

export default function Work() {
  const { projects, site, text } = useContent();
  const t = text.portfolio;
  const tr = useT();
  const N = projects.length;
  useMeta(tr('pf.title', { name: site.name }), tr('pf.desc', { name: site.name }));
  const [filter, setFilter] = useState('all');
  const [hover, setHover] = useState(0);
  const heroRef = useRef(null);
  useScrollVar(heroRef, { mode: 'exit', name: '--spin' });

  const shown = filter === 'all' ? projects : projects.filter((p) => p.cats.includes(filter));
  const pv = projects[Math.min(hover, N - 1)];

  return (
    <>
      <Header variant="dark" />
      <main id="main" className="workpage">
        <section ref={heroRef} className="pf-hero on-dark" aria-labelledby="pf-title">
          <div className="pf-hero__head">
            <div className="in-1">
              <p className="pill-eyebrow">{t.eyebrow}</p>
              <h1 id="pf-title" className="pf-hero__title" data-reveal="words"><Words text={t.title} /> <em><Words text={t.titleEm} start={countWords(t.title)} /></em></h1>
            </div>
            <p className="in-2 pf-hero__intro">{t.intro}</p>
          </div>
          {N > 0 && <Orbit projects={projects} />}
        </section>

        <section className="pf-section" aria-labelledby="grid-title">
          <div className="pf-wrap">
            <div className="pf-head">
              <h2 id="grid-title" className="h2" data-reveal>{tr('pf.byA')} <em>{tr('pf.byB')}</em></h2>
              <div className="filters" role="toolbar" aria-label={tr('pf.filters')}>
                {filters.map((id) => {
                  const count = id === 'all' ? N : projects.filter((p) => p.cats.includes(id)).length;
                  return (
                    <button key={id} type="button" aria-pressed={filter === id} className={`filter${filter === id ? ' is-on' : ''}`} onClick={() => setFilter(id)}>
                      {tr(`pf.f.${id}`)} <span>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="pf-grid">
              {shown.map((p, i) => {
                const l = layout[i % layout.length];
                return (
                  <Link key={`${filter}-${p.slug}`} to={`/work/${p.slug}`} className="card pf-card" data-cursor={tr("cursor.view")} data-reveal style={{ flex: l.flex, marginTop: l.offset }}>
                    <Media src={p.cover} alt={tr('work.coverAlt', { title: p.title })} bg={p.bg} art={p.art} ratio={l.ratio} label={tr('work.imagePh')} className="pf-card__media" reveal parallax />
                    <div className="pf-card__meta">
                      <span>{p.n} · {p.tags.join(' · ').toUpperCase()}</span>
                      <span>{orPlaceholder(p.year, tr('cs.yearPh'))}</span>
                    </div>
                    <h3>{p.title} <span className="ar" aria-hidden="true">↗</span></h3>
                    <p>{p.summary}</p>
                  </Link>
                );
              })}
            </div>
            {shown.length === 0 && <p className="pf-empty">{tr('pf.empty')}</p>}
          </div>
        </section>

        <section className="pf-section pf-index" aria-labelledby="idx-title">
          <div className="pf-wrap">
            <h2 id="idx-title" className="h2 pf-index__title" data-reveal>{tr('pf.indexA')} <em>{tr('pf.indexB')}</em></h2>
            <div className="pf-index__body">
              <ol className="pf-index__list">
                {projects.map((p, i) => (
                  <li key={p.slug}>
                    <Link to={`/work/${p.slug}`} className={`pf-row${i === hover ? ' is-on' : ''}`} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)}>
                      <span className="pf-row__n">{p.n}</span>
                      <span className="pf-row__t">{p.title}</span>
                      <span className="pf-row__tags">{p.tags.join(' · ')}</span>
                      <span className="pf-row__y">{orPlaceholder(p.year, tr('cs.yearPh'))}</span>
                      <span className="ar" aria-hidden="true">↗</span>
                    </Link>
                  </li>
                ))}
              </ol>
              {pv && <div className="pf-preview only-desk" aria-hidden="true">
                <Media key={pv.slug} src={pv.cover} bg={pv.bg} art={pv.art} className="pf-preview__media" />
                <div className="pf-preview__cap" style={{ color: pv.cover ? '#fff' : pv.fg }}>
                  <span>{tr('pf.preview', { n: pv.n })}</span>
                  <p>{pv.title}</p>
                </div>
              </div>}
            </div>
          </div>
        </section>

        <section className="pf-cta" aria-labelledby="cta-title">
          <span className="pf-cta__ring pf-cta__ring--a" aria-hidden="true" />
          <span className="pf-cta__ring pf-cta__ring--b" aria-hidden="true" />
          <h2 id="cta-title" data-reveal="words"><Words text={t.ctaTitle} /><br /><em><Words text={t.ctaEm} start={countWords(t.ctaTitle)} /></em></h2>
          <div className="pf-cta__btns" data-reveal>
            <Button to="/#contact" variant="ivory" arrow magnetic>{tr('pf.talk')}</Button>
            {site.cv && <Button href={site.cv} variant="outline-light">{tr('pf.cv')}</Button>}
          </div>
        </section>
      </main>
      <footer className="footer--slim on-dark">
        <span>© {new Date().getFullYear()} {site.name}</span>
        <Link className="ulink" to="/">{tr('pf.back')}</Link>
      </footer>
    </>
  );
}
