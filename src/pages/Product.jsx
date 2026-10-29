import { useState } from 'react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { Link } from '../router.jsx';
import { useContent } from '../content/ContentProvider.jsx';
import { Button } from '../components/ui.jsx';
import { useMeta } from '../hooks/motion.js';
import { useI18n } from '../i18n/index.jsx';
import { getSource } from '../lib/source.js';

const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"'.]+(\.[^\s@<>"'.]+)+$/;
const ERR = { name: { required: 'lead.err.name', tooLong: 'lead.err.nameLong' }, email: { required: 'lead.err.email', invalid: 'lead.err.email' } };

/** Free PDF: name + email, then a temporary download link — only once the server confirms. */
function LeadForm({ product }) {
  const { leads = {} } = useContent();
  const { t, lang } = useI18n();
  const [err, setErr] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | done | nofile | error | offline | rate
  const [link, setLink] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (status === 'sending') return;
    const f = e.currentTarget.elements;
    const data = {
      product: product.slug,
      name: f.name.value.trim(),
      email: f.email.value.trim(),
      consent: !!(f.consent && f.consent.checked),
      lang,
      company: f.company.value,
      source: getSource(),
    };
    const next = {};
    if (!data.name) next.name = 'required';
    else if (data.name.length > 100) next.name = 'tooLong';
    if (!EMAIL_RE.test(data.email)) next.email = 'invalid';
    setErr(next);
    if (Object.keys(next).length) {
      (next.name ? f.name : f.email).focus();
      return;
    }
    setStatus('sending');
    let res;
    try {
      res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
    } catch {
      setStatus('offline');
      return;
    }
    let body = {};
    try {
      body = await res.json();
    } catch {
      /* not JSON */
    }
    if (res.status === 201 && body.ok && body.url) {
      setLink({ url: body.url, hours: body.expiresInHours });
      setStatus('done');
      return;
    }
    if (res.status === 422 && body.fields) {
      setErr(body.fields);
      setStatus('idle');
      return;
    }
    setStatus(res.status === 409 ? 'nofile' : res.status === 429 ? 'rate' : 'error');
  };

  if (status === 'done' && link) {
    return (
      <div className="lead lead--done" role="status">
        <p className="lead__ok">{leads.success || t('lead.success')}</p>
        <Button href={link.url} download arrow>{t('lead.download')}</Button>
        <p className="lead__small">{t('lead.expires', { n: link.hours })}</p>
      </div>
    );
  }

  const msg = (k) => err[k] && t((ERR[k] && ERR[k][err[k]]) || 'lead.err.fix');
  return (
    <form className="lead form" noValidate onSubmit={onSubmit} aria-label={t('lead.form')}>
      {leads.formIntro && <p className="lead__intro">{leads.formIntro}</p>}
      <div className="form__row">
        <label className="field">
          {t('lead.name')}
          <input type="text" name="name" autoComplete="name" maxLength={120} aria-invalid={!!err.name} className={err.name ? 'is-invalid' : ''} required />
          {err.name && <span role="alert" className="field__err">{msg('name')}</span>}
        </label>
        <label className="field">
          {t('lead.email')}
          <input type="email" name="email" autoComplete="email" dir="ltr" aria-invalid={!!err.email} className={err.email ? 'is-invalid' : ''} required />
          {err.email && <span role="alert" className="field__err">{msg('email')}</span>}
        </label>
      </div>
      {leads.consentLabel && (
        <label className="lead__consent">
          <input type="checkbox" name="consent" />
          <span>{leads.consentLabel}</span>
        </label>
      )}
      <label className="sr-only" aria-hidden="true">
        {t('contact.company')}
        <input type="text" name="company" tabIndex={-1} autoComplete="off" />
      </label>
      {leads.privacy && <p className="lead__privacy">{leads.privacy}</p>}
      <div>
        <Button type="submit" arrow disabled={status === 'sending'} aria-busy={status === 'sending'}>
          {status === 'sending' ? t('lead.sending') : product.cta || t('lead.cta')}
        </Button>
      </div>
      <div aria-live="polite">
        {status === 'nofile' && <p role="alert" className="form__msg form__msg--err">{t('lead.noFile')}</p>}
        {status === 'error' && <p role="alert" className="form__msg form__msg--err">{t('lead.failed')}</p>}
        {status === 'offline' && <p role="alert" className="form__msg form__msg--err">{t('contact.offline')}</p>}
        {status === 'rate' && <p role="alert" className="form__msg form__msg--err">{t('contact.rate')}</p>}
      </div>
    </form>
  );
}

export default function Product({ product: p }) {
  const { site } = useContent();
  const { t } = useI18n();
  useMeta(p.seoTitle || `${p.t} — ${site.name}`, p.seoDescription || p.d);
  const price = p.kind === 'paid' && p.price ? `${p.price} ${p.currency || ''}`.trim() : '';
  return (
    <>
      <Header />
      <main id="main" className="prodpage">
        <div className="prodpage__wrap">
          <p className="cs-crumb in-1">
            <Link className="ulink" to="/#products">{t('product.back')}</Link>
          </p>
          <div className="prodpage__grid">
            <div className="prodpage__art" style={{ background: p.bg }}>
              {p.image ? <img src={p.image} alt={p.imageAlt || p.t} /> : <span aria-hidden="true" style={{ boxShadow: `14px 14px 0 ${p.c}` }} />}
            </div>
            <div className="prodpage__body in-2">
              <span className={`status ${p.kind === 'soon' ? 'status--soon' : 'status--available'}`}>
                {p.kind === 'free' ? t('product.free') : p.kind === 'paid' ? t('product.paid') : t('status.soon')}
              </span>
              <h1 className="prodpage__title">{p.t}</h1>
              {p.promo && <p className="prodpage__promo">{p.promo}</p>}
              <p className="prodpage__lead">{p.d}</p>
              {p.long && <div className="prodpage__long">{p.long}</div>}

              {p.kind === 'free' && (p.hasFile ? <LeadForm product={p} /> : <p className="form__msg">{t('lead.notYet')}</p>)}
              {p.kind === 'paid' && (
                <div className="prodpage__buy">
                  {price && <p className="prodpage__price" dir="ltr">{price}</p>}
                  <p className="lead__small">{t('product.noCheckout')}</p>
                  <Button to="/#contact" variant="outline" arrow>{t('product.ask')}</Button>
                </div>
              )}
              {p.kind === 'soon' && <Button to="/#contact" variant="outline" arrow>{t('products.notify')}</Button>}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
