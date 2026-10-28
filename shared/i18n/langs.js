// Languages of the website. English is the main language: every text is written in
// English first; French and Arabic are stored as translations next to it.
export const LANGS = [
  { code: 'en', label: 'English', short: 'EN', dir: 'ltr' },
  { code: 'fr', label: 'Français', short: 'FR', dir: 'ltr' },
  { code: 'ar', label: 'العربية', short: 'ع', dir: 'rtl' },
];
export const DEFAULT_LANG = 'en';
export const TRANSLATED = ['fr', 'ar']; // stored in `i18n.<lang>` next to the English text
export const isLang = (v) => LANGS.some((l) => l.code === v);
export const dirOf = (code) => (LANGS.find((l) => l.code === code) || LANGS[0]).dir;
