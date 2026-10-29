import { useMemo, useState } from 'react';
import { useContent } from '../content/ContentProvider.jsx';
import { SplitHeading } from '../components/ui.jsx';
import { useT } from '../i18n/index.jsx';
import ICONS from '../data/tool-icons.js';

/** Two letters for a tool card: set in the dashboard, otherwise from the name (CapCut → Cc, Meta Ads Manager → Ma). */
export function toolSymbol(t) {
  if (t.symbol) return t.symbol;
  const words = t.name.trim().split(/\s+/);
  if (words.length > 1) return (words[0][0] + words[1][0].toLowerCase()).replace(/^./, (c) => c.toUpperCase());
  const caps = t.name.match(/[A-Z]/g) || [];
  return caps.length >= 2 ? caps[0] + caps[1].toLowerCase() : t.name.slice(0, 2).replace(/^./, (c) => c.toUpperCase());
}

function Logo({ tool, big = false }) {
  const icon = ICONS[tool.name.trim().toLowerCase()];
  if (tool.icon) return <img className="tk__logo-img" src={tool.icon} alt="" />;
  if (icon) {
    return (
      <svg className="tk__logo-svg" viewBox={icon.v} aria-hidden="true">
        <path d={icon.d} />
      </svg>
    );
  }
  return <b className={`tk__logo-sym${big ? ' is-big' : ''}`} aria-hidden="true">{toolSymbol(tool)}</b>;
}

// Tools, platforms & technologies — category filters, tool cards and a detail panel.
export default function Tools() {
  const { tools = [], text } = useContent();
  const t = useT();
  const head = (text && text.tools) || {};
  const [cat, setCat] = useState(-1); // -1 = all
  const all = useMemo(() => tools.flatMap((c, ci) => c.tools.map((x, ti) => ({ ...x, cat: c.title, ci, key: `${ci}-${ti}` }))), [tools]);
  const shown = cat < 0 ? all : all.filter((x) => x.ci === cat);
  const [selKey, setSel] = useState('');
  const sel = shown.find((x) => x.key === selKey) || shown[0];
  if (!tools.length) return null;

  return (
    <section id="tools" className="section tools" aria-labelledby="tools-title">
      <div className="container">
        <div className="section-head">
          <SplitHeading id="tools-title" title={head.title} em={head.titleEm} />
          {head.intro && <p data-reveal>{head.intro}</p>}
        </div>

        <div className="tk__chips" role="group" aria-label={t('tools.filter')} data-reveal>
          <button type="button" className={`tk__chip${cat < 0 ? ' is-on' : ''}`} aria-pressed={cat < 0} onClick={() => setCat(-1)}>
            {t('tools.all')}
          </button>
          {tools.map((c, i) => (
            <button key={`${c.title}-${i}`} type="button" className={`tk__chip${cat === i ? ' is-on' : ''}`} aria-pressed={cat === i} onClick={() => setCat(i)}>
              {c.title}
            </button>
          ))}
        </div>
        {cat >= 0 && tools[cat].description && <p className="tk__catdesc">{tools[cat].description}</p>}

        <div className="tk">
          <ul className="tk__grid" aria-label={t('tools.list')}>
            {shown.map((x, i) => (
              <li key={x.key}>
                <button
                  type="button"
                  className={`tk__card tk__card--${'abc'[i % 3]}${sel && sel.key === x.key ? ' is-on' : ''}`}
                  aria-pressed={!!sel && sel.key === x.key}
                  onClick={() => setSel(x.key)}
                  onMouseEnter={() => setSel(x.key)}
                  onFocus={() => setSel(x.key)}
                >
                  <span className="tk__arrow" aria-hidden="true">→</span>
                  <span className="tk__sym" aria-hidden="true">{toolSymbol(x)}</span>
                  <span className="tk__name">{x.name}</span>
                  <span className="tk__cat">{x.cat}</span>
                </button>
              </li>
            ))}
          </ul>

          {sel && (
            <aside className="tk__panel" aria-live="polite">
              <span className="tk__eyebrow">{t('tools.mine')}</span>
              <div className="tk__logo">
                <Logo tool={sel} big />
                <span className="tk__spark" aria-hidden="true">✳</span>
              </div>
              <p className="tk__pname">{sel.name}</p>
              {sel.description && <p className="tk__pdesc">{sel.description}</p>}
              <p className="tk__pcat">{sel.cat}</p>
              {sel.url && (
                <a className="ulink tk__plink" href={sel.url} target="_blank" rel="noreferrer">
                  {t('tools.visit')} <span aria-hidden="true">↗</span>
                </a>
              )}
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
