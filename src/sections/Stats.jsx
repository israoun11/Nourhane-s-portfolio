import { useContent } from '../content/ContentProvider.jsx';
import { Link } from '../router.jsx';
import { useT } from '../i18n/index.jsx';

// Key figures (edited in the dashboard). Moderate type, no decoration competing with the numbers.
export default function Stats() {
  const { stats = [] } = useContent();
  const t = useT();
  if (!stats.length) return null;
  return (
    <section className="stats" aria-label={t('stats.label')}>
      <ul className="stats__list container">
        {stats.map((s, i) => {
          const inner = (
            <>
              <span className="stats__v">{s.value}</span>
              <span className="stats__l">{s.label}</span>
              {s.description && <span className="stats__d">{s.description}</span>}
            </>
          );
          const ext = /^https?:/.test(s.href || '');
          return (
            <li key={`${s.label}-${i}`} className="stats__item" data-reveal style={{ '--d': `${i * 0.08}s` }}>
              {s.href ? (
                <Link to={s.href} className="stats__link" {...(ext ? { target: '_blank', rel: 'noreferrer' } : {})}>{inner}</Link>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
