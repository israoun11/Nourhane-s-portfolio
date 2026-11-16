import { useEffect, useRef, useState } from 'react';
import { useContent } from '../content/ContentProvider.jsx';
import { Words } from '../components/ui.jsx';
import { useScrollVar } from '../hooks/motion.js';
import { useT } from '../i18n/index.jsx';
import Lightbox from '../components/Lightbox.jsx';

/**
 * The slides of one year: only real uploaded photos (dashboard → My story → the year → Photos),
 * plus a featured cover saved by an earlier version, if any. No drawn placeholder.
 */
export function yearSlides(m) {
  const photos = (m.photos || []).filter((p) => p.src).map((p) => ({ src: p.src, caption: p.caption, alt: p.alt || p.caption }));
  if (!m.cover) return photos;
  const cover = { cover: true, src: m.cover, alt: m.coverAlt || '' };
  return m.coverPosition === 'last' ? [...photos, cover] : [cover, ...photos];
}

/**
 * One year's slider: one image at a time, arrows, dots, counter, swipe and arrow keys.
 * Each year keeps its own position.
 */
function YearSlider({ m, settings, onOpen, tabbable = true }) {
  const t = useT();
  const slides = yearSlides(m);
  const [cur, setCur] = useState(0);
  const at = Math.min(cur, slides.length - 1);
  const drag = useRef(null);
  const n = slides.length;
  const go = (k) => setCur(((k % n) + n) % n);

  const onKey = (e) => {
    if (n < 2) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const fwd = (e.key === 'ArrowRight') !== (document.documentElement.dir === 'rtl');
      go(at + (fwd ? 1 : -1));
    }
  };
  const onDown = (e) => {
    if (n < 2) return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onUp = (e) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(e.clientY - d.y)) return;
    const rtl = document.documentElement.dir === 'rtl';
    go(at + ((dx < 0) !== rtl ? 1 : -1));
    e.preventDefault();
  };

  const label = (x, k) => x.alt || x.caption || (x.cover ? t('journey.coverAlt', { year: m.y }) : t('journey.photoAlt', { n: k + 1, year: m.y }));
  const s = settings || {};
  return (
    <div
      className="ys"
      role="region"
      aria-roledescription={t('journey.carousel')}
      aria-label={t('journey.photos', { year: m.y })}
      tabIndex={tabbable ? 0 : -1}
      onKeyDown={onKey}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={() => (drag.current = null)}
    >
      <div className="ys__track" style={{ '--at': at }}>
        {slides.map((x, k) => (
          <div
            key={k}
            className={`ys__slide${k === at ? ' is-on' : ''}`}
            role="group"
            aria-roledescription={t('journey.slide')}
            aria-label={t('journey.slideOf', { n: k + 1, total: n })}
            aria-hidden={k !== at}
          >
            <button type="button" className="ys__img" tabIndex={tabbable && k === at ? undefined : -1} onClick={() => onOpen(k)} aria-label={t('cs.open', { label: label(x, k) })} draggable={false}>
              <img src={x.src} alt={label(x, k)} loading={k === 0 ? undefined : 'lazy'} decoding="async" draggable={false} />
            </button>
            {x.caption && <p className="ys__cap">{x.caption}</p>}
          </div>
        ))}
      </div>
      {n > 1 && (
        <>
          <button type="button" className="ys__arrow ys__arrow--prev" onClick={() => go(at - 1)} tabIndex={tabbable ? undefined : -1} aria-label={t('journey.prev')}>
            <span aria-hidden="true">←</span>
          </button>
          <button type="button" className="ys__arrow ys__arrow--next" onClick={() => go(at + 1)} tabIndex={tabbable ? undefined : -1} aria-label={t('journey.next')}>
            <span aria-hidden="true">→</span>
          </button>
          <div className="ys__foot">
            {s.dots !== false && (
              <div className="ys__dots">
                {slides.map((_, k) => (
                  <button key={k} type="button" className={k === at ? 'is-on' : ''} aria-current={k === at ? 'true' : undefined} tabIndex={tabbable ? undefined : -1} onClick={() => go(k)} aria-label={t('journey.goto', { n: k + 1 })} />
                ))}
              </div>
            )}
            {s.counter !== false && <span className="ys__count" aria-live="polite">{at + 1} / {n}</span>}
          </div>
        </>
      )}
    </div>
  );
}

