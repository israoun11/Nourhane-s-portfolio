// Holds the saved content (as confirmed by the server) and the working draft.
// Nothing counts as saved until the server answers with a new version.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, getIn, setIn } from './api.js';
import { validateContent } from '../../shared/schema.js';
import { PREVIEW_KEY } from '../content/ContentProvider.jsx';
import { useAdminT } from './i18n.jsx';

const Ctx = createContext(null);
const ToastCtx = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 8000 : 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="ad-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`ad-toast ad-toast--${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
            <span aria-hidden="true">{t.kind === 'error' ? '!' : '✓'}</span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function EditorProvider({ children }) {
  const toast = useToast();
  const t = useAdminT();
  const [saved, setSaved] = useState(null); // { data, version, updatedAt }
  const [draft, setDraft] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]); // [{ path, message }]
  const [conflict, setConflict] = useState(false);
  const savingRef = useRef(false);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const c = await api('/api/admin/content');
      setSaved(c);
      setDraft(c.data);
      setErrors([]);
      setConflict(false);
    } catch (e) {
      setLoadError(e.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(() => !!(saved && draft && JSON.stringify(saved.data) !== JSON.stringify(draft)), [saved, draft]);

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!dirty) return undefined;
    const fn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, [dirty]);

  const update = useCallback((path, value) => setDraft((d) => setIn(d, path, value)), []);
  /** Like update, but computes the new value from the latest draft (safe after slow uploads). */
  const updateWith = useCallback((path, fn) => setDraft((d) => setIn(d, path, fn(getIn(d, path)))), []);
  const read = useCallback((path) => getIn(draft, path), [draft]);
  const readSaved = useCallback((path) => (saved ? getIn(saved.data, path) : undefined), [saved]);

  const save = useCallback(async () => {
    if (savingRef.current || !saved) return false;
    const check = validateContent(structuredClone(draft));
    if (!check.ok) {
      setErrors(check.errors);
      toast(t('ad.save.invalid', { n: check.errors.length }), 'error');
      return false;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const next = await api('/api/admin/content', { method: 'PUT', json: { data: draft, version: saved.version } });
      setSaved(next);
      setDraft(next.data);
      setErrors([]);
      try {
        localStorage.removeItem(PREVIEW_KEY);
      } catch {
        /* ignore */
      }
      toast(t('ad.save.ok'));
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        setErrors(e.body.errors || []);
        toast(t('ad.save.invalid', { n: (e.body.errors || []).length }), 'error');
      } else if (e instanceof ApiError && e.status === 409) {
        setConflict(true);
      } else if (!(e instanceof ApiError && e.status === 401)) {
        toast(t('ad.save.failed', { msg: e.status === 0 ? t('ad.err.network') : e.message }), 'error');
      } else {
        toast(t('ad.save.relogin'), 'error');
      }
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [draft, saved, toast, t]);

  const discard = useCallback(() => {
    if (saved) setDraft(saved.data);
    setErrors([]);
  }, [saved]);

  const preview = useCallback(
    (path = '/', slug = '') => {
      try {
        localStorage.setItem(PREVIEW_KEY, JSON.stringify({ data: draft, savedAt: Date.now(), slug }));
      } catch {
        toast(t('ad.save.previewBlocked'), 'error');
        return;
      }
      window.open(`${path}${path.includes('?') ? '&' : '?'}preview=1`, '_blank', 'noopener');
    },
    [draft, toast, t]
  );

  /**
   * Puts a PDF into its field and saves that field on the server at once. Other unsaved edits
   * stay in the draft. Returns 'saved', or 'draft' when the item itself is not saved yet.
   */
  const saveFile = useCallback(async (path, url, name) => {
    try {
      const next = await api('/api/admin/content/file', { method: 'POST', json: { path, url, name } });
      setSaved(next);
      setDraft((d) => setIn(setIn(d, path, url), ['fileNames'], next.data.fileNames || {}));
      return 'saved';
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.body.code === 'NOT_SAVED') {
        setDraft((d) => setIn(setIn(d, path, url), ['fileNames', url], name));
        return 'draft';
      }
      throw e;
    }
  }, []);

  const replaceSaved = useCallback((next) => {
    setSaved(next);
    setDraft(next.data);
    setErrors([]);
    setConflict(false);
  }, []);

  const value = { saved, draft, dirty, saving, errors, conflict, loadError, load, update, updateWith, read, readSaved, save, saveFile, discard, preview, replaceSaved, setErrors };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useEditor = () => useContext(Ctx);
