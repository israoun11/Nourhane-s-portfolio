import { useRef } from 'react';
import { useContent } from '../content/ContentProvider.jsx';
import { Media, Words, countWords } from '../components/ui.jsx';
import { useT } from '../i18n/index.jsx';
import { useScrollVar } from '../hooks/motion.js';

// Connected four-step diagram; the blue and pink lines draw with scroll.
export default function Method() {
  const { method, text } = useContent();
  const t = useT();
  const ref = useRef(null);
  useScrollVar(ref, { mode: 'cover', from: 0.12, to: 0.55, name: '--draw' });
  return (
    <section className="section method" aria-labelledby="proc-title">
      <div className="container">
        <h2 id="proc-title" className="h-cond method__title" data-reveal="words">
          <Words text={text.method.title} />
          <br />
          <span className="it c-blue"><Words text={text.method.titleEm} start={countWords(text.method.title)} /></span>
        </h2>
        <div ref={ref} className="method__diagram">
          <svg className="method__lines only-desk" aria-hidden="true" viewBox="0 0 1000 200" preserveAspectRatio="none">
            <path pathLength="1" d="M60 40 C 200 40, 230 160, 375 160 S 550 40, 625 40 S 800 160, 940 160" stroke="#1534DD" />
            <path pathLength="1" d="M60 52 C 210 52, 240 172, 375 172 S 545 52, 625 52 S 790 172, 940 172" stroke="#F174AB" />
          </svg>
          <ol className="method__steps">
            {method.map((m, i) => (
              <li key={`${m.t}-${i}`} data-reveal style={{ paddingTop: m.pad, '--d': `${i * 0.12}s` }}>
                <span className="method__dot" style={{ background: m.bg, color: m.fg }}>{m.n}</span>
                <h3>{m.t}</h3>
                <p className="body-muted">{m.d}</p>
                <Media className="method__media" src={m.image} alt={m.t} bg={m.bg} ratio="16 / 10" label={m.image ? undefined : t('img.placeholder')}
                  art={[{ width: '34%', left: '58%', top: '-12%', borderRadius: '50%', background: m.fg }]} />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
