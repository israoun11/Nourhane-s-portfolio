// Translations: every language has the same keys, and every key used in the code exists.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const load = async (p) => (await import(path.join(root, p))).default;
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(path.join(dir, d.name)) : [path.join(dir, d.name)]));

for (const part of ['site', 'admin']) {
  test(`${part} texts: French has exactly the English keys, none empty`, async () => {
    const en = await load(`src/i18n/${part}/en.js`);
    for (const lang of ['fr']) {
      const d = await load(`src/i18n/${part}/${lang}.js`);
      const missing = Object.keys(en).filter((k) => !(k in d));
      const extra = Object.keys(d).filter((k) => !(k in en));
      assert.deepEqual(missing, [], `${lang}: missing ${missing.join(', ')}`);
      assert.deepEqual(extra, [], `${lang}: unknown ${extra.join(', ')}`);
      // {placeholders} must match, otherwise a value would not be shown
      for (const k of Object.keys(en)) {
        const ph = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join();
        assert.equal(ph(d[k]), ph(en[k]), `${lang} ${k}: placeholders differ`);
        if (en[k] !== '' && part === 'site' && !/^cs\.(challenge|work|outcome)A$|^pf\.indexA$/.test(k)) assert.ok(String(d[k]).trim(), `${lang} ${k} is empty`);
      }
    }
  });
}

test('every text key used in the code exists in English', async () => {
  const site = await load('src/i18n/site/en.js');
  const admin = await load('src/i18n/admin/en.js');
  const used = new Set();
  for (const f of files(path.join(root, 'src')).filter((f) => /\.jsx?$/.test(f) && !f.includes(`${path.sep}i18n${path.sep}`))) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\b(?:t|tr)\(\s*['"]([a-zA-Z][\w.]*(?:\.[\w]+)+)['"]/g)) used.add(m[1]);
  }
  const unknown = [...used].filter((k) => !(k in site) && !(k in admin));
  assert.ok(used.size > 150, `found ${used.size} keys`);
  assert.deepEqual(unknown, []);
});

test('dashboard field names: every schema label has a French name', async () => {
  const { schema, PALETTE, CATEGORIES, TESTIMONIAL_KINDS } = await import(path.join(root, 'shared/schema.js'));
  const labels = new Set();
  const walk = (f) => {
    if (f.label) labels.add(f.label);
    if (f.help) labels.add(f.help);
    if (f.options) f.options.forEach((o) => labels.add(o.label));
    if (f.fields) Object.values(f.fields).forEach(walk);
    if (f.of) walk(f.of);
  };
  walk(schema);
  [...PALETTE, ...CATEGORIES, ...TESTIMONIAL_KINDS].forEach((o) => labels.add(o.label));
  for (const lang of ['fr']) {
    const d = await load(`src/i18n/admin/schema-${lang}.js`);
    const missing = [...labels].filter((l) => !(l in d));
    assert.deepEqual(missing, [], `${lang}: ${missing.join(' | ')}`);
  }
});
