import { useEffect, useRef, useState } from 'react';
import { Link, useRouter } from '../router.jsx';
import { nav } from '../data/site.js';
import { Button } from './ui.jsx';
import { isReduced, useScrollVar } from '../hooks/motion.js';
import { useT } from '../i18n/index.jsx';
import LangSwitcher from './LangSwitcher.jsx';

const sectionIds = nav.map((n) => n.id).filter(Boolean);

export default function Header({ variant = 'light', progress = true }) {
  const { path } = useRouter();
  const t = useT();
  const isHome = path === '/';
  const [active, setActive] = useState('');
  const [scrolled, setScrolled] = useState(false);
  // closed → open → closing → closed (the menu fades out before it unmounts)
  const [menu, setMenu] = useState('closed');
  const closeTimer = useRef(0);
  const openMenu = () => {
    clearTimeout(closeTimer.current);
    setMenu('open');
  };
  const closeMenu = () => {
    if (isReduced()) return setMenu('closed');
    setMenu('closing');
    closeTimer.current = setTimeout(() => setMenu('closed'), 260);
  };
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const barRef = useRef(null);
  const headerRef = useRef(null);
  useScrollVar(headerRef, { mode: 'page', target: barRef, enabled: progress });

  useEffect(() => {
    const on = () => {
      setScrolled(window.scrollY > 8);
      if (!isHome) return;
      let a = '';
      sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < 140) a = id;
      });
      setActive(a);
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [isHome]);

  // Close the menu on route change
  useEffect(() => setMenu('closed'), [path]);

  const links = nav.map((n) => {
    const href = n.id === 'work' && !isHome ? '/work' : n.href;
    const current = isHome ? n.id && active === n.id : n.id === 'work' && path.startsWith('/work');
    return { ...n, label: t(n.key), href, current: current ? 'true' : undefined };
  });

  return (
    <>
      <header ref={headerRef} className={`header header--${variant}${scrolled ? ' is-scrolled' : ''}`}>
        {progress && <div ref={barRef} className="header__progress" aria-hidden="true" />}
        <nav className="header__inner" aria-label={t('nav.main')}>
          <Link to="/" className="wordmark">
            NOURHANE THABET<sup>®</sup>
          </Link>
          <div className="header__links only-desk">
            {links.map((l) => (
              <Link key={l.key} className="ulink" to={l.href} aria-current={l.current}>
                {l.label}
              </Link>
            ))}
          </div>
          <div className="header__end">
            <LangSwitcher className={variant === 'dark' ? 'lang--light' : ''} />
            <Button to="/#contact" size="sm" variant={variant === 'dark' ? 'pink' : 'blue'} arrow magnetic className="only-desk">
              {t('header.connect')}
            </Button>
          </div>
          <button type="button" className="menu-btn only-mob" aria-expanded={menu === 'open'} aria-controls="mobile-menu" onClick={openMenu}>
            {t('header.menu')}
            <svg width="16" height="11" viewBox="0 0 18 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M0 1h18M6 6h12M0 11h18" />
            </svg>
          </button>
        </nav>
      </header>
      {menu !== 'closed' && <MobileMenu links={links} closing={menu === 'closing'} onClose={closeMenu} />}
    </>
  );
}

function MobileMenu({ links, onClose, closing }) {
  const t = useT();
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // Runs once when the menu opens (not on every header re-render).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current && closeRef.current.focus();
    const key = (e) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', key);
    };
  }, []);

  return (
    <div id="mobile-menu" className={`mmenu on-dark${closing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-label={t('header.menuDialog')}>
      <div className="mmenu__top">
        <span className="wordmark">
          NOURHANE THABET<sup>®</sup>
        </span>
        <button ref={closeRef} type="button" className="menu-btn menu-btn--light" onClick={onClose}>
          {t('header.close')}
        </button>
      </div>
      <nav className="mmenu__nav" aria-label={t('nav.mobile')}>
        {links.map((l, i) => (
          <Link key={l.key} to={l.href} onClick={onClose} style={{ '--i': i }}>
            <span>{l.n}</span>
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="mmenu__foot">
        <LangSwitcher className="lang--light lang--lg" />
        <Button to="/#contact" onClick={onClose} className="mmenu__cta" arrow>
          {t('header.connect')}
        </Button>
      </div>
    </div>
  );
}
