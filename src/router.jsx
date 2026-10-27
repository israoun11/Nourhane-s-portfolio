// A tiny client-side router (History API) — no extra dependency.
import { createContext, forwardRef, useCallback, useContext, useEffect, useState } from 'react';

const RouterCtx = createContext({ path: '/', navigate: () => {} });

const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function scrollToHash(hash, instant = false) {
  if (!hash) return false;
  const el = document.getElementById(decodeURIComponent(hash.replace('#', '')));
  if (!el) return false;
  el.scrollIntoView({ behavior: instant || prefersReduced() ? 'auto' : 'smooth', block: 'start' });
  return true;
}

export function RouterProvider({ children }) {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to) => {
    const url = new URL(to, window.location.href);
    if (url.origin !== window.location.origin) {
      window.location.href = to;
      return;
    }
    const samePath = url.pathname === window.location.pathname;
    window.history.pushState(null, '', url.pathname + url.search + url.hash);
    if (samePath) {
      if (url.hash) scrollToHash(url.hash);
      else window.scrollTo({ top: 0, behavior: prefersReduced() ? 'auto' : 'smooth' });
    } else {
      setPath(url.pathname);
    }
  }, []);

  return <RouterCtx.Provider value={{ path, navigate }}>{children}</RouterCtx.Provider>;
}

export const useRouter = () => useContext(RouterCtx);

export const Link = forwardRef(function Link({ to, onClick, children, ...rest }, ref) {
  const { navigate } = useRouter();
  const handle = (e) => {
    if (onClick) onClick(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (rest.target === '_blank' || /^(https?:|mailto:|tel:)/.test(to)) return;
    e.preventDefault();
    navigate(to);
  };
  return (
    <a ref={ref} href={to} onClick={handle} {...rest}>
      {children}
    </a>
  );
});
