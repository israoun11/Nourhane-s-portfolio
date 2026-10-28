import { useEffect, useRef, useState } from 'react';
import { useContent } from '../content/ContentProvider.jsx';
import { Words } from '../components/ui.jsx';
import { useScrollVar } from '../hooks/motion.js';
import { useT } from '../i18n/index.jsx';
import Lightbox from '../components/Lightbox.jsx';

const dots = Array.from({ length: 50 }, (_, i) => i % 7 === 0);
const SLOTS = 4; // every year always shows at least four photo places

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

/**
 * Photo mosaic of one year: one large photo + three smaller ones (more photos open in the viewer).
 * Empty places show the year's illustration (main place) or an elegant placeholder.
 */
function YearPhotos({ m, i, compact = false, onOpen, tabbable = true }) {
  const t = useT();
  const photos = m.photos || [];
  const real = photos.filter((p) => p.src);
  const slots = Array.from({ length: SLOTS }, (_, k) => photos[k] || { src: '', caption: '' });
  const hidden = real.filter((p) => !slots.includes(p)); // photos beyond the first four places

  return (
    <div className={`yp${compact ? ' yp--compact' : ''}`} role="group" aria-label={t('journey.photos', { year: m.y })}>
      {slots.map((p, k) => {
        const realIndex = p.src ? real.indexOf(p) : -1;
        return (
          <div key={k} className={`yp__slot yp__slot--${k + 1}${p.src ? ' has-img' : ''}`}>
            {p.src ? (
              <button type="button" className="yp__btn" tabIndex={tabbable ? undefined : -1} onClick={() => onOpen(realIndex)} aria-label={t('cs.open', { label: p.caption || t('journey.photoAlt', { n: k + 1, year: m.y }) })}>
                <img src={p.src} alt={p.caption || t('journey.photoAlt', { n: k + 1, year: m.y })} loading="lazy" decoding="async" />
              </button>
            ) : k === 0 && !compact ? (
              <div className="yp__illus" aria-hidden="true"><YearVisual i={i} /></div>
            ) : (
              <div className="yp__ph" aria-hidden="true">
                <span className="yp__plus">+</span>
                <span className="yp__label">{t('journey.slot', { n: k + 1 })} · {m.y}</span>
                <span className="yp__hint">{t('journey.slotHint')}</span>
              </div>
            )}
          </div>
        );
      })}
      {hidden.length > 0 && (
        <button type="button" className="yp__more" tabIndex={tabbable ? undefined : -1} onClick={() => onOpen(real.indexOf(hidden[0]))}>+{hidden.length}</button>
      )}
    </div>
  );
}

export default function Journey() {
  const { timeline, text } = useContent();
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
                    <YearPhotos m={m} i={i} tabbable={i === active} onOpen={(k) => setViewer({ y: i, k })} />
                  </div>
                ))}
                {!(cur.photos || []).some((p) => p.src) && <span className="journey__tag">{tr('journey.illustrative', { year: cur.y })}</span>}
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
                  <YearPhotos m={m} i={i} compact onOpen={(k) => setViewer({ y: i, k })} />
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
          images={timeline[viewer.y].photos.filter((p) => p.src).map((p, k) => ({
            src: p.src,
            caption: [timeline[viewer.y].y, p.caption].filter(Boolean).join(' · '),
            alt: p.caption || tr('journey.photoAlt', { n: k + 1, year: timeline[viewer.y].y }),
          }))}
        />
      )}
    </section>
  );
}
