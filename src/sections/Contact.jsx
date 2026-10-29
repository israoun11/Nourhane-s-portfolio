import { useState } from 'react';
import { useContent } from '../content/ContentProvider.jsx';
import { Button, Words, countWords } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';

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

export default function Contact() {
  const { site, contactPaths: allPaths, text } = useContent();
  // the original three cards (the booking card is managed in the dashboard but not shown here)
  const contactPaths = allPaths.filter((p) => p.kind !== 'booking');
  const { t, lang } = useI18n();
  const [inquiry, setInquiry] = useState('work');
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
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                className={`path${on ? ' is-on' : ''}`}
                onClick={() => choose(p.id)}
                data-reveal
                style={{ '--d': `${i * 0.08}s` }}
              >
                <span className="path__check" aria-hidden="true" />
                <span className="path__title">{p.title}</span>
                <span className="path__text">{p.text}</span>
                <span className="path__state">{on ? t('contact.selected') : t('contact.choose')}</span>
              </button>
            );
          })}
        </fieldset>

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
                {contactPaths.map((p) => (
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
      </div>
    </section>
  );
}
