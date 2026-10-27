// Dialogs and small layout pieces for the dashboard.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ConfirmCtx = createContext(async () => false);

/** const ok = await confirm({ title, body, ok: 'Delete', danger: true }) */
export function ConfirmProvider({ children }) {
  const [req, setReq] = useState(null);
  const confirm = useCallback((opts) => new Promise((resolve) => setReq({ ...opts, resolve })), []);
  const close = (v) => {
    if (req) req.resolve(v);
    setReq(null);
  };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {req && (
        <Modal title={req.title} onClose={() => close(false)}>
          {req.body && <p className="ad-modal__body">{req.body}</p>}
          <div className="ad-row ad-row--end">
            <button type="button" className="ad-btn ad-btn--ghost" onClick={() => close(false)}>{req.cancel || 'Cancel'}</button>
            <button type="button" className={`ad-btn ${req.danger ? 'ad-btn--danger' : 'ad-btn--primary'}`} onClick={() => close(true)} data-autofocus>
              {req.ok || 'OK'}
            </button>
          </div>
        </Modal>
      )}
    </ConfirmCtx.Provider>
  );
}
export const useConfirm = () => useContext(ConfirmCtx);

/** Accessible modal: focus moves in, Tab stays inside, Escape closes, focus returns afterwards. */
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const el = ref.current;
    const first = el.querySelector('[data-autofocus]') || el.querySelector('button, input, select, textarea, a[href]');
    first && first.focus();
    const key = (e) => {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Tab') {
        const f = [...el.querySelectorAll('button:not([disabled]), input, select, textarea, a[href]')];
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      prev && prev.focus && prev.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="ad-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose && onClose()}>
      <div ref={ref} className={`ad-modal${wide ? ' ad-modal--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="ad-modal-title">
        <h2 id="ad-modal-title" className="ad-modal__title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function PageHead({ title, children, intro }) {
  return (
    <header className="ad-pagehead">
      <div>
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
      {children && <div className="ad-row">{children}</div>}
    </header>
  );
}

export function Card({ title, children, intro, open, onToggle, collapsible = false }) {
  if (!collapsible) {
    return (
      <section className="ad-card">
        {title && <h2 className="ad-card__title">{title}</h2>}
        {intro && <p className="ad-help">{intro}</p>}
        {children}
      </section>
    );
  }
  return (
    <section className={`ad-card ad-card--fold${open ? ' is-open' : ''}`}>
      <h2 className="ad-card__title">
        <button type="button" aria-expanded={open} onClick={onToggle}>
          {title}
          <span aria-hidden="true">▾</span>
        </button>
      </h2>
      {open && (
        <div className="ad-card__body">
          {intro && <p className="ad-help">{intro}</p>}
          {children}
        </div>
      )}
    </section>
  );
}

export const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
};
