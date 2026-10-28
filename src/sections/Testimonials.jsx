import { useState } from 'react';
import { useContent } from '../content/ContentProvider.jsx';
import { SplitHeading } from '../components/ui.jsx';
import { useT } from '../i18n/index.jsx';

export default function Testimonials() {
  const { testimonials, text } = useContent();
  const tr = useT();
  const [sel, setI] = useState(0);
  const n = testimonials.length;
  const i = n ? sel % n : 0;
  const t = testimonials[i];
  const go = (d) => setI((v) => (v + d + n) % n);
  if (!n) return null;

  return (
    <section className="section proof" aria-labelledby="proof-title" aria-roledescription={tr('proof.carousel')}>
      <div className="container">
        <div className="section-head">
          <SplitHeading id="proof-title" title={text.proof.title} em={text.proof.titleEm} />
          <div className="proof__nav" data-reveal>
            <span>{String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
            <button type="button" className="round-btn" onClick={() => go(-1)} aria-label={tr('proof.prev')}>←</button>
            <button type="button" className="round-btn round-btn--fill" onClick={() => go(1)} aria-label={tr('proof.next')}>→</button>
          </div>
        </div>
        <figure
          className="proof__card"
          aria-live="polite"
          data-reveal
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') go(1);
            if (e.key === 'ArrowLeft') go(-1);
          }}
        >
          <div key={`s-${i}`} className="proof__side" style={{ background: t.bg, color: t.fg }}>
            <span className="proof__kind">{tr(`proof.kind.${t.kind}`)}</span>
            <span className="proof__big">{t.big}</span>
          </div>
          <div key={`m-${i}`} className="proof__main">
            {t.image && <img className="proof__shot" src={t.image} alt={tr('proof.reviewAlt', { name: t.name || tr('proof.aClient') })} loading="lazy" />}
            {t.audio && <audio className="proof__audio" controls src={t.audio} />}
            <blockquote className={t.quote ? 'is-real' : ''}>{t.quote || tr(`proof.ph.${t.kind}`)}</blockquote>
            <figcaption>
              <span aria-hidden="true" className="proof__avatar" />
              <span>
                <strong>{t.name || tr('proof.namePh')}</strong>
                <br />
                {t.meta}
              </span>
            </figcaption>
          </div>
        </figure>
        {text.proof.note && <p className="proof__note">{text.proof.note}</p>}
      </div>
    </section>
  );
}
