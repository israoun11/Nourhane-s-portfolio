// Languages of the website: English (main language) and French. Every text is written in
// English first; French is stored as a translation next to it.
export const LANGS = [
  { code: 'en', label: 'English', short: 'EN', dir: 'ltr' },
  { code: 'fr', label: 'Français', short: 'FR', dir: 'ltr' },
];
export const DEFAULT_LANG = 'en';
export const TRANSLATED = ['fr']; // stored in `i18n.<lang>` next to the English text
// Arabic is no longer a website language. Arabic texts saved by an earlier version are kept
// untouched in the stored content (never shown, never deleted), in case they are needed again.
export const KEPT_TRANSLATIONS = ['fr', 'ar'];
export const isLang = (v) => LANGS.some((l) => l.code === v);
export const dirOf = (code) => (LANGS.find((l) => l.code === code) || LANGS[0]).dir;
