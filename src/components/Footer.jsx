import { Link } from '../router.jsx';
import { nav } from '../data/site.js';
import { useContent } from '../content/ContentProvider.jsx';
import { useT } from '../i18n/index.jsx';

export default function Footer() {
  const { site, text } = useContent();
  const t = useT();
  const f = text.footer;
  // the uploaded CV PDF first, otherwise the CV link
  const cvUrl = site.cvFile || site.cv || '';
  const wa = String(site.whatsapp || '').replace(/\D/g, '');
  const socials = [
    [t('contact.m.email'), site.email ? `mailto:${site.email}` : ''],
    ['WhatsApp', wa ? `https://wa.me/${wa}${site.whatsappMessage ? `?text=${encodeURIComponent(site.whatsappMessage)}` : ''}` : ''],
    ['LinkedIn', site.socials.linkedin],
    ['Instagram', site.socials.instagram],
    ['YouTube', site.socials.youtube],
  ].filter(([, url]) => url);

  return (
    <footer className="footer on-dark">
      <div className="container">
        <p className="footer__motto">
          {f.motto1} <span className="c-pink">{f.motto2}</span> <span className="c-aqua">{f.motto3}</span>
        </p>
        <div className="footer__row">
          <nav aria-label={t('nav.footer')} className="footer__links">
            {nav.map((n) => (
              <Link key={n.key} className="ulink" to={n.href}>
                {t(n.key)}
              </Link>
            ))}
          </nav>
          <div className="footer__links">
            {site.codastudioUrl && (
              <a className="ulink" href={site.codastudioUrl} target="_blank" rel="noreferrer">
                {t('footer.coda')}
              </a>
            )}
            <Link className="footer__portfolio" to="/work">
              {t('footer.portfolio')}
            </Link>
            {socials.length ? (
              socials.map(([label, url]) => (
                <a key={label} className="ulink" href={url} {...(url.startsWith('mailto:') ? {} : { target: '_blank', rel: 'noreferrer' })}>
                  {label} ↗
                </a>
              ))
            ) : (
              <span className="footer__note">{t('footer.socialsNote')}</span>
            )}
          </div>
        </div>
        <div className="footer__cv">
          {cvUrl ? (
            <>
              <a className="btn btn--pink btn--md" href={cvUrl} target="_blank" rel="noreferrer" {...(site.cvFile ? { download: '' } : {})} aria-label={t('footer.cvAria', { name: site.name })}>
                {site.cvLabel || t('footer.cvBtn')} <span className="ar" aria-hidden="true">↓</span>
              </a>
              <span className="footer__note">{t('footer.cvNote')}</span>
            </>
          ) : (
            <>
              <Link className="btn btn--pink btn--md" to="/#contact">{t('footer.cvRequest')} <span className="ar" aria-hidden="true">↗</span></Link>
              <span className="footer__note">{t('footer.cvRequestNote')}</span>
            </>
          )}
        </div>
        <p className="footer__mark" aria-hidden="true">
          NOURHANE <em>Thabet</em>
          <sup>®</sup>
        </p>
        <div className="footer__base">
          <span>{t('footer.rights', { year: new Date().getFullYear(), name: site.name })}</span>
          <span className="footer__legal">
            <a className="ulink" href="#legal">{t('footer.legal')}</a>
            <a className="ulink" href="#privacy">{t('footer.privacy')}</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