export default function Journey() {
  const { timeline, text, storySettings } = useContent();
  const t = text.journey;
  const tr = useT();
  const [sel, setActive] = useState(0);
  const [viewer, setViewer] = useState(null); // { year index, photo index }
  const active = Math.min(sel, timeline.length - 1);
  const sectionRef = useRef(null);
  const itemsRef = useRef([]);
  useScrollVar(sectionRef, { mode: 'cover', from: 0.15, to: 0.85 });

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number(e.target.dataset.index));
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    itemsRef.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [timeline.length]);

  const cur = timeline[active];
  if (!cur) return null;
  const has = (m) => yearSlides(m).length > 0;

  return (
    <section id="story" ref={sectionRef} className="section journey" aria-labelledby="journey-title">
      <div className="container">
        <p className="eyebrow" data-reveal>{t.eyebrow}</p>
        <h2 id="journey-title" className="h-cond journey__title" data-reveal="words">
          <Words text={t.title} />
        </h2>
        <p className="journey__grew" data-reveal>{t.grew}</p>
        <p className="body-muted journey__sub" data-reveal>
          {t.sub}
        </p>

        <div className="journey__body">
          <div className="journey__sticky only-desk">
            <div className="journey__rail" aria-hidden="true"><span /></div>
            <div className="journey__stage">
              <div className="journey__head" aria-hidden="true">
                <span key={cur.y} className="journey__year">{cur.y}</span>
                <span className="journey__meta">{String(active + 1).padStart(2, '0')} / {String(timeline.length).padStart(2, '0')}<br />{cur.phase}</span>
              </div>
              {/* The year's own photos, portrait, one slider per year; nothing shown for a year without photos. */}
              <div className={`journey__frame${has(cur) ? '' : ' is-empty'}`}>
                {timeline.map((m, i) =>
                  has(m) ? (
                    <div key={`${m.y}-${i}`} className={`journey__panel${i === active ? ' is-on' : ''}`} aria-hidden={i !== active}>
                      <YearSlider m={m} settings={storySettings} tabbable={i === active} onOpen={(k) => setViewer({ y: i, k })} />
                    </div>
                  ) : null
                )}
              </div>
            </div>
          </div>

          <ol className="journey__list">
            {timeline.map((m, i) => (
              <li
                key={`${m.y}-${i}`}
                ref={(el) => (itemsRef.current[i] = el)}
                data-index={i}
                className={`journey__item${i === active ? ' is-on' : ''}`}
              >
                <span className="journey__y">{m.y}</span>
                <h3>{m.t}</h3>
                <p className="body-muted">{m.d}</p>
                <ul className="chips">
                  {m.chips.map((c) => (
                    <li key={c} className="chip chip--line">{c}</li>
                  ))}
                </ul>
                {has(m) && (
                  <div className="journey__photos only-mob">
                    <YearSlider m={m} settings={storySettings} onOpen={(k) => setViewer({ y: i, k })} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
      {viewer && timeline[viewer.y] && (
        <Lightbox
          start={viewer.k}
          onClose={() => setViewer(null)}
          images={yearSlides(timeline[viewer.y]).map((x, k) => ({
            src: x.src,
            caption: [timeline[viewer.y].y, x.caption].filter(Boolean).join(' · '),
            alt: x.alt || x.caption || tr('journey.photoAlt', { n: k + 1, year: timeline[viewer.y].y }),
          }))}
        />
      )}
    </section>
  );
}
