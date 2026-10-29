// Brings content saved by earlier versions of the website up to date, without
// losing anything, and fills in the default French translations of texts
// that are still the original English (shared/i18n/content-*.js).
// Used by the server whenever content is read, and by the browser for previews.
import { schema, isTranslatable } from './schema.js';
import { BOOKING_CARD, defaultContent } from './default-content.js';
import { TRANSLATED } from './i18n/langs.js';
import fr from './i18n/content-fr.js';

// Texts are matched loosely: spacing, apostrophe/quote style and capital letters don't matter,
// so a text that was only retyped or re-capitalised still gets its translation.
export const normalizeText = (v) =>
  String(v)
    .normalize('NFC')
    .replace(/[\u2018\u2019\u02BC`]/g, "'")
    .replace(/[\u201C\u201D«»]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
const index = (dict) => {
  const m = new Map();
  for (const [k, v] of Object.entries(dict)) m.set(normalizeText(k), v);
  return m;
};
const DICTS = { fr: index(fr) };
const isUpper = (s) => /[A-Z]/.test(s) && s === s.toUpperCase();
function lookup(dict, lang, value) {
  const t = dict.get(normalizeText(value));
  if (t === undefined) return undefined;
  // keep the capitalisation style of the original
  if (isUpper(value)) return t.toUpperCase();
  if (isUpper(t)) return t.charAt(0) + t.slice(1).toLowerCase();
  return t;
}
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const PHOTO_SLOTS = 4;

function translateValue(def, value, dict, lang) {
  if (def.type === 'tags') {
    if (!Array.isArray(value) || !value.length) return undefined;
    const out = value.map((x) => lookup(dict, lang, x));
    if (out.every((x) => x === undefined)) return undefined;
    return out.map((x, i) => (x === undefined ? value[i] : x));
  }
  if (typeof value !== 'string' || !value) return undefined;
  return lookup(dict, lang, value);
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
      // names (brands, tools, projects…) are never auto-translated: a word like "Later" (a tool)
      // must not become the dictionary's "later". An automatic translation filled by an
      // earlier version is corrected; a name translated on purpose is kept.
      if (sub.keepName) {
        if (typeof value[k] !== 'string' || !value[k]) continue;
        const auto = translateValue(sub, value[k], DICTS[lang], lang);
        if (have && !(auto !== undefined && have === auto && auto !== value[k])) continue;
      } else if (have !== undefined && have !== '' && !(Array.isArray(have) && !have.length)) continue;
      let t = sub.keepName ? value[k] : translateValue(sub, value[k], DICTS[lang], lang);
      if (t === undefined) continue;
      value.i18n = isObj(value.i18n) ? value.i18n : {};
      value.i18n[lang] = isObj(value.i18n[lang]) ? value.i18n[lang] : {};
      value.i18n[lang][k] = t;
    }
  }
}

/** Version of the reference tools list (raise it when tools are added to DEFAULT_TOOLS). */
export const TOOLS_SEED = 2;

export function migrateContent(input, { translations = true } = {}) {
  if (!isObj(input)) return input;
  const doc = structuredClone(input);

  // Logo carousel (added after the first version)
  if (!Array.isArray(doc.logos)) doc.logos = structuredClone(defaultContent.logos);

  // Sections added later start with their default content (existing data is never replaced)
  for (const k of ['leads', 'stats', 'tools', 'booking', 'seo', 'storySettings', 'ads']) {
    if (doc[k] === undefined) doc[k] = structuredClone(defaultContent[k]);
  }
  // Tools list: categories and tools added to the reference list are merged in once per
  // list version (tools the owner deleted afterwards are not brought back).
  if (Array.isArray(doc.tools) && (doc.toolsSeed || 0) < TOOLS_SEED) {
    const key = (v) => normalizeText(v).toLowerCase();
    // version 2: the owner's chosen list replaces the earlier one; a logo, link or description
    // already set for a tool of the same name is kept.
    const before = new Map();
    for (const c of doc.tools) for (const t of (isObj(c) && Array.isArray(c.tools) ? c.tools : [])) if (isObj(t)) before.set(key(t.name), t);
    doc.tools = structuredClone(defaultContent.tools).map((c) => ({
      ...c,
      tools: c.tools.map((t) => {
        const old = before.get(key(t.name));
        return old ? { ...t, icon: old.icon || t.icon, url: old.url || t.url, description: old.description || t.description } : t;
      }),
    }));
  }
  doc.toolsSeed = Math.max(doc.toolsSeed || 0, TOOLS_SEED);
  // Social links given by the owner: filled in once, only where the field is still empty
  // (a link changed or removed in the dashboard afterwards is left alone).
  if (!doc.socialsSeed) {
    if (isObj(doc.site)) {
      const so = isObj(doc.site.socials) ? { ...doc.site.socials } : {};
      for (const k of ['instagram', 'linkedin']) if (!so[k]) so[k] = defaultContent.site.socials[k];
      doc.site = { ...doc.site, socials: so };
    }
    doc.socialsSeed = 1;
  }
  if (isObj(doc.text) && !doc.text.tools) doc.text = { ...doc.text, tools: structuredClone(defaultContent.text.tools) };

  // Products: the first one becomes the free PDF; others stay "coming soon"
  if (Array.isArray(doc.products)) {
    doc.products = doc.products.map((p, i) => (isObj(p) && !p.kind ? { ...p, kind: i === 0 ? 'free' : 'soon' } : p));
  }

  // Contact: the fourth card "Book a meeting"
  if (Array.isArray(doc.contactPaths) && !doc.contactPaths.some((c) => isObj(c) && (c.kind === 'booking' || c.id === 'booking'))) {
    doc.contactPaths = [...doc.contactPaths, structuredClone(BOOKING_CARD)];
  }

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
      // The featured cover (slider version) becomes photo 1 — the first position of the design.
      if (out.cover) {
        out.photos = [{ src: out.cover, caption: '', alt: out.coverAlt || '' }, ...out.photos];
        out.cover = '';
        out.coverAlt = '';
      }
      return out;
    });
  }

  // Projects whose client logo is part of the website get it on their card (once).
  if (Array.isArray(doc.projects)) {
    for (const p of doc.projects) if (isObj(p) && p.logo === undefined) p.logo = p.slug === 'novaseeds' ? '/logos/novaseeds.png' : '';
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

/**
 * Every text that has no translation yet in `lang` (for the dashboard's Translations page).
 * Returns [{ path, def, english }] — `path` is where the English text is stored.
 */
export function missingTranslations(content, lang) {
  const out = [];
  const walk = (def, value, path) => {
    if (def.type === 'list') {
      if (Array.isArray(value)) value.forEach((item, i) => walk(def.of, item, [...path, i]));
      return;
    }
    if (def.type !== 'object' || !isObj(value)) return;
    for (const [k, sub] of Object.entries(def.fields)) {
      if (sub.type === 'object' || sub.type === 'list') walk(sub, value[k], [...path, k]);
      else if (isTranslatable(sub)) {
        const en = value[k];
        const has = Array.isArray(en) ? en.length > 0 : typeof en === 'string' && en.trim() !== '';
        if (!has) continue;
        const tr = value.i18n && value.i18n[lang] && value.i18n[lang][k];
        const done = Array.isArray(tr) ? tr.length > 0 : typeof tr === 'string' && tr.trim() !== '';
        if (!done) out.push({ path: [...path, k], def: sub, english: en });
      }
    }
  };
  walk(schema, content, []);
  return out;
}
