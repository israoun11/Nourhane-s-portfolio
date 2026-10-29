import { useState } from 'react';
import { useContent } from '../content/ContentProvider.jsx';
import { Media, SplitHeading } from '../components/ui.jsx';
import { useT } from '../i18n/index.jsx';

export default function Mind() {
  const { mind, text } = useContent();
  const t = useT();
  const [sel, setActive] = useState(0);
  const active = Math.min(sel, mind.length - 1);
  const cur = mind[active];
  if (!cur) return null;

  const onKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      setActive((a) => (a + 1) % mind.length);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setActive((a) => (a + mind.length - 1) % mind.length);
    }
  };

  return (
    <section id="mind" className="section" aria-labelledby="mind-title">
      <div className="container">
        <SplitHeading id="mind-title" className="h2 mind__title" title={text.mind.title} em={text.mind.titleEm} />
        <div className="mind">
          <div className="mind__words" role="tablist" aria-label={t('mind.tabs')} onKeyDown={onKey}>
            {mind.map((m, i) => (
              <button
                key={`${m.word}-${i}`}
                type="button"
                role="tab"
                id={`mind-tab-${i}`}
                aria-selected={active === i}
                aria-controls="mind-panel"
                tabIndex={active === i ? 0 : -1}
                className={`mind__word${active === i ? ' is-on' : ''}`}
                onClick={() => setActive(i)}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                data-reveal
                style={{ '--d': `${i * 0.08}s` }}
              >
                <span className="mind__n">0{i + 1}</span>
                {m.word}
              </button>
            ))}
          </div>
          <div id="mind-panel" className="mind__panel" role="tabpanel" aria-labelledby={`mind-tab-${active}`} data-reveal>
            <Media
              key={`${cur.word}-${active}`}
              className="mind__media"
              src={cur.image}
              alt={cur.imageAlt || t('mind.imageAlt', { word: cur.word })}
              pos={cur.imagePos}
              framed
              bg={cur.bg}
              art={cur.art}
              label={t('mind.imageLabel', { label: cur.imgLabel })}
              ratio="5 / 4"
            />
            <div key={`t-${active}`} className="mind__text">
              <p className="mind__q">{cur.q}</p>
              <p className="body-muted">{cur.text}</p>
              {cur.links.length > 0 && (
                <p className="mind__links">
                  <span>{t('mind.informs')}</span>
                  {cur.links.map((k) => (
                    <span key={k} className="chip chip--aqua">{k}</span>
                  ))}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
