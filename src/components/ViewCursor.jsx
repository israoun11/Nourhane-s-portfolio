// A small "VIEW ↗" bubble that follows the pointer over project cards (desktop only).
import { useEffect, useRef, useState } from 'react';
import { isFinePointer, isReduced } from '../hooks/motion.js';

export default function ViewCursor() {
  const ref = useRef(null);
  const [enabled] = useState(() => isFinePointer() && !isReduced());

  useEffect(() => {
    if (!enabled) return undefined;
    const el = ref.current;
    let x = 0, y = 0, cx = 0, cy = 0, raf = 0, active = false;

    const loop = () => {
      cx += (x - cx) * 0.22;
      cy += (y - cy) * 0.22;
      el.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%) scale(${active ? 1 : 0})`;
      raf = requestAnimationFrame(loop);
    };
    const move = (e) => {
      x = e.clientX;
      y = e.clientY;
      const t = e.target instanceof Element ? e.target.closest('[data-cursor]') : null;
      const next = !!t;
      if (next !== active) {
        active = next;
        el.classList.toggle('is-active', active);
      }
      if (t) el.firstChild.textContent = t.getAttribute('data-cursor');
    };
    const hide = () => {
      active = false;
      el.classList.remove('is-active');
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', hide);
    window.addEventListener('blur', hide);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', hide);
      window.removeEventListener('blur', hide);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div ref={ref} className="view-cursor" aria-hidden="true">
      <span>View</span>
    </div>
  );
}
