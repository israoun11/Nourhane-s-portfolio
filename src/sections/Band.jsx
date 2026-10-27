import { useRef } from 'react';
import { useContent } from '../content/ContentProvider.jsx';
import { useScrollVar } from '../hooks/motion.js';

// Typographic transition between hero and content — drifts sideways with scroll.
export default function Band() {
  const { text } = useContent();
  const ref = useRef(null);
  useScrollVar(ref, { mode: 'cover' });
  const base = text.band.length ? text.band : ['Design'];
  const words = [...base, ...base, ...base].slice(0, Math.max(8, base.length * 2));
  return (
    <div ref={ref} className="band" aria-hidden="true">
      <div className="band__track">
        {words.map((w, i) => (
          <span key={i} className="band__item">
            <span className={i % 2 ? 'band__serif' : ''}>{w}</span>
            <span className="c-pink">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
