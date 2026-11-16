// Content saved by the previous version keeps working after the upgrade (and can be saved).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { migrateContent } from '../../shared/migrate.js';
import { defaultContent } from '../../shared/default-content.js';
import { validateContent, publicView } from '../../shared/schema.js';

const old = JSON.parse(fs.readFileSync(new URL('./fixtures/v4-content.json', import.meta.url), 'utf8'));

test('v4 content: valid after migration (dashboard can save), new sections filled in', () => {
  const v = validateContent(migrateContent(old));
  assert.deepEqual(v.errors, []);
  const pub = publicView(v.value);
  // “Tools, platforms & technologies” and “Then I built my own studio” are no longer on the website:
  // nothing of them is sent to visitors, but the saved data is kept.
  for (const k of ['tools', 'codaServices']) assert.equal(pub[k], undefined, k);
  assert.equal(pub.text.tools, undefined);
  assert.equal(pub.text.coda, undefined);
  assert.equal(pub.site.codastudio, undefined);
  assert.equal(v.value.tools.filter((c) => c.visible).length, 9, 'stored tools list kept');
  assert.ok(v.value.codaServices.length > 0, 'stored studio capabilities kept');
  assert.deepEqual(pub.contactPaths.map((c) => c.id), ['work', 'collab', 'share', 'booking']);
  assert.equal(pub.booking.provider, 'builtin');
  assert.equal(pub.booking.open, false, 'bookings stay closed until the owner opens them');
  assert.ok(pub.products.every((p) => p.slug));
  assert.equal(pub.stats.length, 2);
});

test('tools list v2: the owner’s list replaces the earlier one once, keeping logos/links already set', () => {
  const doc = structuredClone(old);
  doc.tools = [{ title: 'Digital Advertising', visible: true, tools: [{ name: 'Meta Ads Manager', description: '', url: 'https://example.com/ads', icon: '/uploads/meta.png', visible: true }] }];
  doc.toolsSeed = 1;
  const m = migrateContent(doc);
  assert.equal(m.tools.filter((c) => c.visible).length, 9);
  const meta = m.tools[0].tools.find((t) => t.name === 'Meta Ads Manager');
  assert.equal(meta.icon, '/uploads/meta.png');
  assert.equal(meta.url, 'https://example.com/ads');
  assert.ok(m.tools.some((c) => !c.visible && c.title === 'E-commerce & CMS'), 'the rest of the earlier list is kept, hidden');
  m.tools[0].tools = m.tools[0].tools.filter((t) => t.name !== 'Google Ads');
  assert.equal(migrateContent(m).tools[0].tools.length, 2, 'a later deletion stays deleted');
});

test('tool names are never auto-translated (an earlier "Later" → "plus tard" is corrected)', () => {
  const doc = migrateContent(structuredClone(old));
  const later = doc.tools[1].tools.find((t) => t.name === 'Later');
  later.i18n.fr.name = 'plus tard'; // automatic translation from an earlier version
  assert.equal(migrateContent(doc).tools[1].tools.find((t) => t.name === 'Later').i18n.fr.name, 'Later');
  later.i18n.fr.name = 'Later (outil)'; // changed on purpose
  assert.equal(migrateContent(doc).tools[1].tools.find((t) => t.name === 'Later').i18n.fr.name, 'Later (outil)', 'a name changed on purpose is kept');
});

test('Arabic removed: no Arabic generated, Arabic texts saved earlier are kept (not deleted)', () => {
  const doc = migrateContent(structuredClone(defaultContent));
  assert.equal(doc.text.hero.i18n.ar, undefined, 'no new Arabic translations');
  doc.text.hero.i18n.ar = { line1: 'أفكّر' };
  const v = validateContent(migrateContent(doc));
  assert.equal(v.value.text.hero.i18n.ar.line1, 'أفكّر', 'stored Arabic text survives a save');
});

test('social links: filled once where empty, owner changes kept', () => {
  const doc = structuredClone(defaultContent);
  delete doc.socialsSeed;
  doc.site.socials = { instagram: '', linkedin: 'https://linkedin.com/in/kept', youtube: '' };
  const out = migrateContent(doc);
  assert.equal(out.site.socials.instagram, 'https://www.instagram.com/nourhane_thabet');
  assert.equal(out.site.socials.linkedin, 'https://linkedin.com/in/kept');
  out.site.socials.instagram = '';
  assert.equal(migrateContent(out).site.socials.instagram, '', 'a link removed later is not brought back');
});
