import { useContent } from '../content/ContentProvider.jsx';
import { Words, countWords } from '../components/ui.jsx';
import { useT } from '../i18n/index.jsx';

function Thumb({ s }) {
  const t = useT();
  return (
    <div className="series__frame" style={{ background: s.bg, clipPath: s.clip }}>
      <div className="series__photo" aria-hidden={!s.thumb}>
        {s.thumb ? (
          <img src={s.thumb} alt={t('series.thumbAlt', { title: `${s.a} ${s.b}` })} loading="lazy" />
        ) : (
          <>
            <span className="series__head" />
            <span className="series__body" />
          </>
        )}
      </div>
      <span className="series__play" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24"><path d="M8 5 L19 12 L8 19 Z" fill="#202033" /></svg>
      </span>
      <div className="series__labels">
        <span>{s.a}</span>
        <span>{s.b}</span>
      </div>
      {!s.thumb && <span className="ph-label series__ph">{t('series.thumbPh')}</span>}
    </div>
  );
}

export default function Personality() {
  const { series, text } = useContent();
  const t = text.personality;
  const tr = useT();
  return (
    <section id="insights" className="section pers on-dark" aria-labelledby="pers-title">
      <svg className="pers__spark" aria-hidden="true" viewBox="0 0 120 60">
        <path d="M10 50 L4 30 M30 44 L32 14 M52 50 L74 30" />
      </svg>
      <div className="container">
        <h2 id="pers-title" className="h-cond pers__title" data-reveal="words">
          <Words text={t.title} />
          <br />
          <span className="it c-pink"><Words text={t.titleEm} start={countWords(t.title)} /></span>
        </h2>
        {t.annotation && <p className="annot pers__annot" aria-hidden="true" data-reveal>{t.annotation}</p>}
        <div className="series">
          {series.map((s, i) => {
            const body = (
              <>
                <Thumb s={s} />
                <p className="series__d">{s.d}</p>
                <span className="series__cta">{s.href ? tr('series.watch') : tr('series.soon')}</span>
              </>
            );
            const style = { marginTop: s.offset, '--rot': s.rot, '--d': `${i * 0.12}s` };
            return s.href ? (
              <a key={`${s.a}-${i}`} className="series__item" href={s.href} target="_blank" rel="noreferrer" style={style} data-cursor={tr("cursor.watch")} data-reveal>
                {body}
              </a>
            ) : (
              <div key={`${s.a}-${i}`} className="series__item" style={style} data-reveal>
                {body}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
