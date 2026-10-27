import { Link } from '../router.jsx';
import { nav } from '../data/site.js';
import { useContent } from '../content/ContentProvider.jsx';

export default function Footer() {
  const { site, text } = useContent();
  const f = text.footer;
  const socials = [
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
          <nav aria-label="Footer" className="footer__links">
            {nav.map((n) => (
              <Link key={n.label} className="ulink" to={n.href}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="footer__links">
            {site.cv ? (
              <a className="ulink" href={site.cv} target="_blank" rel="noreferrer">
                Download CV ↗
              </a>
            ) : null}
            {site.codastudioUrl && (
              <a className="ulink" href={site.codastudioUrl} target="_blank" rel="noreferrer">
                CodaStudio ↗
              </a>
            )}
            <Link className="ulink" to="/work">
              Full portfolio ↗
            </Link>
            {socials.length ? (
              socials.map(([label, url]) => (
                <a key={label} className="ulink" href={url} target="_blank" rel="noreferrer">
                  {label} ↗
                </a>
              ))
            ) : (
              <span className="footer__note">Social links appear once profiles are provided.</span>
            )}
          </div>
        </div>
        <p className="footer__mark" aria-hidden="true">
          NOURHANE <em>Thabet</em>
          <sup>®</sup>
        </p>
        <div className="footer__base">
          <span>© {new Date().getFullYear()} {site.name}. All rights reserved.</span>
          <span className="footer__legal">
            <a className="ulink" href="#legal">Legal notice</a>
            <a className="ulink" href="#privacy">Privacy policy</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
