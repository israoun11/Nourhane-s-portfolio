import { useState } from 'react';
import { useContent } from '../content/ContentProvider.jsx';
import { SplitHeading } from '../components/ui.jsx';

const ph = {
  'WRITTEN TESTIMONIAL': '[Verified client testimonial — to be supplied.]',
  'REVIEW SCREENSHOT': '[Screenshot of an authentic client review — to be supplied.]',
  'AUDIO REVIEW': '[Audio player and transcript of a client voice note — to be supplied.]',
  'PROJECT FEEDBACK': '[Feedback tied to a specific case study — to be supplied.]',
};

export default function Testimonials() {
  const { testimonials, text } = useContent();
  const [sel, setI] = useState(0);
  const n = testimonials.length;
  const i = n ? sel % n : 0;
  const t = testimonials[i];
  const go = (d) => setI((v) => (v + d + n) % n);
  if (!n) return null;

  return (
    <section className="section proof" aria-labelledby="proof-title" aria-roledescription="carousel">
      <div className="container">
        <div className="section-head">
          <SplitHeading id="proof-title" title={text.proof.title} em={text.proof.titleEm} />
          <div className="proof__nav" data-reveal>
            <span>{String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
            <button type="button" className="round-btn" onClick={() => go(-1)} aria-label="Previous testimonial">←</button>
            <button type="button" className="round-btn round-btn--fill" onClick={() => go(1)} aria-label="Next testimonial">→</button>
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
            <span className="proof__kind">{t.kind}</span>
            <span className="proof__big">{t.big}</span>
          </div>
          <div key={`m-${i}`} className="proof__main">
            {t.image && <img className="proof__shot" src={t.image} alt={`Client review from ${t.name || 'a client'}`} loading="lazy" />}
            {t.audio && <audio className="proof__audio" controls src={t.audio} />}
            <blockquote className={t.quote ? 'is-real' : ''}>{t.quote || ph[t.kind]}</blockquote>
            <figcaption>
              <span aria-hidden="true" className="proof__avatar" />
              <span>
                <strong>{t.name || '[Client name]'}</strong>
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
