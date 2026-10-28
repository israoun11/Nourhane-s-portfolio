// Supplies the live website content to every component.
// 1. Uses the content the server embedded in the page (no flash, no extra request).
// 2. Otherwise (development / static hosting) shows the approved defaults and fetches /api/content.
// 3. In preview mode, shows the dashboard's unsaved draft — only in that browser tab.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { defaultContent } from '../../shared/default-content.js';
import { publicView } from '../../shared/schema.js';

const Ctx = createContext(null);

// Content saved (or previewed) before the logo carousel existed has no `logos` list.
const withLogos = (d) => (d && !Array.isArray(d.logos) ? { ...d, logos: defaultContent.logos } : d);
export const PREVIEW_KEY = 'nt-preview-draft';
const PREVIEW_FLAG = 'nt-preview-on';

function readEmbedded() {
  const el = document.getElementById('nt-content');
  if (!el) return null;
  try {
    return JSON.parse(el.textContent);
  } catch {
    return null;
  }
}

function readPreview() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('preview')) sessionStorage.setItem(PREVIEW_FLAG, '1');
    if (sessionStorage.getItem(PREVIEW_FLAG) !== '1') return null;
    const draft = JSON.parse(localStorage.getItem(PREVIEW_KEY) || 'null');
    if (!draft || Date.now() - draft.savedAt > 6 * 3600 * 1000) return null;
    // The project being edited is shown even if it is still hidden.
    const data = { ...draft.data, projects: draft.data.projects.map((p) => (draft.slug && p.slug === draft.slug ? { ...p, published: true } : p)) };
    return publicView(withLogos(data));
  } catch {
    return null;
  }
}

export function exitPreview() {
  try {
    sessionStorage.removeItem(PREVIEW_FLAG);
  } catch {
    /* ignore */
  }
  window.location.href = window.location.pathname;
}

export function ContentProvider({ children }) {
  const [state, setState] = useState(() => {
    const preview = readPreview();
    if (preview) return { data: preview, version: 0, preview: true };
    const embedded = readEmbedded();
    if (embedded && embedded.data) return { data: withLogos(embedded.data), version: embedded.version, preview: false, live: true };
    return { data: publicView(defaultContent), version: 0, preview: false, live: false };
  });
  const lastFetch = useRef(state.live ? Date.now() : 0);
  const etag = useRef(state.version ? `W/"v${state.version}"` : '');

  useEffect(() => {
    if (state.preview) return undefined;
    let cancelled = false;
    const load = async () => {
      lastFetch.current = Date.now();
      try {
        const res = await fetch('/api/content', { headers: etag.current ? { 'If-None-Match': etag.current } : {} });
        if (res.status === 304 || !res.ok) return;
        const body = await res.json();
        if (cancelled || !body || !body.data) return;
        etag.current = res.headers.get('etag') || '';
        setState((s) => (s.version === body.version ? s : { data: withLogos(body.data), version: body.version, preview: false, live: true }));
      } catch {
        /* offline or static hosting: keep what we have */
      }
    };
    if (!state.live) load();
    // When a visitor comes back to the tab, quietly pick up newly saved content.
    const onVisible = () => document.visibilityState === 'visible' && Date.now() - lastFetch.current > 60000 && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

/** The current website content (published projects only). */
export const useContent = () => useContext(Ctx).data;
export const useIsPreview = () => useContext(Ctx).preview;
export const useProject = (slug) => useContext(Ctx).data.projects.find((p) => p.slug === slug);
