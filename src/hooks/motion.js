// Motion helpers. Every effect is skipped when the visitor prefers reduced motion,
// and the CSS defaults always describe the final, fully visible state.
import { useEffect, useState } from 'react';

const mq = (q) => typeof window !== 'undefined' && window.matchMedia && window.matchMedia(q);

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => !!(mq('(prefers-reduced-motion: reduce)') || {}).matches);
  useEffect(() => {
    const m = mq('(prefers-reduced-motion: reduce)');
    if (!m) return undefined;
    const on = () => setReduced(m.matches);
    m.addEventListener ? m.addEventListener('change', on) : m.addListener(on);
    return () => (m.removeEventListener ? m.removeEventListener('change', on) : m.removeListener(on));
  }, []);
  return reduced;
}

export const isReduced = () => !!(mq('(prefers-reduced-motion: reduce)') || {}).matches;
export const isFinePointer = () => !!(mq('(hover: hover) and (pointer: fine)') || {}).matches;

// ── Shared scroll loop: one rAF per frame for every subscriber ──
const subs = new Set();
let ticking = false;
function frame() {
  ticking = false;
  subs.forEach((fn) => fn());
}
function request() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(frame);
  }
}
if (typeof window !== 'undefined') {
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
}
function subscribe(fn) {
  subs.add(fn);
  request();
  return () => subs.delete(fn);
}

const clamp = (v) => Math.min(1, Math.max(0, v));

/**
 * Writes a 0→1 scroll progress of `ref` into a CSS variable on that element.
 * mode 'cover'   : from the element entering the bottom to leaving the top
 * mode 'exit'    : from the element's top at viewport top to its bottom at viewport top
 * mode 'contain' : across a tall element's scrollable span (sticky layouts)
 * mode 'page'    : the whole document (reading progress)
 * from/to remap the raw progress (e.g. from .1 to .5 = finish halfway).
 */
export function useScrollVar(ref, { mode = 'cover', name = '--p', from = 0, to = 1, target, enabled = true } = {}) {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || isReduced()) return undefined;
    const out = target ? target.current || el : el;
    return subscribe(() => {
      const vh = window.innerHeight;
      let raw;
      if (mode === 'page') {
        const max = document.documentElement.scrollHeight - vh;
        raw = max > 0 ? window.scrollY / max : 0;
      } else {
        const r = el.getBoundingClientRect();
        if (mode === 'exit') raw = -r.top / Math.max(1, r.height);
        else if (mode === 'contain') raw = -r.top / Math.max(1, r.height - vh);
        else raw = (vh - r.top) / (vh + r.height);
      }
      const v = clamp((raw - from) / (to - from));
      out.style.setProperty(name, v.toFixed(4));
    });
  }, [ref, mode, name, from, to, target, enabled]);
}

/** Pointer position over an element as --mx / --my (-1 → 1). Desktop only. */
export function usePointerVars(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el || isReduced() || !isFinePointer()) return undefined;
    let raf = 0;
    const move = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        el.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      });
    };
    const leave = () => {
      el.style.setProperty('--mx', '0');
      el.style.setProperty('--my', '0');
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [ref]);
}

/** Subtle magnetic pull for buttons (max ~7px). */
export function useMagnetic(ref, enabled = true, strength = 0.22) {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || isReduced() || !isFinePointer()) return undefined;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * strength;
      const y = (e.clientY - (r.top + r.height / 2)) * strength;
      el.style.setProperty('--tx', `${Math.max(-7, Math.min(7, x)).toFixed(1)}px`);
      el.style.setProperty('--ty', `${Math.max(-7, Math.min(7, y)).toFixed(1)}px`);
    };
    const leave = () => {
      el.style.setProperty('--tx', '0px');
      el.style.setProperty('--ty', '0px');
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [ref, enabled, strength]);
}

/** Runs `onEnter` once when the element becomes visible. */
export function useInView(ref, onEnter, rootMargin = '0px 0px -12% 0px') {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window)) {
      onEnter();
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          onEnter();
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
}

/** Sets document title and meta description per page. */
export function useMeta(title, description) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) {
        m = document.createElement('meta');
        m.setAttribute('name', 'description');
        document.head.appendChild(m);
      }
      m.setAttribute('content', description);
    }
  }, [title, description]);
}
