import { useState } from 'react';
import { useContent } from '../content/ContentProvider.jsx';
import { Button, Words, countWords } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';
import { getSource } from '../lib/source.js';
import { BuiltinBooking } from './Booking.jsx';

const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"'.]+(\.[^\s@<>"'.]+)+$/;
const LIMITS = { name: 100, messageMin: 20, messageMax: 5000 }; // same rules as the server (server/lib/messages.js)

// Field error codes (from this form or from the server) → message keys
const ERR = {
  name: { required: 'contact.err.name', tooLong: 'contact.err.nameLong' },
  email: { required: 'contact.err.email', invalid: 'contact.err.email' },
  message: { tooShort: 'contact.err.message', tooLong: 'contact.err.messageLong' },
};

function check(data) {
  const e = {};
  if (!data.name) e.name = 'required';
  else if (data.name.length > LIMITS.name) e.name = 'tooLong';
  if (!EMAIL_RE.test(data.email)) e.email = 'invalid';
  if (data.message.length < LIMITS.messageMin) e.message = 'tooShort';
  else if (data.message.length > LIMITS.messageMax) e.message = 'tooLong';
  return e;
}

const ICONS = {
  email: <path d="M3 6h18v12H3z M3 7l9 6 9-6" />,
  whatsapp: <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z M9 9.5c0 3 2.5 5.5 5.5 5.5l1.3-1.3-2-1-1 .8a4 4 0 0 1-2.3-2.3l.8-1-1-2z" />,
  instagram: <><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" /><circle cx="16.9" cy="7.1" r="0.6" /></>,
  linkedin: <><rect x="4" y="4" width="16" height="16" rx="2.5" /><path d="M8 10.5V16 M8 8v.01 M11.5 16v-5.5 M11.5 13a2.5 2.5 0 0 1 5 0V16" /></>,
};
const Icon = ({ k }) => <svg className="cm__icon" viewBox="0 0 24 24" aria-hidden="true">{ICONS[k]}</svg>;

