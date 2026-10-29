import { useEffect, useRef, useState } from 'react';
import { useContent } from '../content/ContentProvider.jsx';
import { Words } from '../components/ui.jsx';
import { useScrollVar } from '../hooks/motion.js';
import { useT } from '../i18n/index.jsx';
import Lightbox from '../components/Lightbox.jsx';

const dots = Array.from({ length: 50 }, (_, i) => i % 7 === 0);

// Illustrative visual per year — shown in the main photo place until a real photo is uploaded.
function YearVisual({ i }) {
  const t = useT();
  switch (i) {
    case 0:
      return (
        <div className="jv jv--grid">
          <div style={{ left: '8%', top: '10%', width: '46%', height: '62%', border: '1.5px solid #202033' }} />
          <div style={{ left: '14%', top: '18%', width: '30%', aspectRatio: '1', borderRadius: '50%', border: '1.5px dashed #F174AB' }} />
          <div className="jv__phone">
            <i style={{ background: '#B9E8E5' }} />
            <i style={{ width: '60%', background: '#E2DCE6' }} />
            <i style={{ height: '34%', background: '#E9E5EE' }} />
          </div>
          <span className="jv__crop jv__crop--tl" />
          <span className="jv__crop jv__crop--br" />
        </div>
      );
    case 1:
      return (
        <div className="jv" style={{ background: '#FFF9F5' }}>
          <div style={{ left: 0, top: 0, width: '58%', height: '100%', background: '#1534DD' }} />
          <div style={{ left: '44%', top: '16%', width: '30%', aspectRatio: '1', borderRadius: '50%', background: '#F174AB' }} />
          <b className="jv__big" style={{ left: '7%', bottom: '8%', color: '#FFF9F5' }}>{t('journey.v.lead').split('\n').map((x, k) => (k ? [<br key={k} />, x] : x))}</b>
          <div className="jv__swatches"><i style={{ background: '#202033' }} /><i style={{ background: '#1534DD' }} /><i style={{ background: '#F174AB' }} /><i style={{ background: '#B9E8E5' }} /></div>
        </div>
      );
    case 2:
      return (
        <div className="jv" style={{ background: '#F6EFEA' }}>
          <div style={{ left: '8%', top: '14%', width: '38%', aspectRatio: '4 / 5', background: '#202033', transform: 'rotate(-6deg)' }} />
          <div style={{ left: '34%', top: '22%', width: '34%', aspectRatio: '4 / 5', background: '#B9E8E5', transform: 'rotate(3deg)', border: '6px solid #fff' }} />
          <div style={{ right: '8%', top: '10%', width: '30%', aspectRatio: '4 / 5', background: '#F174AB', transform: 'rotate(8deg)', border: '6px solid #fff' }} />
          <span className="annot jv__note">{t('journey.v.independent')}</span>
        </div>
      );
    case 3:
      return (
        <div className="jv" style={{ background: '#fff' }}>
          <div className="jv__store">
            <i style={{ flex: 1, background: '#B9E8E5' }} />
            <i style={{ height: 10, width: '80%', background: '#202033' }} />
            <i style={{ height: 8, width: '50%', background: '#CFCAD6' }} />
            <i style={{ height: 30, borderRadius: 999, background: '#1534DD' }} />
          </div>
          <div className="jv__bars"><i style={{ height: '30%', background: '#E2DCE6' }} /><i style={{ height: '48%', background: '#F174AB' }} /><i style={{ height: '64%', background: '#1534DD' }} /><i style={{ height: '86%', background: '#202033' }} /></div>
          <span className="jv__cap">{t('journey.v.store')}</span>
        </div>
      );
    case 4:
      return (
        <div className="jv jv--edu">
          <b className="jv__fifty">50+</b>
          <span className="jv__cap2">{t('journey.v.trained')}</span>
          <div className="jv__dots">{dots.map((pink, k) => <i key={k} style={{ background: pink ? '#F174AB' : '#FFF9F5', animationDelay: `${k * 18}ms` }} />)}</div>
        </div>
      );
    default:
      return (
        <div className="jv" style={{ background: '#202033', color: '#FFF9F5' }}>
          <span className="jv__studio">Coda<em>Studio</em></span>
          <div className="jv__cols"><i style={{ background: '#1534DD' }} /><i style={{ background: '#F174AB' }} /><i style={{ background: '#B9E8E5' }} /></div>
        </div>
      );
  }
}

/** The slides of one year: the featured cover (designed illustration until a cover is uploaded), then the photos. */
export function yearSlides(m) {
  const photos = (m.photos || []).filter((p) => p.src).map((p) => ({ src: p.src, caption: p.caption, alt: p.alt || p.caption }));
  const cover = { cover: true, src: m.cover || '', alt: m.coverAlt || '' };
  return m.coverPosition === 'last' ? [...photos, cover] : [cover, ...photos];
}

/**
 * One year's slider: one image at a time, arrows, dots, counter, swipe and arrow keys.
 * Each year keeps its own position.
 */
function YearSlider({ m, i, settings, onOpen, tabbable = true }) {
  const t = useT();
  const slides = yearSlides(m);
  const [cur, setCur] = useState(0);
  const at = Math.min(cur, slides.length - 1);
  const drag = useRef(null);
  const n = slides.length;
  const go = (k) => setCur(((k % n) + n) % n);
  const photos = slides.filter((x) => !x.cover || x.src);

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
            {x.src ? (
              <button type="button" className="ys__img" tabIndex={tabbable && k === at ? undefined : -1} onClick={() => onOpen(photos.indexOf(x))} aria-label={t('cs.open', { label: label(x, k) })} draggable={false}>
                <img src={x.src} alt={label(x, k)} loading={k === 0 ? undefined : 'lazy'} decoding="async" draggable={false} />
              </button>
            ) : (
              <div className="ys__illus" aria-hidden="true"><YearVisual i={i} /></div>
            )}
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
              <div className="journey__frame">
                {timeline.map((m, i) => (
                  <div key={`${m.y}-${i}`} className={`journey__panel${i === active ? ' is-on' : ''}`} aria-hidden={i !== active}>
                    <YearSlider m={m} i={i} settings={storySettings} tabbable={i === active} onOpen={(k) => setViewer({ y: i, k })} />
                  </div>
                ))}
                {!cur.cover && !(cur.photos || []).some((p) => p.src) && <span className="journey__tag">{tr('journey.illustrative', { year: cur.y })}</span>}
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
                <div className="journey__photos only-mob">
                  <YearSlider m={m} i={i} settings={storySettings} onOpen={(k) => setViewer({ y: i, k })} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
      {viewer && timeline[viewer.y] && (
        <Lightbox
          start={viewer.k}
          onClose={() => setViewer(null)}
          images={yearSlides(timeline[viewer.y]).filter((x) => x.src).map((x, k) => ({
            src: x.src,
            caption: [timeline[viewer.y].y, x.caption].filter(Boolean).join(' · '),
            alt: x.alt || x.caption || tr('journey.photoAlt', { n: k + 1, year: timeline[viewer.y].y }),
          }))}
        />
      )}
    </section>
  );
}
