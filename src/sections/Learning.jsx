import { useContent } from '../content/ContentProvider.jsx';
import { Button, CountUp, Media, SplitHeading } from '../components/ui.jsx';

export default function Learning() {
  const { site, learning, text } = useContent();
  const t = text.learning;
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
            {t1 ? <Media className="learn__photo" src={t1} alt="Digital marketing training session" reveal /> : <div className="learn__ph">Training photography<br />— to add</div>}
            {t2 ? <Media className="learn__photo" src={t2} alt="Workshop material" reveal /> : <div className="learn__ph">Workshop material or<br />participant feedback — to add</div>}
          </div>
          <div className="learn__list" data-reveal style={{ '--d': '.2s' }}>
            <ul>
              {learning.map((l) => (
                <li key={`${l.title}-${l.status}`}>
                  <span>{l.title}</span>
                  <span className={`status status--${l.status}`}>{l.status === 'available' ? 'AVAILABLE' : 'COMING SOON'}</span>
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
