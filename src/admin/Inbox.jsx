// Messages sent with the website's contact form (stored by the server, never in the browser).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { useEditor, useToast } from './state.jsx';
import { Card, PageHead, useConfirm } from './ui.jsx';
import { LANGS, useAdminT, useFmtDate } from './i18n.jsx';
import { useI18n } from '../i18n/index.jsx';
import { localize } from '../../shared/i18n/localize.js';

export function Inbox({ onUnread }) {
  const t = useAdminT();
  const { lang } = useI18n();
  const fmt = useFmtDate();
  const toast = useToast();
  const confirm = useConfirm();
  const { draft } = useEditor();
  const [data, setData] = useState(null); // { items, unread, total }
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState('');
  const [busy, setBusy] = useState('');
  const [q, setQ] = useState('');
  const [stat, setStat] = useState('');
  const [notes, setNotes] = useState({ id: '', text: '' });

  // Category names in the dashboard language (from the contact paths you edit in Sections).
  const paths = useMemo(() => localize(draft, lang).contactPaths, [draft, lang]);
  const category = (m) => (paths.find((p) => p.id === m.category) || {}).title || m.categoryLabel || t('ad.in.noCategory');

  const load = useCallback(async () => {
    setError('');
    try {
      const d = await api('/api/admin/messages');
      setData(d);
    } catch (e) {
      setError(e.status === 0 ? t('ad.err.network') : e.message);
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);
  // Keep the unread badge in the menu in sync (after the list changed, never during rendering).
  const unread = data ? data.items.filter((m) => !m.read).length : null;
  useEffect(() => {
    if (unread !== null && onUnread) onUnread(unread);
  }, [unread, onUnread]);

  const setItem = (item) =>
    setData((d) => {
      const items = d.items.map((m) => (m.id === item.id ? item : m));
      return { ...d, items, unread: items.filter((m) => !m.read).length };
    });

  const patch = async (m, json, done) => {
    setBusy(m.id);
    try {
      const r = await api(`/api/admin/messages/${m.id}`, { method: 'PATCH', json });
      setItem(r.item);
      if (done) toast(done);
    } catch (e) {
      toast(t('ad.in.failed', { msg: e.message }), 'error');
    } finally {
      setBusy('');
    }
  };

  const setRead = (m, read) => patch(m, { read });

  const open = (m) => {
    setOpenId(m.id);
    if (!m.read) setRead(m, true);
  };

  const remove = async (m) => {
    if (!(await confirm({ title: t('ad.in.deleteTitle', { name: m.name }), body: t('ad.in.deleteBody'), ok: t('ad.in.delete'), danger: true }))) return;
    setBusy(m.id);
    try {
      await api(`/api/admin/messages/${m.id}`, { method: 'DELETE' });
      setData((d) => {
        const items = d.items.filter((x) => x.id !== m.id);
        return { ...d, items, unread: items.filter((x) => !x.read).length, total: items.length };
      });
      setOpenId('');
      toast(t('ad.in.deleted'));
    } catch (e) {
      toast(t('ad.in.failed', { msg: e.message }), 'error');
    } finally {
      setBusy('');
    }
  };

  const needle = q.trim().toLowerCase();
  const items = data
    ? data.items.filter(
        (m) =>
          (filter !== 'unread' || !m.read) &&
          (!stat || (m.status || 'new') === stat) &&
          (!needle || [m.name, m.email, m.message, m.notes].some((x) => String(x || '').toLowerCase().includes(needle)))
      )
    : [];
  const sourceText = (s) => (s && Object.keys(s).length ? Object.entries(s).map(([k, v]) => `${k.replace('utm_', '')}: ${v}`).join(' · ') : t('ad.in.direct'));
  const cur = data && data.items.find((m) => m.id === openId);
  const langName = (c) => (LANGS.find((l) => l.code === c) || LANGS[0]).label;

  return (
    <>
      <PageHead title={t('ad.in.title')} intro={t('ad.in.intro')}>
        <a className="ad-btn ad-btn--ghost" href="/api/admin/messages.csv" download>{t('ad.in.csv')}</a>
        <button type="button" className="ad-btn ad-btn--ghost" onClick={load}>{t('ad.in.refresh')}</button>
      </PageHead>
      {error && <p className="ad-error" role="alert">{error}</p>}
      {!data && !error && <p className="ad-empty" role="status">{t('ad.in.loading')}</p>}
      {data && (
        <div className={`ad-inbox${cur ? ' has-open' : ''}`}>
          <Card>
            <div className="ad-inbox__filters" role="group" aria-label={t('ad.in.list')}>
              <button type="button" className={`ad-chip${filter === 'all' ? ' is-on' : ''}`} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>{t('ad.in.all', { n: data.total })}</button>
              <button type="button" className={`ad-chip${filter === 'unread' ? ' is-on' : ''}`} aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>{t('ad.in.unreadF', { n: data.unread })}</button>
            </div>
            <div className="ad-filterbar">
              <input className="ad-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ad.in.search')} aria-label={t('ad.in.search')} />
              <select className="ad-input" value={stat} onChange={(e) => setStat(e.target.value)} aria-label={t('ad.in.status')}>
                <option value="">{t('ad.in.allStatus')}</option>
                {['new', 'progress', 'done'].map((k) => <option key={k} value={k}>{t(`ad.in.st.${k}`)}</option>)}
              </select>
            </div>
            {items.length === 0 ? (
              <p className="ad-empty">{filter === 'unread' && data.total ? t('ad.in.emptyUnread') : t('ad.in.empty')}</p>
            ) : (
              <ul className="ad-msgs">
                {items.map((m) => (
                  <li key={m.id}>
                    <button type="button" className={`ad-msg${m.read ? '' : ' is-unread'}${m.id === openId ? ' is-open' : ''}`} onClick={() => open(m)} aria-current={m.id === openId ? 'true' : undefined}>
                      <span className="ad-msg__top">
                        <b className="ad-msg__name">{m.name}</b>
                        {!m.read && <span className="ad-badge ad-badge--warn ad-badge--xs">{t('ad.in.new')}</span>}
                        {m.status && m.status !== 'new' && <span className={`ad-badge ad-badge--xs ${m.status === 'done' ? 'ad-badge--ok' : 'ad-badge--muted'}`}>{t(`ad.in.st.${m.status}`)}</span>}
                        <time className="ad-msg__date" dateTime={m.createdAt}>{fmt(m.createdAt)}</time>
                      </span>
                      <span className="ad-msg__cat">{category(m)}</span>
                      <span className="ad-msg__preview" dir="auto">{m.message.slice(0, 140)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            {!cur ? (
              <p className="ad-empty">{t('ad.in.pick')}</p>
            ) : (
              <article className="ad-read" aria-label={cur.name}>
                <button type="button" className="ad-link ad-read__back" onClick={() => setOpenId('')}>{t('ad.in.back')}</button>
                <h2 className="ad-read__name">{cur.name}</h2>
                <dl className="ad-read__meta">
                  <div><dt>{t('ad.in.email')}</dt><dd><a href={`mailto:${cur.email}`} dir="ltr">{cur.email}</a></dd></div>
                  <div><dt>{t('ad.in.category')}</dt><dd>{category(cur)}</dd></div>
                  <div><dt>{t('ad.in.received')}</dt><dd><time dateTime={cur.createdAt}>{fmt(cur.createdAt)}</time></dd></div>
                  <div><dt>{t('ad.in.language')}</dt><dd>{langName(cur.lang)}</dd></div>
                  <div><dt>{t('ad.in.source')}</dt><dd dir="ltr">{sourceText(cur.source)}</dd></div>
                </dl>
                <p className="ad-read__body" dir="auto">{cur.message}</p>
                <div className="ad-crm">
                  <label className="ad-label" htmlFor="ad-msg-status">{t('ad.in.status')}</label>
                  <select id="ad-msg-status" className="ad-input ad-input--sm" value={cur.status || 'new'} disabled={busy === cur.id} onChange={(e) => patch(cur, { status: e.target.value }, t('ad.in.statusSaved'))}>
                    {['new', 'progress', 'done'].map((k) => <option key={k} value={k}>{t(`ad.in.st.${k}`)}</option>)}
                  </select>
                  <label className="ad-label" htmlFor="ad-msg-notes">{t('ad.in.notes')}</label>
                  <textarea
                    id="ad-msg-notes"
                    className="ad-input"
                    rows={3}
                    maxLength={4000}
                    value={notes.id === cur.id ? notes.text : cur.notes || ''}
                    onChange={(e) => setNotes({ id: cur.id, text: e.target.value })}
                  />
                  <div className="ad-row">
                    <button
                      type="button"
                      className="ad-btn ad-btn--ghost"
                      disabled={busy === cur.id || notes.id !== cur.id || notes.text === (cur.notes || '')}
                      onClick={() => patch(cur, { notes: notes.text }, t('ad.in.notesSaved'))}
                    >
                      {t('ad.in.saveNotes')}
                    </button>
                    <span className="ad-help">{t('ad.in.notesHelp')}</span>
                  </div>
                </div>
                <div className="ad-row">
                  <a className="ad-btn ad-btn--primary" href={`mailto:${cur.email}?subject=${encodeURIComponent(t('ad.in.replySubject'))}`}>{t('ad.in.reply')}</a>
                  <button type="button" className="ad-btn ad-btn--ghost" disabled={busy === cur.id} onClick={() => setRead(cur, !cur.read)}>
                    {cur.read ? t('ad.in.markUnread') : t('ad.in.markRead')}
                  </button>
                  <button type="button" className="ad-btn ad-btn--danger" disabled={busy === cur.id} onClick={() => remove(cur)}>{t('ad.in.delete')}</button>
                </div>
              </article>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
