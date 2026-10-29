// Interface language: English, French or Arabic.
// The visitor's choice is remembered (this browser + a cookie the server reads to send
// the page in the right direction straight away) and kept while navigating.
//
// Texts of the interface (buttons, labels, messages) live in src/i18n/site/<lang>.js
// and src/i18n/admin/<lang>.js. Texts of the website content are edited in the dashboard.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANG, LANGS, dirOf, isLang } from '../../shared/i18n/langs.js';
import en from './site/en.js';
import fr from './site/fr.js';
import ar from './site/ar.js';

const SITE = { en, fr, ar };
const STORE_KEY = 'nt-lang';
const Ctx = createContext(null);

export { LANGS, dirOf };

/** The language to start with: ?lang= in the address, then the remembered choice, then English. */
export function initialLang() {
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (isLang(q)) return q;
  } catch {
    /* ignore */
  }
  try {
    const s = localStorage.getItem(STORE_KEY);
    if (isLang(s)) return s;
  } catch {
    /* storage blocked */
  }
  const c = document.cookie.match(/(?:^|;\s*)nt_lang=([a-z]{2})/);
  if (c && isLang(c[1])) return c[1];
  return DEFAULT_LANG;
}

export function applyLang(lang) {
  const root = document.documentElement;
  root.lang = lang;
  root.dir = dirOf(lang);
}

function remember(lang) {
  try {
    localStorage.setItem(STORE_KEY, lang);
  } catch {
    /* storage blocked: the cookie still works */
  }
  document.cookie = `nt_lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

const fill = (s, vars) => (vars ? String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '')) : s);

/** Builds a t() function from one or more dictionaries ({ en, fr, ar }). English is the fallback. */
export function makeT(dicts, lang) {
  return (key, vars) => {
    for (const d of dicts) {
      const v = d[lang] && d[lang][key];
      if (v !== undefined) return fill(v, vars);
    }
    for (const d of dicts) {
      const v = d.en && d.en[key];
      if (v !== undefined) return fill(v, vars);
    }
    return key;
  };
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const l = initialLang();
    applyLang(l);
    return l;
  });

  useEffect(() => {
    remember(lang);
    // Remove ?lang= from the address once it has been applied (the choice is remembered).
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('lang')) {
        url.searchParams.delete('lang');
        window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
      }
    } catch {
      /* ignore */
    }
  }, [lang]);

  const setLang = useCallback((l) => {
    if (!isLang(l)) return;
    applyLang(l);
    setLangState(l);
  }, []);

  const t = useMemo(() => makeT([SITE], lang), [lang]);
  const value = useMemo(() => ({ lang, dir: dirOf(lang), setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Adds more dictionaries for a part of the app (the dashboard brings its own texts). */
export function WithDictionaries({ dicts, children }) {
  const parent = useContext(Ctx);
  const t = useMemo(() => makeT([...dicts, SITE], parent.lang), [dicts, parent.lang]);
  const value = useMemo(() => ({ ...parent, t }), [parent, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Interface texts changed by the owner in the dashboard ({ en|fr|ar: { key: text } }) win over the built-in ones. */
export function UiTexts({ ui, children }) {
  const parent = useContext(Ctx);
  const t = useMemo(() => (ui && Object.keys(ui).length ? makeT([ui, SITE], parent.lang) : parent.t), [ui, parent.lang, parent.t]);
  const value = useMemo(() => ({ ...parent, t }), [parent, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
export const useT = () => useContext(Ctx).t;
export const useLang = () => useContext(Ctx).lang;
