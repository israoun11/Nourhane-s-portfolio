// Full-screen image viewer (project galleries, "My story" photos).
// Keyboard: ← → to browse, Escape to close. Focus stays inside while open.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n/index.jsx';

export default function Lightbox({ images, start = 0, onClose }) {
  const { t, dir } = useI18n();
  const [i, setI] = useState(start);
  const n = images.length;
  const ref = useRef(null);
  const go = (d) => setI((v) => (v + d + n) % n);

  useEffect(() => {
    const prev = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current && ref.current.querySelector('[data-autofocus]').focus();
    const key = (e) => {
      if (e.key === 'Escape') return onClose();
      if (e.key === 'ArrowRight') go(dir === 'rtl' ? -1 : 1);
      if (e.key === 'ArrowLeft') go(dir === 'rtl' ? 1 : -1);
      if (e.key === 'Tab') {
        const f = [...ref.current.querySelectorAll('button')];
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      document.body.style.overflow = prevOverflow;
      prev && prev.focus && prev.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const img = images[i];
  if (!img) return null;
  return createPortal(
    <div className="lb" role="dialog" aria-modal="true" aria-label={t('cs.lightbox')} ref={ref} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <button type="button" className="lb__close" onClick={onClose} data-autofocus>{t('cs.lbClose')} ✕</button>
      <figure className="lb__fig" key={img.src}>
        <img src={img.src} alt={img.alt || ''} />
        {(img.caption || n > 1) && (
          <figcaption>
            {n > 1 && <span className="lb__count">{t('cs.lbCount', { i: i + 1, n })}</span>}
            {img.caption}
          </figcaption>
        )}
      </figure>
      {n > 1 && (
        <>
          <button type="button" className="lb__nav lb__nav--prev round-btn round-btn--light" onClick={() => go(-1)} aria-label={t('cs.lbPrev')}>←</button>
          <button type="button" className="lb__nav lb__nav--next round-btn round-btn--light" onClick={() => go(1)} aria-label={t('cs.lbNext')}>→</button>
        </>
      )}
    </div>,
    document.body
  );
}
