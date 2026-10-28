import { useRef } from 'react';
import { useContent } from '../content/ContentProvider.jsx';
import { Button } from '../components/ui.jsx';
import { usePointerVars, useScrollVar } from '../hooks/motion.js';
import { useT } from '../i18n/index.jsx';

export default function Hero() {
  const { site, text } = useContent();
  const t = text.hero;
  const tr = useT();
  const ref = useRef(null);
  usePointerVars(ref);
  useScrollVar(ref, { mode: 'exit', name: '--hp' });

  return (
    <section ref={ref} className="hero" aria-labelledby="hero-title">
      <div className="hero__grid">
        <div className="hero__copy">
          <p className="hero__hello in-1">
            <span aria-hidden="true" />
            {t.hello}
          </p>
          <h1 id="hero-title" className="hero__title">
            <span className="line">
              <span className="t-cond" style={{ animationDelay: '.1s' }}>{t.line1}</span>
            </span>
            <span className="line">
              <span className="t-serif" style={{ animationDelay: '.22s' }}>{t.line2}</span>
            </span>
            <span className="line line--last">
              <span className="t-cond t-anchor" style={{ animationDelay: '.34s' }}>
                {t.line3}
                <svg className="hero__scribble" aria-hidden="true" viewBox="0 0 300 24" preserveAspectRatio="none">
                  <path pathLength="1" d="M4 16 C 60 6, 140 4, 296 10 M 30 20 C 110 14, 200 14, 270 17" />
                </svg>
                <svg className="hero__spark" aria-hidden="true" viewBox="0 0 40 40">
                  <path d="M8 32 L2 22 M16 28 L16 12 M24 32 L36 22" />
                </svg>
              </span>
            </span>
          </h1>
          <p className="hero__tag in-1">
            {t.tagA} <em>{t.tagB}</em> {t.tagC}
          </p>
          <p className="hero__intro in-2">{t.intro}</p>
          <div className="hero__ctas in-3">
            <Button to="/#work" arrow magnetic>{t.cta1}</Button>
            <Button to="/#story" variant="outline">{t.cta2}</Button>
          </div>
        </div>

        <div className="hero__visual">
          <div className="hero__layer hero__layer--back" aria-hidden="true">
            <div className="hero__block hero__block--blue" />
            <div className="hero__block hero__block--pink" />
          </div>
          <div className="hero__portrait-wrap">
            <figure className="hero__portrait">
              {site.portrait ? (
                <img src={site.portrait} alt={tr('hero.portraitAlt', { name: site.name })} fetchPriority="high" />
              ) : (
                <>
                  <div className="hero__ph" aria-hidden="true">
                    <span className="hero__ph-head" />
                    <span className="hero__ph-body" />
                  </div>
                  <figcaption>
                    <strong>{tr('hero.portraitPh')}</strong> {tr('hero.portraitPhText')}
                  </figcaption>
                </>
              )}
            </figure>
          </div>
          <div className="hero__layer hero__layer--front">
            <div className="hero__labels" aria-hidden="true">
              <span>{t.label1}</span>
              <span>{t.label2}</span>
            </div>
            <svg className="hero__cursor" aria-hidden="true" viewBox="0 0 24 24">
              <path d="M4 2 L20 12 L12 13.5 L8 21 Z" />
            </svg>
            <p className="hero__annot annot" aria-hidden="true">{t.annotation}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
