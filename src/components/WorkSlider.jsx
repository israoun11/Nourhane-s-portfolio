import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/index.jsx';

const INTERVAL = 5000; // ms between automatic slides
const SWIPE = 40; // px of horizontal movement that counts as a swipe

/**
 * “The work” image slider of a project page.
 * One frame, every image at the same size, shown whole (never stretched or cropped).
 * Arrows, thumbnails (dots on phones), swipe and keyboard ← →. Slides automatically every
 * few seconds; pauses while the visitor hovers, focuses, touches or uses the controls, when it
 * is off-screen or the tab is hidden, and with the pause button. Visitors who ask their device
 * for reduced motion get no automatic sliding and no sliding animation.
 */
export default function WorkSlider({ images, title, onOpen }) {
  const t = useT();
  const n = images.length;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false); // pause button
  const [hold, setHold] = useState(false); // hover / focus / touch
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [tick, setTick] = useState(0); // restarts the timer after a manual move
  const root = useRef(null);
  const drag = useRef(null);
  const swiped = useRef(false); // a swipe must not also open the image

  const go = useCallback((k) => {
    setI((cur) => (k + n) % n);
    setTick((x) => x + 1);
  }, [n]);
  const prev = () => go(i - 1);
  const next = () => go(i + 1);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el || !('IntersectionObserver' in window)) return setVisible(true);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const auto = n > 1 && !paused && !hold && visible && !reduced;
  useEffect(() => {
    if (!auto) return undefined;
    const id = setTimeout(() => {
      if (!document.hidden) setI((cur) => (cur + 1) % n);
      setTick((x) => x + 1);
    }, INTERVAL);
    return () => clearTimeout(id);
  }, [auto, i, tick, n]);

  if (!n) return null;

  const onKey = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
  };
  const down = (e) => {
    drag.current = { x: e.clientX, y: e.clientY };
    setHold(true);
  };
  const up = (e) => {
    const d = drag.current;
    drag.current = null;
    if (e.pointerType !== 'mouse') setHold(false);
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(e.clientY - d.y)) {
      e.preventDefault();
      swiped.current = true;
      setTimeout(() => (swiped.current = false), 0);
      if (dx < 0) next();
      else prev();
    }
  };

  const cur = images[i];
  return (
    <div
      ref={root}
      className={`wsl${reduced ? ' is-still' : ''}`}
      role="region"
      aria-roledescription={t('wsl.carousel')}
      aria-label={t('wsl.label', { title })}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setHold(false)}
      onKeyDown={onKey}
    >
      <div className="wsl__frame" onPointerDown={down} onPointerUp={up} onPointerCancel={() => { drag.current = null; setHold(false); }}>
        <ul className="wsl__track" style={{ transform: `translate3d(${-i * 100}%, 0, 0)` }} aria-live={auto ? 'off' : 'polite'}>
          {images.map((g, k) => (
            <li key={`${k}-${g.src}`} className="wsl__slide" role="group" aria-roledescription={t('wsl.slide')} aria-label={t('wsl.of', { n: k + 1, total: n })} aria-hidden={k !== i}>
              <button type="button" className="wsl__open" tabIndex={k === i ? 0 : -1} onClick={() => !swiped.current && onOpen && onOpen(k)} aria-label={t('cs.open', { label: g.label || String(k + 1) })} data-cursor={t('cursor.view')}>
                <img src={g.src} alt={g.label || ''} loading={Math.abs(k - i) <= 1 || k === n - 1 ? 'eager' : 'lazy'} decoding="async" draggable="false" />
              </button>
            </li>
          ))}
        </ul>
        {n > 1 && (
          <>
            <button type="button" className="wsl__arrow wsl__arrow--prev" onClick={prev} aria-label={t('wsl.prev')}><span aria-hidden="true">←</span></button>
            <button type="button" className="wsl__arrow wsl__arrow--next" onClick={next} aria-label={t('wsl.next')}><span aria-hidden="true">→</span></button>
          </>
        )}
        {n > 1 && !reduced && <span className="wsl__bar" key={`${i}-${tick}`} style={{ animationDuration: `${INTERVAL}ms`, animationPlayState: auto ? 'running' : 'paused' }} aria-hidden="true" />}
      </div>

      <div className="wsl__foot">
        <p className="wsl__cap">{cur.label || ' '}</p>
        {n > 1 && (
          <div className="wsl__ctrl">
            {!reduced && (
              <button type="button" className="wsl__play" onClick={() => setPaused((x) => !x)} aria-pressed={paused} aria-label={paused ? t('wsl.play') : t('wsl.pause')}>
                <span aria-hidden="true">{paused ? '▶' : '❚❚'}</span>
              </button>
            )}
            <span className="wsl__count" aria-hidden="true">{String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
          </div>
        )}
      </div>

      {n > 1 && (
        <ol className="wsl__thumbs" aria-label={t('wsl.choose')}>
          {images.map((g, k) => (
            <li key={`${k}-${g.src}`}>
              <button type="button" className={`wsl__thumb${k === i ? ' is-on' : ''}`} onClick={() => go(k)} aria-label={t('wsl.of', { n: k + 1, total: n })} aria-current={k === i ? 'true' : undefined}>
                <img src={g.src} alt="" loading="lazy" decoding="async" />
                <span className="wsl__dot" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
