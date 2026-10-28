import { useContent } from '../content/ContentProvider.jsx';
import { Button, Media, Words, countWords } from '../components/ui.jsx';
import { useT } from '../i18n/index.jsx';

export default function CodaStudio() {
  const { site, codaServices, text } = useContent();
  const t = text.coda;
  const tr = useT();
  const [w1, w2] = site.codastudio.work;
  return (
    <section id="codastudio" className="section coda on-dark" aria-labelledby="coda-title">
      <div className="coda__ring" aria-hidden="true" />
      <div className="container coda__grid">
        <div className="coda__copy">
          <p className="eyebrow c-pink" data-reveal>{t.eyebrow}</p>
          <h2 id="coda-title" className="h-cond coda__title" data-reveal="words">
            <Words text={t.title} />
            <br />
            <span className="it c-pink"><Words text={t.titleEm} start={countWords(t.title)} /></span>
          </h2>
          <p className="coda__text" data-reveal>{t.text}</p>
          <ul className="chips coda__chips" data-reveal>
            {codaServices.map((s) => <li key={s} className="chip chip--light">{s}</li>)}
          </ul>
          <div className="coda__ctas" data-reveal>
            <Button href={site.codastudioUrl || undefined} to={site.codastudioUrl ? undefined : '/#codastudio'} variant="pink" arrow magnetic>
              {t.cta1}
            </Button>
            <Button to="/#contact" variant="outline-light">{t.cta2}</Button>
          </div>
        </div>
        <div className="coda__visuals">
          <Media className="coda__logo" src={site.codastudio.logo} alt={tr('coda.logoAlt')} bg="#1534DD" label={tr('coda.logoPh')} reveal>
            {!site.codastudio.logo && <span className="coda__word">Coda<em>Studio</em></span>}
          </Media>
          <Media className="coda__tile" src={w1} alt={tr('coda.projectAlt')} bg="#2E2E46" reveal>
            {!w1 && <span className="coda__ph">{tr('coda.projectPh')}</span>}
          </Media>
          <Media className="coda__tile" src={w2} alt={tr('coda.projectAlt')} bg="#B9E8E5" reveal style={{ '--d': '.12s' }}>
            {!w2 && <span className="coda__ph coda__ph--dark">{tr('coda.projectPh')}</span>}
          </Media>
        </div>
      </div>
    </section>
  );
}
