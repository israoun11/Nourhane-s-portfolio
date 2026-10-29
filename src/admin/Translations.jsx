// Every text that has no French or Arabic version yet — filled in right here.
// (On the website, a text without translation would otherwise appear in English.)
import { useMemo, useState } from 'react';
import { Link } from '../router.jsx';
import { schema } from '../../shared/schema.js';
import { missingTranslations } from '../../shared/migrate.js';
import { Field } from './fields.jsx';
import { useEditor } from './state.jsx';
import { Card, PageHead } from './ui.jsx';
import { FixedEditLang, LANGS, useAdminT, useL } from './i18n.jsx';

const SECTION_LINK = (path) => {
  const [top, i] = path;
  if (top === 'projects') return `/admin/projects/${i}`;
  if (top === 'text') return '/admin/texts';
  if (top === 'site') return '/admin/site';
  return `/admin/sections/${top}`;
};

export const useMissingCounts = () => {
  const { draft } = useEditor();
  return useMemo(() => (draft ? { fr: missingTranslations(draft, 'fr').length, ar: missingTranslations(draft, 'ar').length } : { fr: 0, ar: 0 }), [draft]);
};

export function Translations() {
  const t = useAdminT();
  const L = useL();
  const { draft, saved } = useEditor();
  const [lang, setLang] = useState('fr');
  const counts = useMissingCounts();
  // The list is fixed until the next save, so a field doesn't vanish while you type in it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => missingTranslations(draft, lang), [lang, saved && saved.version]);
  // Group by the place in the dashboard where the text lives (section / project).
  const groups = useMemo(() => {
    const m = new Map();
    for (const it of items) {
      const [top, i] = it.path;
      const key = top === 'projects' ? `projects.${i}` : top;
      const title = top === 'projects' ? `${L(schema.fields.projects.label)} · ${draft.projects[i]?.title || i + 1}` : L(schema.fields[top].label);
      if (!m.has(key)) m.set(key, { title, link: SECTION_LINK(it.path), items: [] });
      m.get(key).items.push(it);
    }
    return [...m.values()];
  }, [items, draft, L]);
  const name = LANGS.find((l) => l.code === lang).label;

  return (
    <>
      <PageHead title={t('ad.tr.title')} intro={t('ad.tr.intro')} />
      <div className="ad-editlang ad-editlang--static" role="group" aria-label={t('ad.editLang')}>
        <div className="ad-editlang__btns">
          {LANGS.filter((l) => l.code !== 'en').map((l) => (
            <button key={l.code} type="button" lang={l.code} className={`ad-chip${lang === l.code ? ' is-on' : ''}`} aria-pressed={lang === l.code} onClick={() => setLang(l.code)}>
              {l.label} · {t('ad.tr.count', { n: counts[l.code] })}
            </button>
          ))}
        </div>
      </div>
      {items.length === 0 ? (
        <div className="ad-alert ad-alert--ok" role="status">{t('ad.tr.done', { lang: name })}</div>
      ) : (
        <>
          <div className="ad-alert ad-alert--warn" role="status">{t('ad.tr.missing', { n: items.length, lang: name })}</div>
          <FixedEditLang lang={lang}>
            {groups.map((g) => (
              <Card key={g.title} title={g.title}>
                {g.items.map((it) => (
                  <Field key={it.path.join('.')} def={{ ...it.def, help: undefined }} path={it.path} />
                ))}
                <Link className="ad-link" to={g.link}>{t('ad.tr.open')}</Link>
              </Card>
            ))}
          </FixedEditLang>
        </>
      )}
    </>
  );
}
