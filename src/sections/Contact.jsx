import { useState } from 'react';
import { useContent } from '../content/ContentProvider.jsx';
import { formEndpoint } from '../data/site.js';
import { Button, Words, countWords } from '../components/ui.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Contact() {
  const { site, contactPaths, text } = useContent();
  const [inquiry, setInquiry] = useState('work');
  const [err, setErr] = useState({});
  // idle | unconfigured | sending | sent | error
  const [status, setStatus] = useState('idle');

  const onSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = form.elements;
    if (f.company.value) return; // honeypot: bots fill hidden fields
    const data = {
      name: f.name.value.trim(),
      email: f.email.value.trim(),
      inquiry: contactPaths.find((p) => p.id === inquiry)?.title || inquiry,
      message: f.message.value.trim(),
    };
    const next = { name: !data.name, email: !EMAIL_RE.test(data.email), msg: data.message.length < 20 };
    setErr(next);
    if (next.name || next.email || next.msg) {
      const first = next.name ? f.name : next.email ? f.email : f.message;
      first.focus();
      setStatus('idle');
      return;
    }
    if (!formEndpoint) {
      setStatus('unconfigured');
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch(formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus('sent');
      form.reset();
    } catch {
      setStatus('error');
    }
  };

  const bad = (k) => (err[k] ? ' is-invalid' : '');

  return (
    <section id="contact" className="section contact" aria-labelledby="contact-title">
      <div className="container">
        <h2 id="contact-title" className="contact__title" data-reveal="words">
          <span className="h-cond"><Words text={text.contact.title} /></span>
          <span className="it-serif c-blue"><Words text={text.contact.titleEm} start={countWords(text.contact.title)} /></span>
        </h2>

        <fieldset className="contact__paths">
          <legend className="sr-only">Choose a collaboration path</legend>
          {contactPaths.map((p, i) => {
            const on = inquiry === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                className={`path${on ? ' is-on' : ''}`}
                onClick={() => setInquiry(p.id)}
                data-reveal
                style={{ '--d': `${i * 0.08}s` }}
              >
                <span className="path__title">{p.title}</span>
                <span className="path__text">{p.text}</span>
                <span className="path__state">{on ? 'SELECTED ✓' : 'CHOOSE →'}</span>
              </button>
            );
          })}
        </fieldset>

        <form className="form" noValidate onSubmit={onSubmit} aria-label="Contact form" data-reveal>
          <div className="form__row">
            <label className="field">
              Name
              <input type="text" name="name" autoComplete="name" aria-invalid={!!err.name} className={bad('name')} />
              {err.name && <span role="alert" className="field__err">Please add your name.</span>}
            </label>
            <label className="field">
              Email
              <input type="email" name="email" autoComplete="email" aria-invalid={!!err.email} className={bad('email')} />
              {err.email && <span role="alert" className="field__err">Please enter a valid email address.</span>}
            </label>
            <label className="field">
              Inquiry type
              <select name="inquiry" value={inquiry} onChange={(e) => setInquiry(e.target.value)}>
                {contactPaths.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            Message
            <textarea name="message" rows={5} aria-invalid={!!err.msg} className={bad('msg')} />
            {err.msg && <span role="alert" className="field__err">Tell me a little about your idea (at least 20 characters).</span>}
          </label>
          <label className="sr-only" aria-hidden="true">
            Company
            <input type="text" name="company" tabIndex={-1} autoComplete="off" />
          </label>
          <div className="form__foot">
            <span className="form__alt">
              Or email{' '}
              {site.email ? <a href={`mailto:${site.email}`}>{site.email}</a> : <span>[verified email address]</span>}
            </span>
            <Button type="submit" arrow magnetic disabled={status === 'sending'}>
              {status === 'sending' ? 'SENDING…' : 'SEND MY MESSAGE'}
            </Button>
          </div>
          <div aria-live="polite">
            {status === 'unconfigured' && (
              <p role="status" className="form__msg">
                Your message is valid. Sending is not connected yet — add a form endpoint (e.g. Formspree) in the ".env" file before
                launch. Nothing has been sent.
              </p>
            )}
            {status === 'sent' && <p role="status" className="form__msg form__msg--ok">Thank you — your message has been sent. I'll get back to you soon.</p>}
            {status === 'error' && (
              <p role="alert" className="form__msg form__msg--err">
                Something went wrong and your message was not sent. Please try again{site.email ? ` or email ${site.email}` : ''}.
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
