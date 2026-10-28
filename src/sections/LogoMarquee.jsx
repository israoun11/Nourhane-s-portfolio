// Infinite logo carousel under the hero (pure CSS animation).
//
// How the seamless loop works: the track holds two identical groups side by side and
// slides left by exactly one group (-50%). When it reaches the end it restarts at 0,
// which looks identical — so there is never a jump or a gap. Each group repeats the
// logos as many times as needed to be wider than the screen, so wide monitors never
// see empty space either.
//
// The animation only starts once every logo image has loaded (or definitively failed),
// so visitors never see an empty moving band. A logo whose file cannot be loaded is left
// out of the row and reported in the browser console with its exact address.
//
// Logos are edited in the dashboard: Sections → Logo carousel
// (defaults: shared/default-content.js → `logos`, files in /public/logos).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useContent } from '../content/ContentProvider.jsx';
import { useT } from '../i18n/index.jsx';

const SPEED = 42; // pixels per second — calm and steady on every screen size

function Logo({ logo, hidden }) {
  const t = useT();
  const img = (
    <img
      className="logos__img"
      src={logo.image}
      alt={hidden ? '' : logo.name}
      decoding="async"
      draggable="false"
    />
  );
  if (!logo.href) return img;
  return (
    <a className="logos__link" href={logo.href} target="_blank" rel="noopener noreferrer" tabIndex={hidden ? -1 : undefined} aria-label={hidden ? undefined : t('logos.newTab', { name: logo.name })}>
      {img}
    </a>
  );
}

export default function LogoMarquee() {
  const { logos } = useContent();
  const t = useT();
  const all = useMemo(() => (Array.isArray(logos) ? logos.filter((l) => l && l.image) : []), [logos]);
  // Load state of every logo file, reported by the measuring copy below: 'ok' | 'err'.
  const [status, setStatus] = useState({});
  const items = useMemo(() => all.filter((l) => status[l.image] !== 'err'), [all, status]);
  const ready = all.length > 0 && all.every((l) => status[l.image]);
  const report = (logo, ok) =>
    setStatus((s) => {
      if (s[logo.image]) return s;
      if (!ok) console.error(`[Logo carousel] Could not load the image for “${logo.name}”: ${new URL(logo.image, window.location.href).href} — check that the file exists (public/logos/ or the dashboard upload).`);
      return { ...s, [logo.image]: ok ? 'ok' : 'err' };
    });
  const viewport = useRef(null);
  const firstSet = useRef(null);
  const [copies, setCopies] = useState(1);
  const [duration, setDuration] = useState(40);

  // Measure the width of one set of logos and repeat it until it covers the screen.
  useEffect(() => {
    const vp = viewport.current;
    const set = firstSet.current;
    if (!vp || !set) return undefined;
    const measure = () => {
      const setWidth = set.getBoundingClientRect().width;
      if (!setWidth) return;
      const n = Math.max(1, Math.ceil(vp.clientWidth / setWidth));
      setCopies((c) => (c === n ? c : n));
      const d = Math.round(((setWidth * n) / SPEED) * 10) / 10;
      setDuration((cur) => (Math.abs(cur - d) < 0.5 ? cur : d));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(vp);
    ro.observe(set);
    return () => ro.disconnect();
  }, [items]);

  // Images already in the browser cache may finish before React listens: check them directly.
  useEffect(() => {
    const set = firstSet.current;
    if (!set) return;
    set.querySelectorAll('img').forEach((img, i) => {
      const logo = all[i];
      if (logo && img.complete) report(logo, img.naturalWidth > 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);

  // Nothing configured, or no logo file could be loaded → no empty band.
  if (!all.length || (ready && !items.length)) return null;

  const group = (g) => (
    <ul className="logos__group" key={g} aria-hidden={g === 1 ? 'true' : undefined}>
      {Array.from({ length: copies }).map((_, c) =>
        items.map((logo, i) => {
          const hidden = g === 1 || c > 0; // only the first set is announced to screen readers
          return (
            <li key={`${c}-${i}`} className="logos__item" aria-hidden={hidden && g === 0 ? 'true' : undefined}>
              <Logo logo={logo} hidden={hidden} />
            </li>
          );
        })
      )}
    </ul>
  );

  return (
    <section className="band band--logos" aria-label={t('logos.label')}>
      <div ref={viewport} className={`logos${ready ? ' is-ready' : ''}`}>
        {/* invisible copy of one set, used only to measure its width */}
        <ul ref={firstSet} className="logos__group logos__measure" aria-hidden="true">
          {all.map((logo, i) => (
            <li key={`${i}-${logo.image}`} className="logos__item" style={status[logo.image] === 'err' ? { display: 'none' } : undefined}>
              <img className="logos__img" src={logo.image} alt="" onLoad={(e) => report(logo, e.currentTarget.naturalWidth > 0)} onError={() => report(logo, false)} />
            </li>
          ))}
        </ul>
        {/* the moving row is only built once every logo file has loaded (from the cache) */}
        {ready && (
          <div className="logos__track" style={{ '--marquee-duration': `${duration}s` }}>
            {group(0)}
            {group(1)}
          </div>
        )}
      </div>
    </section>
  );
}
