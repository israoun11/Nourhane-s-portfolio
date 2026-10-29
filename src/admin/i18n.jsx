// Dashboard languages:
//  • the interface language (menus, buttons, messages) — same switch as the website
//  • the content language being edited (English is the main version; French is
//    stored as translations next to each English text)
import { createContext, useContext, useMemo, useState } from 'react';
import { WithDictionaries, useI18n } from '../i18n/index.jsx';
import { LANGS, dirOf } from '../../shared/i18n/langs.js';
import { formatMessage, isTranslatable } from '../../shared/schema.js';
import en from '../i18n/admin/en.js';
import fr from '../i18n/admin/fr.js';
import schemaFr from '../i18n/admin/schema-fr.js';

const ADMIN = [{ en, fr }];
const SCHEMA = { fr: schemaFr };

export function AdminI18n({ children }) {
  return <WithDictionaries dicts={ADMIN}>{children}</WithDictionaries>;
}

export const useAdminT = () => useI18n().t;

/** Translates a label or help text written in shared/schema.js. */
export function useL() {
  const { lang } = useI18n();
  return useMemo(() => (s) => (s && SCHEMA[lang] && SCHEMA[lang][s]) || s, [lang]);
}

/** A validation error ({ code, params, label }) in the interface language. */
export function useErrorText() {
  const t = useAdminT();
  const L = useL();
  return (e, withLabel = true) => {
    const m = e.path && e.path.match(/\.i18n\.(fr)\./);
    const langName = m ? ` (${LANGS.find((l) => l.code === m[1]).label})` : '';
    const text = e.code ? t(`val.${e.code}`, e.params) : formatMessage(e.message || '', {});
    if (e.code === 'slugTaken') return text;
    return withLabel && e.label ? `${L(e.label)}${langName}: ${text}` : text;
  };
}

export const fmtDateIn = (iso, lang) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
};
export const useFmtDate = () => {
  const { lang } = useI18n();
  return (iso) => fmtDateIn(iso, lang);
};

// ── content language being edited ──
const EditCtx = createContext({ editLang: 'en', setEditLang: () => {} });

export function EditLangProvider({ children }) {
  const [editLang, setEditLang] = useState('en');
  const value = useMemo(() => ({ editLang, setEditLang }), [editLang]);
  return <EditCtx.Provider value={value}>{children}</EditCtx.Provider>;
}
export const useEditLang = () => useContext(EditCtx);

/** Renders fields for one content language regardless of the language chosen at the top. */
export function FixedEditLang({ lang, children }) {
  const parent = useContext(EditCtx);
  const value = useMemo(() => ({ ...parent, editLang: lang }), [parent, lang]);
  return <EditCtx.Provider value={value}>{children}</EditCtx.Provider>;
}

/**
 * Where a field is stored for the language being edited:
 * texts in French go to `<object>.i18n.<lang>.<key>`, everything else is shared.
 */
export function editPath(def, path, editLang) {
  if (editLang === 'en' || !isTranslatable(def) || !path.length) return { path, translation: false };
  const key = path[path.length - 1];
  return { path: [...path.slice(0, -1), 'i18n', editLang, key], translation: true, englishPath: path };
}

/** Input attributes so French text is typed in the right direction. */
export const inputLangProps = (code) => ({ lang: code, dir: dirOf(code) });

export { LANGS };
