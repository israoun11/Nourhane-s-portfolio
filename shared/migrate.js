// Brings content saved by earlier versions of the website up to date, without
// losing anything, and fills in the default French/Arabic translations of texts
// that are still the original English (shared/i18n/content-*.js).
// Used by the server whenever content is read, and by the browser for previews.
import { schema, isTranslatable } from './schema.js';
import { defaultContent } from './default-content.js';
import { TRANSLATED } from './i18n/langs.js';
import fr from './i18n/content-fr.js';
import ar from './i18n/content-ar.js';

const DICTS = { fr, ar };
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const PHOTO_SLOTS = 4;

function translateValue(def, value, dict) {
  if (def.type === 'tags') {
    if (!Array.isArray(value) || !value.length) return undefined;
    if (!value.some((x) => dict[x] !== undefined)) return undefined;
    return value.map((x) => (dict[x] !== undefined ? dict[x] : x));
  }
  if (typeof value !== 'string' || !value) return undefined;
  return dict[value];
}

/** Adds missing translations (never overwrites one that exists). Mutates `value`. */
function fillTranslations(def, value) {
  if (def.type === 'list') {
    if (Array.isArray(value)) value.forEach((item) => fillTranslations(def.of, item));
    return;
  }
  if (def.type !== 'object' || !isObj(value)) return;
  for (const [k, sub] of Object.entries(def.fields)) {
    if (sub.type === 'object' || sub.type === 'list') fillTranslations(sub, value[k]);
  }
  for (const lang of TRANSLATED) {
    for (const [k, sub] of Object.entries(def.fields)) {
      if (!isTranslatable(sub)) continue;
      const have = value.i18n && value.i18n[lang] && value.i18n[lang][k];
      if (have !== undefined && have !== '' && !(Array.isArray(have) && !have.length)) continue;
      const t = translateValue(sub, value[k], DICTS[lang]);
      if (t === undefined) continue;
      value.i18n = isObj(value.i18n) ? value.i18n : {};
      value.i18n[lang] = isObj(value.i18n[lang]) ? value.i18n[lang] : {};
      value.i18n[lang][k] = t;
    }
  }
}

export function migrateContent(input, { translations = true } = {}) {
  if (!isObj(input)) return input;
  const doc = structuredClone(input);

  // Logo carousel (added after the first version)
  if (!Array.isArray(doc.logos)) doc.logos = structuredClone(defaultContent.logos);

  // "My story": one optional image per year → at least four photo slots per year
  if (Array.isArray(doc.timeline)) {
    doc.timeline = doc.timeline.map((m) => {
      if (!isObj(m)) return m;
      const out = { ...m };
      if (!Array.isArray(out.photos)) {
        out.photos = out.image ? [{ src: out.image, caption: '' }] : [];
        while (out.photos.length < PHOTO_SLOTS) out.photos.push({ src: '', caption: '' });
      }
      delete out.image;
      return out;
    });
  }

  // Project approach steps: plain text → { text, image }
  if (Array.isArray(doc.projects)) {
    doc.projects = doc.projects.map((p) =>
      isObj(p) && Array.isArray(p.approach)
        ? { ...p, approach: p.approach.map((a) => (typeof a === 'string' ? { text: a, image: '' } : a)) }
        : p
    );
  }

  if (translations) fillTranslations(schema, doc);
  return doc;
}
