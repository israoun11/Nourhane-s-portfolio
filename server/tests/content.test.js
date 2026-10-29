import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateContent } from '../../shared/schema.js';
import { defaultContent } from '../../shared/default-content.js';
import { migrateContent } from '../../shared/migrate.js';
import { localize } from '../../shared/i18n/localize.js';

test('default content with its translations is valid and stable', () => {
  const r = validateContent(migrateContent(defaultContent));
  assert.equal(r.ok, true, JSON.stringify(r.errors.slice(0, 3)));
  assert.deepEqual(validateContent(r.value).value, r.value);
  assert.equal(r.value.timeline.every((y) => y.photos.length >= 4), true, 'four photo slots per year');
  assert.equal(r.value.projects.every((p) => p.approach.length === 4 && 'image' in p.approach[0]), true);
});

test('content from the previous version migrates without losing anything', () => {
  const old = structuredClone(defaultContent);
  delete old.logos;
  old.timeline = old.timeline.map(({ photos, ...t }, i) => ({ ...t, image: i === 1 ? '/uploads/' + 'a'.repeat(64) + '.png' : '' }));
  old.projects[0].approach = ['Research', 'Plan', '', 'Measure'];
  old.text.hero.line1 = 'My own words'; // edited by the owner → must not get a default translation
  const r = validateContent(migrateContent(old));
  assert.equal(r.ok, true);
  assert.equal(r.value.logos.length, 9);
  assert.equal(r.value.timeline[1].photos[0].src, '/uploads/' + 'a'.repeat(64) + '.png');
  assert.equal(r.value.timeline[1].photos.length, 4);
  assert.deepEqual(r.value.projects[0].approach.map((a) => a.text), ['Research', 'Plan', '', 'Measure']);
  assert.equal(r.value.text.hero.i18n?.fr?.line1, undefined);
  assert.equal(r.value.text.hero.i18n.fr.line2, 'au-delà du');
});

test('translations: stored next to the text, validated, English as fallback', () => {
  const base = validateContent(migrateContent(defaultContent)).value;
  const d = structuredClone(base);
  d.contactPaths[0].i18n.fr.title = 'x'.repeat(61); // too long
  d.contactPaths[1].i18n.fr.title = ''; // empty → dropped → English shown
  d.text.hero.i18n.xx = { line1: 'unknown language' };
  const r = validateContent(d);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.path === 'contactPaths[0].i18n.fr.title' && e.code === 'tooLong'));
  assert.equal(r.value.contactPaths[1].i18n.fr.title, undefined);
  assert.equal(r.value.text.hero.i18n.xx, undefined);
  const fr = localize(r.value, 'fr');
  assert.equal(fr.contactPaths[1].title, "Let's collaborate");
  assert.notEqual(fr.contactPaths[2].title, base.contactPaths[2].title);
  assert.equal(fr.contactPaths[2].title, base.contactPaths[2].i18n.fr.title);
  assert.equal(localize(r.value, 'en').text.hero.line1, 'I think');
  assert.equal(fr.i18n, undefined, 'translations are not sent twice');
});
