import { useContent } from '../content/ContentProvider.jsx';
import { SplitHeading } from '../components/ui.jsx';
import ICONS from '../data/tool-icons.js';

// Tools, platforms & technologies — grouped by category (edited in the dashboard).
export default function Tools() {
  const { tools = [], text } = useContent();
  const head = (text && text.tools) || {};
  if (!tools.length) return null;
  return (
    <section id="tools" className="section tools" aria-labelledby="tools-title">
      <div className="container">
        <div className="section-head">
          <SplitHeading id="tools-title" title={head.title} em={head.titleEm} />
          {head.intro && <p data-reveal>{head.intro}</p>}
        </div>
        <div className="tools__grid">
          {tools.map((c, i) => (
            <div key={`${c.title}-${i}`} className="tools__cat" data-reveal style={{ '--d': `${(i % 3) * 0.06}s` }}>
              <h3 className="tools__title">
                <span>{c.title}</span>
                <span className="tools__count" aria-hidden="true">{String(c.tools.length).padStart(2, '0')}</span>
              </h3>
              <ul className="tools__list">
                {c.tools.map((x, k) => {
                  const body = (
                    <>
                      {x.icon ? (
                        <img className="tools__icon" src={x.icon} alt="" loading="lazy" />
                      ) : ICONS[x.name.trim().toLowerCase()] ? (
                        <svg className="tools__icon tools__icon--svg" viewBox={ICONS[x.name.trim().toLowerCase()].v} aria-hidden="true"><path d={ICONS[x.name.trim().toLowerCase()].d} /></svg>
                      ) : (
                        <span className="tools__mono" aria-hidden="true">{x.name.trim().charAt(0).toUpperCase()}</span>
                      )}
                      <span className="tools__name">{x.name}</span>
                      {x.description && <span className="tools__desc">{x.description}</span>}
                    </>
                  );
                  return (
                    <li key={`${x.name}-${k}`} className="tools__tool">
                      {x.url ? <a href={x.url} target="_blank" rel="noreferrer" className="tools__a">{body}</a> : <span className="tools__a">{body}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