/** Email, WhatsApp, Instagram, LinkedIn — each shown only once it is set in the dashboard. */
export function ContactMethods({ site }) {
  const { t } = useI18n();
  const digits = String(site.whatsapp || '').replace(/\D/g, '');
  const items = [
    site.email && { k: 'email', href: `mailto:${site.email}`, label: t('contact.m.email'), value: site.email },
    digits && { k: 'whatsapp', href: `https://wa.me/${digits}${site.whatsappMessage ? `?text=${encodeURIComponent(site.whatsappMessage)}` : ''}`, label: t('contact.m.whatsapp'), value: `+${digits}` },
    site.socials && site.socials.instagram && { k: 'instagram', href: site.socials.instagram, label: t('contact.m.instagram') },
    site.socials && site.socials.linkedin && { k: 'linkedin', href: site.socials.linkedin, label: t('contact.m.linkedin') },
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <ul className="cm" aria-label={t('contact.m.label')}>
      {items.map((x) => (
        <li key={x.k}>
          <a className={`cm__a cm__a--${x.k}`} href={x.href} {...(x.k === 'email' ? {} : { target: '_blank', rel: 'noreferrer' })} aria-label={x.value ? `${x.label}: ${x.value}` : x.label}>
            <Icon k={x.k} />
            <span className="cm__label">{x.label}</span>
            {x.value && <span className="cm__value" dir="ltr">{x.value}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Where “Book a meeting” leads: the scheduling page of Calendly / Cal.com (opened in a new tab —
 * dates, availability, the visitor's details, confirmation, emails and calendar sync are all
 * handled by that service), or '' when the built-in calendar of this website is used.
 */
export function bookingLink(booking = {}) {
  if (!booking.provider || booking.provider === 'builtin') return '';
  const first = (booking.types || []).find((x) => x && x.url);
  return booking.url || (first && first.url) || '';
}

export default function Contact() {
  const { site, contactPaths, text, booking } = useContent();
  const { t, lang } = useI18n();
  const bookUrl = bookingLink(booking);
  const formPaths = contactPaths.filter((p) => p.kind !== 'booking');
  const [inquiry, setInquiry] = useState(() => (formPaths[0] ? formPaths[0].id : ''));
  const current = contactPaths.find((p) => p.id === inquiry);
  const isBooking = !!current && current.kind === 'booking';
  const [err, setErr] = useState({});
  // idle | sending | sent | error | offline | rate
  const [status, setStatus] = useState('idle');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (status === 'sending') return;
    const form = e.currentTarget;
    const f = form.elements;
    const data = {
      name: f.name.value.trim(),
      email: f.email.value.trim(),
      category: inquiry,
      message: f.message.value.trim(),
      lang,
      company: f.company.value, // left empty by people; bots fill it in
      source: getSource(),
    };
    const next = check(data);
    setErr(next);
    if (Object.keys(next).length) {
      (next.name ? f.name : next.email ? f.email : f.message).focus();
      setStatus('idle');
      return;
    }
    setStatus('sending');
    let res;
    try {
      res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {
      setStatus('offline');
      return;
    }
    let body = {};
    try {
      body = await res.json();
    } catch {
      /* not JSON (e.g. a static host without the server) */
    }
    // Success is shown only when the server confirms the message was stored.
    if (res.status === 201 && body.ok) {
      setStatus('sent');
      form.reset();
      return;
    }
    if (res.status === 422 && body.fields) {
      setErr(body.fields);
      setStatus('idle');
      return;
    }
    setStatus(res.status === 429 ? 'rate' : 'error');
  };

  const msg = (field) => err[field] && t((ERR[field] && ERR[field][err[field]]) || 'contact.fix');
  const bad = (k) => (err[k] ? ' is-invalid' : '');
  const choose = (id) => {
    setInquiry(id);
    // the booking calendar opens under the cards: bring it into view
    if ((contactPaths.find((p) => p.id === id) || {}).kind === 'booking') {
      requestAnimationFrame(() => {
        const el = document.getElementById('contact-panel');
        if (el && el.getBoundingClientRect().top > window.innerHeight * 0.7) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    if (status === 'sent') setStatus('idle');
  };

  return (
    <section id="contact" className="section contact" aria-labelledby="contact-title">
      <div className="container">
        <h2 id="contact-title" className="contact__title" data-reveal="words">
          <span className="h-cond"><Words text={text.contact.title} /></span>
          <span className="it-serif c-blue"><Words text={text.contact.titleEm} start={countWords(text.contact.title)} /></span>
        </h2>

        <fieldset className="contact__paths">
          <legend className="sr-only">{t('contact.paths')}</legend>
          {contactPaths.map((p, i) => {
            const on = inquiry === p.id;
            // Book a meeting → the real scheduling page (Calendly), in a new tab
            if (p.kind === 'booking' && bookUrl) {
              return (
                <a
                  key={p.id}
                  href={bookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="path path--booking"
                  data-reveal
                  style={{ '--d': `${i * 0.08}s` }}
                >
                  <span className="path__check" aria-hidden="true" />
                  {p.icon && <img className="path__icon" src={p.icon} alt="" />}
                  <span className="path__title">{p.title}</span>
                  <span className="path__text">{p.text}</span>
                  <span className="path__cta">
                    {t('contact.bookBtn')}
                    <span className="sr-only"> {t('contact.newTab')}</span>
                  </span>
                </a>
              );
            }
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                className={`path${on ? ' is-on' : ''}${p.kind === 'booking' ? ' path--booking' : ''}`}
                onClick={() => choose(p.id)}
                data-reveal
                style={{ '--d': `${i * 0.08}s` }}
              >
                <span className="path__check" aria-hidden="true" />
                {p.icon && <img className="path__icon" src={p.icon} alt="" />}
                <span className="path__title">{p.title}</span>
                <span className="path__text">{p.text}</span>
                {p.kind === 'booking' ? (
                  <span className={`path__cta${on ? ' is-on' : ''}`}>{on ? t('contact.selected') : t('contact.bookBtn')}</span>
                ) : (
                  <span className="path__state">{on ? t('contact.selected') : t('contact.choose')}</span>
                )}
              </button>
            );
          })}
        </fieldset>

        <div id="contact-panel" className="contact__panel" />
        {isBooking ? (
          <BuiltinBooking onMessage={() => formPaths[0] && choose(formPaths[0].id)} />
        ) : (
        <form className="form" noValidate onSubmit={onSubmit} aria-label={t('contact.form')} data-reveal>
          <div className="form__row">
            <label className="field">
              {t('contact.name')}
              <input type="text" name="name" autoComplete="name" maxLength={LIMITS.name + 20} aria-invalid={!!err.name} className={bad('name')} />
              {err.name && <span role="alert" className="field__err">{msg('name')}</span>}
            </label>
            <label className="field">
              {t('contact.email')}
              <input type="email" name="email" autoComplete="email" dir="ltr" aria-invalid={!!err.email} className={bad('email')} />
              {err.email && <span role="alert" className="field__err">{msg('email')}</span>}
            </label>
            <label className="field">
              {t('contact.inquiry')}
              <select name="inquiry" value={inquiry} onChange={(e) => choose(e.target.value)}>
                {formPaths.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            {t('contact.message')}
            <textarea name="message" rows={5} maxLength={LIMITS.messageMax + 200} aria-invalid={!!err.message} className={bad('message')} />
            {err.message && <span role="alert" className="field__err">{msg('message')}</span>}
          </label>
          <label className="sr-only" aria-hidden="true">
            {t('contact.company')}
            <input type="text" name="company" tabIndex={-1} autoComplete="off" />
          </label>
          <div className="form__foot">
            <span className="form__alt">
              {t('contact.orEmail')}{' '}
              {site.email ? <a href={`mailto:${site.email}`} dir="ltr">{site.email}</a> : <span>{t('contact.emailPh')}</span>}
            </span>
            <Button type="submit" arrow magnetic disabled={status === 'sending'} aria-busy={status === 'sending'}>
              {status === 'sending' ? t('contact.sending') : t('contact.send')}
            </Button>
          </div>
          <div aria-live="polite">
            {status === 'sent' && <p role="status" className="form__msg form__msg--ok">{t('contact.sent')}</p>}
            {status === 'error' && (
              <p role="alert" className="form__msg form__msg--err">
                {site.email ? t('contact.failedEmail', { email: site.email }) : t('contact.failed')}
              </p>
            )}
            {status === 'offline' && <p role="alert" className="form__msg form__msg--err">{t('contact.offline')}</p>}
            {status === 'rate' && <p role="alert" className="form__msg form__msg--err">{t('contact.rate')}</p>}
          </div>
        </form>
        )}
        <ContactMethods site={site} />
      </div>
    </section>
  );
}
