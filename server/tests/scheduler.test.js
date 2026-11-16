// Built-in meeting calendar: free times, double-booking protection, visitor cancel, dashboard.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, client } from './helpers.js';
import { freeSlots, zonedTime } from '../lib/scheduler.js';

const base = {
  timezone: 'Africa/Tunis', interval: 30, buffer: 15, minNotice: 0, maxDays: 14, blocked: [],
  hours: [{ day: '1', start: '09:00', end: '11:00' }],
  types: [{ name: 'Call', duration: 30 }],
};
// Monday 2030-01-07 06:00 UTC = 07:00 in Tunis
const MONDAY = Date.UTC(2030, 0, 7, 6, 0);

test('time zones: 09:00 in Tunis is 08:00 UTC; summer time in Paris is handled', () => {
  assert.equal(new Date(zonedTime(2030, 1, 7, 9, 0, 'Africa/Tunis')).toISOString(), '2030-01-07T08:00:00.000Z');
  assert.equal(new Date(zonedTime(2030, 7, 1, 9, 0, 'Europe/Paris')).toISOString(), '2030-07-01T07:00:00.000Z');
});

test('free times follow the weekly hours, notice, days off and existing meetings (+ break)', () => {
  const days = freeSlots(base, base.types[0], [], MONDAY);
  assert.equal(days[0].date, '2030-01-07');
  assert.deepEqual(days[0].slots, ['2030-01-07T08:00:00.000Z', '2030-01-07T08:30:00.000Z', '2030-01-07T09:00:00.000Z', '2030-01-07T09:30:00.000Z']);
  assert.equal(days.length, 3, 'three Mondays within 14 days');
  // 07:00 now + 3 h notice → first time 10:00 Tunis (09:00 UTC)
  assert.equal(freeSlots({ ...base, minNotice: 3 }, base.types[0], [], MONDAY)[0].slots[0], '2030-01-07T09:00:00.000Z');
  // a booked 09:00–09:30 meeting + 15 min break removes 08:30 (ends 09:00 + break), 09:00 and 09:30
  const taken = [{ start: '2030-01-07T08:00:00.000Z', end: '2030-01-07T08:30:00.000Z' }];
  assert.deepEqual(freeSlots(base, base.types[0], taken, MONDAY)[0].slots, ['2030-01-07T09:00:00.000Z', '2030-01-07T09:30:00.000Z']);
  // day off
  assert.equal(freeSlots({ ...base, blocked: ['2030-01-07'] }, base.types[0], [], MONDAY)[0].date, '2030-01-14');
  // no hours → nothing (nothing is invented)
  assert.deepEqual(freeSlots({ ...base, hours: [] }, base.types[0], [], MONDAY), []);
});

let srv;
let c;
before(async () => {
  srv = await startTestServer();
  c = client(srv.base);
  await c.login();
});
after(async () => srv.close());

async function save(mut) {
  const cur = (await c.req('GET', '/api/admin/content')).data;
  const data = structuredClone(cur.data);
  mut(data);
  const r = await c.req('PUT', '/api/admin/content', { json: { data, version: cur.version } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
}
const post = (p, body, headers = {}) => fetch(srv.base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('closed by default: no times are offered, booking refused', async () => {
  const r = await (await fetch(srv.base + '/api/booking/slots?type=0')).json();
  assert.deepEqual(r, { open: false });
  assert.equal((await post('/api/booking', { type: 0, start: new Date().toISOString(), name: 'A', email: 'a@example.com' })).status, 409);
});

test('availability is validated in the dashboard', async () => {
  const cur = (await c.req('GET', '/api/admin/content')).data;
  const d = structuredClone(cur.data);
  d.booking.hours = [{ day: '1', start: '9h', end: '08:00' }];
  d.booking.timezone = 'Mars/Olympus';
  const r = await c.req('PUT', '/api/admin/content', { json: { data: d, version: cur.version } });
  assert.equal(r.status, 422);
  const paths = r.data.errors.map((e) => e.path);
  assert.ok(paths.includes('booking.timezone') && paths.includes('booking.hours[0].start'));
});

test('open: book a free time once; the same time cannot be booked twice; visitor can cancel', async () => {
  await save((d) => {
    d.booking.provider = 'builtin'; // these tests cover the built-in calendar (the site itself uses Calendly)
    d.booking.open = true;
    d.booking.minNotice = 0;
    d.booking.hours = ['0', '1', '2', '3', '4', '5', '6'].map((day) => ({ day, start: '00:00', end: '23:30' }));
  });
  const s = await (await fetch(srv.base + '/api/booking/slots?type=0')).json();
  assert.equal(s.open, true);
  assert.equal(s.timezone, 'Africa/Tunis');
  const start = s.days[1].slots[3];
  assert.equal((await post('/api/booking', { type: 0, start, name: '', email: 'x' })).status, 422);
  assert.equal((await post('/api/booking', { type: 0, start, name: 'Lina', email: 'lina@example.com' }, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await post('/api/booking', { type: 0, start: '2031-01-01T03:17:00.000Z', name: 'Lina', email: 'lina@example.com' })).status, 409, 'a time that is not offered');
  // two visitors at the same moment → exactly one booking
  const [a, b] = await Promise.all([
    post('/api/booking', { type: 0, start, name: 'Lina', email: 'lina@example.com', message: 'Brand strategy' }),
    post('/api/booking', { type: 0, start, name: 'Sami', email: 'sami@example.com' }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [201, 409]);
  const ok = await (a.status === 201 ? a : b).json();
  assert.equal(ok.booking.start, start);
  assert.match(ok.manage, /^\/booking\/manage\?id=[0-9a-f-]{36}&t=[\w-]+$/);
  const after = await (await fetch(srv.base + '/api/booking/slots?type=0')).json();
  assert.ok(!after.days.flatMap((d) => d.slots).includes(start), 'the time is no longer offered');
  // dashboard sees it
  const list = await c.req('GET', '/api/admin/bookings');
  assert.equal(list.data.provider, 'builtin');
  assert.equal(list.data.items.length, 1);
  assert.equal(list.data.items[0].cancelHash, undefined, 'cancel secret never sent');
  // visitor view + cancel with the private link
  const q = new URLSearchParams(ok.manage.split('?')[1]);
  const view = await (await fetch(`${srv.base}/api/booking/${q.get('id')}?t=${q.get('t')}`)).json();
  assert.equal(view.booking.status, 'confirmed');
  assert.equal(view.booking.email, undefined);
  assert.equal((await post(`/api/booking/${q.get('id')}/cancel`, { t: 'wrong' })).status, 404);
  assert.equal((await post(`/api/booking/${q.get('id')}/cancel`, { t: q.get('t') })).status, 200);
  const freed = await (await fetch(srv.base + '/api/booking/slots?type=0')).json();
  assert.ok(freed.days.flatMap((d) => d.slots).includes(start), 'a cancelled time is free again');
  // owner: status, notes, delete
  const id = q.get('id');
  assert.equal((await c.req('PATCH', `/api/admin/bookings/${id}`, { json: { status: 'done', notes: 'Went well' } })).data.item.notes, 'Went well');
  assert.equal((await c.req('PATCH', `/api/admin/bookings/${id}`, { json: { status: 'x' } })).status, 422);
  assert.equal((await c.req('DELETE', `/api/admin/bookings/${id}`)).status, 200);
  assert.equal((await c.req('GET', '/api/admin/bookings')).data.items.length, 0);
  // the manage page exists (not indexed)
  const page = await fetch(srv.base + ok.manage);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /noindex/);
});
