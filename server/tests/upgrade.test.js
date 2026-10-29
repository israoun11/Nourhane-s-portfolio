// Content saved by the previous version keeps working after the upgrade (and can be saved).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { migrateContent } from '../../shared/migrate.js';
import { validateContent, publicView } from '../../shared/schema.js';

const old = JSON.parse(fs.readFileSync(new URL('./fixtures/v4-content.json', import.meta.url), 'utf8'));

test('v4 content: valid after migration (dashboard can save), new sections filled in', () => {
  const v = validateContent(migrateContent(old));
  assert.deepEqual(v.errors, []);
  const pub = publicView(v.value);
  assert.equal(pub.tools.length, 16);
  assert.ok(pub.tools.reduce((n, c) => n + c.tools.length, 0) === 55, "all 55 tools of the list");
  assert.deepEqual(pub.contactPaths.map((c) => c.id), ['work', 'collab', 'share', 'booking']);
  assert.equal(pub.booking.provider, 'builtin');
  assert.equal(pub.booking.open, false, 'bookings stay closed until the owner opens them');
  assert.ok(pub.products.every((p) => p.slug));
  assert.equal(pub.stats.length, 2);
});

test('tools list: missing reference tools are merged once; deleted ones are not brought back', () => {
  const doc = structuredClone(old);
  doc.tools = [{ title: 'Digital Advertising', visible: true, tools: [{ name: 'Meta Ads Manager', description: '', url: '', icon: '', visible: true }] }];
  const m = migrateContent(doc);
  assert.equal(m.tools.length, 16);
  assert.equal(m.tools[0].tools.length, 2, 'TikTok Ads Manager added to the existing category');
  m.tools[0].tools = m.tools[0].tools.filter((t) => t.name !== 'TikTok Ads Manager');
  const again = migrateContent(m);
  assert.equal(again.tools[0].tools.length, 1, 'stays deleted');
});

test('tool names are never auto-translated (an earlier "Later" → "سنوات" is corrected)', () => {
  const doc = migrateContent(structuredClone(old));
  const later = doc.tools[1].tools.find((t) => t.name === 'Later');
  later.i18n.ar.name = 'سنوات';
  later.i18n.fr.name = 'Plus tard';
  const fixed = migrateContent(doc).tools[1].tools.find((t) => t.name === 'Later');
  assert.equal(fixed.i18n.ar.name, 'Later');
  assert.equal(fixed.i18n.fr.name, 'Plus tard', 'a name changed on purpose is kept');
});
