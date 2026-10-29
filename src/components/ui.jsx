// Small reusable building blocks: buttons, media frames, word reveals, count-up numbers.
import { Fragment, useRef, useState } from 'react';
import { Link } from '../router.jsx';
import { isReduced, useInView, useMagnetic, useScrollVar } from '../hooks/motion.js';

/** Pill button. variant: blue | ink | pink | ivory | outline | outline-light. Internal links use the router. */
export function Button({ to, href, variant = 'blue', size, arrow = false, magnetic = false, children, className = '', ...rest }) {
  const ref = useRef(null);
  useMagnetic(ref, magnetic);
  const cls = `btn btn--${variant}${size ? ` btn--${size}` : ''} ${className}`.trim();
  const inner = (
    <>
      {children}
      {arrow && <span className="ar" aria-hidden="true">↗</span>}
    </>
  );
  const target = to || href;
  const external = target && /^(https?:|mailto:|tel:)/.test(target);
  const isFile = target && (rest.download !== undefined || /\.[a-z0-9]{2,5}$/i.test(target.split(/[?#]/)[0]));
  if (external || isFile) {
    return (
      <a ref={ref} className={cls} href={target} target={target.startsWith('http') ? '_blank' : undefined} rel="noreferrer" {...rest}>
        {inner}
      </a>
    );
  }
  if (target) {
    return (
      <Link ref={ref} className={cls} to={target} {...rest}>
        {inner}
      </Link>
    );
  }
  return (
    <button ref={ref} className={cls} {...rest}>
      {inner}
    </button>
  );
}

/**
 * Splits text into words that rise in one after another when the parent
 * heading (marked data-reveal="words") scrolls into view. `\n` makes a line break.
 */
export function Words({ text, start = 0 }) {
  let i = start;
  const lines = String(text || '').split('\n');
  return lines.map((line, li) => (
    <Fragment key={li}>
      {li > 0 && <br />}
      {line.split(/\s+/).filter(Boolean).map((w, wi, arr) => (
        <Fragment key={wi}>
          <span className="w" style={{ '--i': i++ }}>
            <span>{w}</span>
          </span>
          {wi < arr.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </Fragment>
  ));
}
export const countWords = (t) => String(t || '').split(/\s+/).filter(Boolean).length;

/** Heading made of a plain part and a highlighted part, with the word reveal. */
export function SplitHeading({ as: Tag = 'h2', id, className = 'h2', title, em, emClass = '', br = true }) {
  return (
    <Tag id={id} className={className} data-reveal="words">
      <Words text={title} />
      {em && (
        <>
          {br ? <br /> : ' '}
          <em className={emClass}>
            <Words text={em} start={countWords(title)} />
          </em>
        </>
      )}
    </Tag>
  );
}

/**
 * Image frame. Shows `src` when provided; otherwise the decorative
 * placeholder composition (`art`) with a clear label.
 * reveal: opens with a clip animation when scrolled into view.
 * parallax: the image drifts gently inside its frame while scrolling.
 */
export function Media({ src, alt = '', bg, art = [], label, mono, monoColor, ratio, className = '', grayscale = false, style, reveal = false, parallax = false, framed = false, pos, logo, children }) {
  const ref = useRef(null);
  useScrollVar(ref, { mode: 'cover', name: '--py', enabled: parallax });
  const imgStyle = pos && pos !== 'center' ? { objectPosition: pos } : undefined;
  return (
    <div
      ref={ref}
      className={`media${parallax ? ' media--parallax' : ''}${framed && (src || logo) ? ' media--framed' : ''} ${className}`}
      style={{ background: bg, aspectRatio: ratio, ...style }}
      data-reveal={reveal ? 'clip' : undefined}
    >
      {!src && logo ? (
        // No photo yet but the client's logo exists: the logo sits in the frame, shapes around it.
        <>
          <div className="media__art" aria-hidden="true">
            {(art.length ? art : FRAME_SHAPES).map((s, i) => (
              <span key={i} style={s} />
            ))}
          </div>
          <div className="media__frame media__frame--logo">
            <img className="media__logo" src={logo} alt={alt} loading="lazy" decoding="async" />
          </div>
        </>
      ) : src && framed ? (
        // The decorative shapes stay as their own layer; the photo sits in a frame above them.
        <>
          <div className="media__art" aria-hidden="true">
            {(art.length ? art : FRAME_SHAPES).map((s, i) => (
              <span key={i} style={s} />
            ))}
          </div>
          <div className="media__frame">
            <img className={`media__img${grayscale ? ' is-gray' : ''}`} src={src} alt={alt} loading="lazy" decoding="async" style={imgStyle} />
          </div>
        </>
      ) : src ? (
        <img className={`media__img${grayscale ? ' is-gray' : ''}`} src={src} alt={alt} loading="lazy" decoding="async" style={imgStyle} />
      ) : (
        <div className="media__art" aria-hidden="true">
          {art.map((s, i) => (
            <span key={i} style={s} />
          ))}
          {mono && (
            <b className="media__mono" style={{ color: monoColor }}>
              {mono}
            </b>
          )}
        </div>
      )}
      {!src && !logo && label && <span className="ph-label">{label}</span>}
      {children}
    </div>
  );
}

// Restrained shapes used behind a framed photo when the item has no shapes of its own.
const FRAME_SHAPES = [
  { width: '42%', left: '-10%', bottom: '-18%', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.22)' },
  { width: '24%', right: '4%', top: '3%', borderRadius: '50%', border: '1.5px solid rgba(255, 255, 255, 0.5)' },
];

/** Animated number (counts up once when visible). */
export function CountUp({ to, suffix = '', className, duration = 1400 }) {
  const ref = useRef(null);
  const [val, setVal] = useState(() => (isReduced() ? to : 0));
  useInView(ref, () => {
    if (isReduced()) return setVal(to);
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setVal(Math.round(eased * to));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  return (
    <span ref={ref} className={className} aria-label={`${to}${suffix}`}>
      <span aria-hidden="true">
        {val}
        {suffix}
      </span>
    </span>
  );
}

export const orPlaceholder = (v, ph) => (v && String(v).trim() ? v : ph);
