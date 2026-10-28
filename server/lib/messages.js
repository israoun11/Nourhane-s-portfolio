// Contact form messages: validation of what visitors send, and the inbox used by the dashboard.
import crypto from 'node:crypto';
import { HttpError } from './http.js';
import { isLang } from '../../shared/i18n/langs.js';

export const MAX_MESSAGES = 5000; // the inbox refuses new messages beyond this (delete old ones in the dashboard)
export const CATEGORIES = ['work', 'collab', 'share'];
export const LIMITS = { name: 100, email: 200, messageMin: 20, messageMax: 5000 };
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EMAIL = /^[^\s@<>"']+@[^\s@<>"'.]+(\.[^\s@<>"'.]+)+$/;

const clean = (s) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
const oneLine = (s) => clean(s).replace(/[\r\n\u2028\u2029]+/g, ' ').trim();

/** Checks a submission. Returns { ok, fields, value } — `fields` maps a field to an error code. */
export function validateMessage(body) {
  const b = body && typeof body === 'object' ? body : {};
  const fields = {};
  const name = oneLine(b.name);
  const email = oneLine(b.email).toLowerCase();
  const message = clean(b.message).replace(/\r\n?/g, '\n').trim();
  const category = CATEGORIES.includes(b.category) ? b.category : '';
  if (!name) fields.name = 'required';
  else if (name.length > LIMITS.name) fields.name = 'tooLong';
  if (!email) fields.email = 'required';
  else if (email.length > LIMITS.email || !EMAIL.test(email)) fields.email = 'invalid';
  if (message.length < LIMITS.messageMin) fields.message = 'tooShort';
  else if (message.length > LIMITS.messageMax) fields.message = 'tooLong';
  return {
    ok: Object.keys(fields).length === 0,
    fields,
    value: { name, email, category, message, lang: isLang(b.lang) ? b.lang : 'en' },
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
    async setRead(id, read) {
      if (!ID.test(id)) throw new HttpError(404, 'Message not found.');
      if (typeof read !== 'boolean') throw new HttpError(400, 'Missing “read”.');
      const m = await store.updateMessage(id, { read });
      if (!m) throw new HttpError(404, 'Message not found.');
      return m;
    },
    async remove(id) {
      if (!ID.test(id)) throw new HttpError(404, 'Message not found.');
      const ok = await store.deleteMessage(id);
      if (!ok) throw new HttpError(404, 'Message not found.');
    },
  };
}
