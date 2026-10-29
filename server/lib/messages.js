// Contact form messages: validation of what visitors send, and the inbox used by the dashboard.
import crypto from 'node:crypto';
import { HttpError } from './http.js';
import { isLang } from '../../shared/i18n/langs.js';
import { cleanSource } from './leads.js';

export const MAX_MESSAGES = 5000; // the inbox refuses new messages beyond this (delete old ones in the dashboard)
export const CATEGORIES = ['work', 'collab', 'share']; // defaults; the real list comes from the contact cards
export const STATUSES = ['new', 'progress', 'done'];
export const LIMITS = { name: 100, email: 200, messageMin: 20, messageMax: 5000 };
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EMAIL = /^[^\s@<>"']+@[^\s@<>"'.]+(\.[^\s@<>"'.]+)+$/;

const clean = (s) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
const oneLine = (s) => clean(s).replace(/[\r\n\u2028\u2029]+/g, ' ').trim();

/** Checks a submission. Returns { ok, fields, value } — `fields` maps a field to an error code. */
export function validateMessage(body, categories = CATEGORIES) {
  const b = body && typeof body === 'object' ? body : {};
  const fields = {};
  const name = oneLine(b.name);
  const email = oneLine(b.email).toLowerCase();
  const message = clean(b.message).replace(/\r\n?/g, '\n').trim();
  const category = categories.includes(b.category) ? b.category : '';
  if (!name) fields.name = 'required';
  else if (name.length > LIMITS.name) fields.name = 'tooLong';
  if (!email) fields.email = 'required';
  else if (email.length > LIMITS.email || !EMAIL.test(email)) fields.email = 'invalid';
  if (message.length < LIMITS.messageMin) fields.message = 'tooShort';
  else if (message.length > LIMITS.messageMax) fields.message = 'tooLong';
  return {
    ok: Object.keys(fields).length === 0,
    fields,
    value: { name, email, category, message, lang: isLang(b.lang) ? b.lang : 'en', source: cleanSource(b.source) },
  };
}

export function createMessageService(store) {
  return {
    /** Saves a new message. Resolves only once the storage confirmed the write. */
    async add(value, categoryLabel = '') {
      if (await store.hasAtLeastMessages(MAX_MESSAGES)) {
        throw new HttpError(503, 'The inbox is full. Please try again later.', { code: 'FULL' });
      }
      const msg = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        name: value.name,
        email: value.email,
        category: value.category,
        categoryLabel: String(categoryLabel || '').slice(0, 80),
        message: value.message,
        lang: value.lang,
        read: false,
        status: 'new',
        notes: '',
        source: value.source || {},
      };
      await store.addMessage(msg);
      return msg;
    },
    async list() {
      const items = await store.listMessages();
      return { items, total: items.length, unread: items.filter((m) => !m.read).length };
    },
    async unread() {
      return store.countUnreadMessages();
    },
    /** Changes read/unread, follow-up status and private notes. */
    async update(id, body) {
      if (!ID.test(id)) throw new HttpError(404, 'Message not found.');
      const patch = {};
      if (typeof body.read === 'boolean') patch.read = body.read;
      if (body.status !== undefined) {
        if (!STATUSES.includes(body.status)) throw new HttpError(422, 'Unknown status.', { code: 'INVALID' });
        patch.status = body.status;
      }
      if (typeof body.notes === 'string') patch.notes = body.notes.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, 4000);
      if (!Object.keys(patch).length) throw new HttpError(400, 'Nothing to change.');
      const m = await store.updateMessage(id, patch);
      if (!m) throw new HttpError(404, 'Message not found.');
      return m;
    },
    async setRead(id, read) {
      return this.update(id, { read });
    },
    /** Deletes messages older than the retention period (0 = keep). */
    async purge(months) {
      if (!months) return 0;
      const limit = Date.now() - months * 30 * 24 * 3600 * 1000;
      const old = (await store.listMessages()).filter((m) => Date.parse(m.createdAt) < limit);
      for (const m of old) await store.deleteMessage(m.id);
      return old.length;
    },
    async remove(id) {
      if (!ID.test(id)) throw new HttpError(404, 'Message not found.');
      const ok = await store.deleteMessage(id);
      if (!ok) throw new HttpError(404, 'Message not found.');
    },
  };
}
