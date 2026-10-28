// Fades and lifts every element marked data-reveal as it enters the viewport.
// Works in every browser; new elements (filters, route changes) are picked up automatically.
//
// The "already shown" mark is an attribute (data-in), not a class: React rewrites the
// class list whenever a component changes its classes (e.g. a selected card gets
// "is-on"), which used to wipe a class-based mark and hide the element again.
import { useEffect } from 'react';
import { isReduced } from '../hooks/motion.js';

export default function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    if (isReduced() || !('IntersectionObserver' in window)) {
      root.classList.add('reveal-off');
      return undefined;
    }
    root.classList.add('reveal-on');

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.setAttribute('data-in', '');
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.01 }
    );

    const scan = (node) => {
      if (!(node instanceof Element)) return;
      if (node.matches('[data-reveal]:not([data-in])')) io.observe(node);
      node.querySelectorAll('[data-reveal]:not([data-in])').forEach((el) => io.observe(el));
    };
    scan(document.body);

    const mo = new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach(scan)));
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}
