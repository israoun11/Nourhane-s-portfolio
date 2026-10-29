// Built-in meeting calendar: free times are computed from the availability set in the
// dashboard (weekly hours, notice, buffer, days off) minus the meetings already booked.
// A booking is accepted only if its time is still free when it is saved (checked again
// inside a queue, so two visitors can never take the same time on this server).
import crypto from 'node:crypto';
import { HttpError } from './http.js';
import { isLang } from '../../shared/i18n/langs.js';
import { cleanSource } from './leads.js';

const EMAIL = /^[^\s@<>"']+@[^\s@<>"'.]+(\.[^\s@<>"'.]+)+$/;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const clean = (s) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
const oneLine = (s) => clean(s).replace(/\s+/g, ' ');
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const hash = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

/** Wall-clock parts of an instant in a time zone. */
function partsIn(ts, tz) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' });
  const o = Object.fromEntries(f.formatToParts(new Date(ts)).map((p) => [p.type, p.value]));
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, min: +o.minute, wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday) };
}
/** The instant of a wall-clock time in a time zone (handles summer time). */
export function zonedTime(y, m, d, h, min, tz) {
  let ts = Date.UTC(y, m - 1, d, h, min);
  for (let k = 0; k < 3; k++) {
    const p = partsIn(ts, tz);
    const diff = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - Date.UTC(y, m - 1, d, h, min);
    if (!diff) break;
    ts -= diff;
  }
  return ts;
}
const ymd = (p) => `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/**
 * Free start times for a meeting type.
 * settings: content.booking · type: { duration } · taken: [{ start, end }] (ISO) · now: ms
 * Returns [{ date: 'YYYY-MM-DD' (owner's calendar), slots: [ISO start…] }]
 */
export function freeSlots(settings, type, taken, now = Date.now()) {
  const tz = settings.timezone || 'Africa/Tunis';
  const dur = Math.max(5, Number(type.duration) || 30);
  const step = Math.max(10, Number(settings.interval) || 30);
  const buffer = Math.max(0, Number(settings.buffer) || 0) * MIN;
  const earliest = now + Math.max(0, Number(settings.minNotice) || 0) * 60 * MIN;
  const days = Math.min(365, Math.max(1, Number(settings.maxDays) || 30));
  const blocked = new Set(settings.blocked || []);
  const busy = taken.map((b) => [Date.parse(b.start) - buffer, Date.parse(b.end) + buffer]);
  const out = [];
  const today = partsIn(now, tz);
  for (let k = 0; k <= days; k++) {
    // calendar day k after today, in the owner's time zone (noon avoids summer-time edges)
    const p = partsIn(zonedTime(today.y, today.m, today.d, 12, 0, tz) + k * DAY, tz);
    const date = ymd(p);
    if (blocked.has(date)) continue;
    const slots = [];
    for (const r of settings.hours || []) {
      if (Number(r.day) !== p.wd) continue;
      for (let t = toMin(r.start); t + dur <= toMin(r.end); t += step) {
        const s = zonedTime(p.y, p.m, p.d, Math.floor(t / 60), t % 60, tz);
        const e = s + dur * MIN;
        if (s < earliest) continue;
        if (busy.some(([a, b]) => s < b && e > a)) continue;
        slots.push(new Date(s).toISOString());
      }
    }
    if (slots.length) out.push({ date, slots: [...new Set(slots)].sort() });
  }
  return out;
}

export function validateBooking(body, settings) {
  const b = body && typeof body === 'object' ? body : {};
  const fields = {};
  const name = oneLine(b.name);
  const email = oneLine(b.email).toLowerCase();
  const message = clean(b.message).replace(/\r\n?/g, '\n').slice(0, 2000);
  const ti = Number(b.type);
  if (!name) fields.name = 'required';
  else if (name.length > 100) fields.name = 'tooLong';
  if (!email) fields.email = 'required';
  else if (email.length > 200 || !EMAIL.test(email)) fields.email = 'invalid';
  if (!Number.isInteger(ti) || !(settings.types || [])[ti]) fields.type = 'invalid';
  if (!b.start || Number.isNaN(Date.parse(b.start))) fields.start = 'invalid';
  return { ok: !Object.keys(fields).length, fields, value: { name, email, message, type: ti, start: new Date(Date.parse(b.start || 0)).toISOString(), lang: isLang(b.lang) ? b.lang : 'en', source: cleanSource(b.source) } };
}

export function createScheduler(store, log = console) {
  let queue = Promise.resolve();
  const serial = (fn) => {
    const run = queue.then(fn, fn);
    queue = run.catch(() => {});
    return run;
  };
  const upcomingTaken = async (now) => (await store.listRecords('bookings')).filter((b) => b.status === 'confirmed' && Date.parse(b.end) > now - DAY);

  return {
    async slots(settings, typeIndex, now = Date.now()) {
      const type = (settings.types || [])[typeIndex];
      if (!type) throw new HttpError(404, 'Unknown meeting type.', { code: 'NO_TYPE' });
      return freeSlots(settings, type, await upcomingTaken(now), now);
    },

    /** Saves a booking if its time is still free. Returns the booking and a private cancel token. */
    book(settings, value, now = Date.now()) {
      return serial(async () => {
        const type = settings.types[value.type];
        const free = freeSlots(settings, type, await upcomingTaken(now), now);
        if (!free.some((d) => d.slots.includes(value.start))) {
          throw new HttpError(409, 'This time is no longer available. Please choose another one.', { code: 'TAKEN' });
        }
        const token = crypto.randomBytes(24).toString('base64url');
        const start = Date.parse(value.start);
        const rec = {
          id: crypto.randomUUID(),
          createdAt: new Date(now).toISOString(),
          start: value.start,
          end: new Date(start + type.duration * MIN).toISOString(),
          timezone: settings.timezone,
          type: type.name,
          duration: type.duration,
          name: value.name,
          email: value.email,
          message: value.message,
          lang: value.lang,
          source: value.source,
          status: 'confirmed',
          notes: '',
          cancelHash: hash(token),
        };
        await store.addRecord('bookings', rec);
        log.info?.(`Meeting booked for ${rec.start} (${rec.type}).`);
        return { booking: rec, token };
      });
    },

    async cancelByVisitor(id, token) {
      if (!ID.test(String(id)) || !token) throw new HttpError(404, 'Booking not found.', { code: 'NOT_FOUND' });
      const rec = await store.getRecord('bookings', id);
      if (!rec || rec.cancelHash !== hash(token)) throw new HttpError(404, 'Booking not found.', { code: 'NOT_FOUND' });
      if (rec.status === 'cancelled') return rec;
      if (Date.parse(rec.start) < Date.now()) throw new HttpError(409, 'This meeting has already taken place.', { code: 'PAST' });
      return store.updateRecord('bookings', id, { status: 'cancelled', cancelledAt: new Date().toISOString(), cancelledBy: 'visitor' });
    },

    async view(id, token) {
      if (!ID.test(String(id)) || !token) throw new HttpError(404, 'Booking not found.', { code: 'NOT_FOUND' });
      const rec = await store.getRecord('bookings', id);
      if (!rec || rec.cancelHash !== hash(token)) throw new HttpError(404, 'Booking not found.', { code: 'NOT_FOUND' });
      const { cancelHash, email, notes, source, ...pub } = rec;
      return pub;
    },

    async list() {
      const all = await store.listRecords('bookings');
      return all.map(({ cancelHash, ...b }) => b).sort((a, b) => (a.start < b.start ? -1 : 1));
    },
    async update(id, body) {
      if (!ID.test(String(id))) throw new HttpError(404, 'Booking not found.');
      const patch = {};
      if (body.status !== undefined) {
        if (!['confirmed', 'cancelled', 'done'].includes(body.status)) throw new HttpError(422, 'Unknown status.', { code: 'INVALID' });
        patch.status = body.status;
        if (body.status === 'cancelled') Object.assign(patch, { cancelledAt: new Date().toISOString(), cancelledBy: 'owner' });
      }
      if (typeof body.notes === 'string') patch.notes = clean(body.notes).slice(0, 4000);
      if (!Object.keys(patch).length) throw new HttpError(400, 'Nothing to change.');
      const r = await store.updateRecord('bookings', id, patch);
      if (!r) throw new HttpError(404, 'Booking not found.');
      const { cancelHash, ...out } = r;
      return out;
    },
    async remove(id) {
      if (!ID.test(String(id)) || !(await store.deleteRecord('bookings', id))) throw new HttpError(404, 'Booking not found.');
    },
  };
}
