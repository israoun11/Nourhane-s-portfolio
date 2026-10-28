import { useContent } from '../content/ContentProvider.jsx';
import { Button, CountUp, Media, SplitHeading } from '../components/ui.jsx';
import { useT } from '../i18n/index.jsx';

export default function Learning() {
  const { site, learning, text } = useContent();
  const t = text.learning;
  const tr = useT();
  const lines = (s) => s.split('\n').map((x, i) => (i ? [<br key={i} />, x] : x));
  const [t1, t2] = site.training;
  return (
    <section id="learning" className="section" aria-labelledby="edu-title">
      <div className="container">
        <SplitHeading id="edu-title" title={t.title} em={t.titleEm} />
        <div className="learn">
          <div className="learn__stat" data-reveal>
            <span className="learn__circle" aria-hidden="true" />
            <p className="learn__big"><CountUp key={t.statValue} to={t.statValue} suffix={t.statSuffix} /></p>
            <p className="learn__label">{t.statLabel}</p>
            <p className="learn__sub">{t.statSub}</p>
          </div>
          <div className="learn__photos" data-reveal style={{ '--d': '.1s' }}>
            {t1 ? <Media className="learn__photo" src={t1} alt={tr('learning.photo1Alt')} reveal /> : <div className="learn__ph">{lines(tr('learning.ph1'))}</div>}
            {t2 ? <Media className="learn__photo" src={t2} alt={tr('learning.photo2Alt')} reveal /> : <div className="learn__ph">{lines(tr('learning.ph2'))}</div>}
          </div>
          <div className="learn__list" data-reveal style={{ '--d': '.2s' }}>
            <ul>
              {learning.map((l) => (
                <li key={`${l.title}-${l.status}`}>
                  <span>{l.title}</span>
                  <span className={`status status--${l.status}`}>{l.status === 'available' ? tr('status.available') : tr('status.soon')}</span>
                </li>
              ))}
            </ul>
            <Button to="/#products" variant="ink" size="md" arrow>{t.cta}</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
