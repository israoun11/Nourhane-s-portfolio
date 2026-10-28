// Returns the content in one language: every translatable text is replaced by its
// translation when there is one; otherwise the English text stays.
import { schema, isTranslatable } from '../schema.js';

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const filled = (v) => (Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : v !== undefined && v !== null);

function walk(def, value, lang) {
  if (def.type === 'list') return Array.isArray(value) ? value.map((item) => walk(def.of, item, lang)) : value;
  if (def.type !== 'object' || !isObj(value)) return value;
  const tr = (value.i18n && value.i18n[lang]) || {};
  const out = { ...value };
  delete out.i18n;
  for (const [k, sub] of Object.entries(def.fields)) {
    if (sub.type === 'object' || sub.type === 'list') out[k] = walk(sub, value[k], lang);
    else if (isTranslatable(sub) && filled(tr[k])) out[k] = tr[k];
  }
  return out;
}

export function localize(content, lang) {
  if (!content) return content;
  return walk(schema, content, lang === 'en' ? '' : lang);
}
