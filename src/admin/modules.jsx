// Dashboard modules added in phase 1: story, statistics, tools, products, leads, contact &
// social, booking, CV & files, SEO, interface texts and integrations.
// Everything edits the same content document (saved with the Save bar) except leads,
// messages and appointments, which are records read from the server.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from '../router.jsx';
import { schema } from '../../shared/schema.js';
import { missingTranslations } from '../../shared/migrate.js';
import { api } from './api.js';
import { ListField, ObjectFields } from './fields.jsx';
import { useEditor, useToast } from './state.jsx';
import { Card, PageHead, useConfirm } from './ui.jsx';
import { LANGS, inputLangProps, useAdminT, useEditLang, useFmtDate } from './i18n.jsx';
import siteEn from '../i18n/site/en.js';
import siteFr from '../i18n/site/fr.js';
import siteAr from '../i18n/site/ar.js';

const F = schema.fields;
const SITE = { en: siteEn, fr: siteFr, ar: siteAr };

const ListCard = ({ k }) => (
  <Card>
    <ListField def={F[k]} path={[k]} flat />
  </Card>
);

// ═════════════ My story ═════════════
export function StoryPage() {
  const t = useAdminT();
  return (
    <>
      <PageHead title={t('ad.mod.story')} intro={t('ad.story.mosaicIntro')}>
        <a className="ad-btn ad-btn--ghost" href="/#story" target="_blank" rel="noreferrer">{t('ad.nav.view')}</a>
      </PageHead>
      <Card title={t('ad.story.texts')}>
        <ObjectFields def={F.text.fields.journey} path={['text', 'journey']} />
      </Card>
      <Card title={t('ad.story.years')}>
        <ListField def={F.timeline} path={['timeline']} flat />
      </Card>
    </>
  );
}

// ═════════════ Statistics ═════════════
export function StatsPage() {
  const t = useAdminT();
  return (
    <>
      <PageHead title={t('ad.mod.stats')} intro={t('ad.mod.statsIntro')} />
      <div className="ad-alert ad-alert--warn" role="note">{t('ad.stats.integrity')}</div>
      <ListCard k="stats" />
    </>
  );
}

// ═════════════ Tools ═════════════
/** Moves one tool to another category (the tool keeps its name, logo, link and visibility). */
function MoveTool() {
  const t = useAdminT();
  const toast = useToast();
  const { draft, update } = useEditor();
  const cats = draft.tools || [];
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [ci, ti] = from ? from.split(':').map(Number) : [-1, -1];
  const move = () => {
    const target = Number(to);
    if (ci < 0 || Number.isNaN(target) || target === ci || !cats[ci] || !cats[target]) return;
    const next = structuredClone(cats);
    const [tool] = next[ci].tools.splice(ti, 1);
    next[target].tools.push(tool);
    update(['tools'], next);
    setFrom('');
    toast(t('ad.tools.moved', { tool: tool.name, cat: next[target].title }));
  };
  return (
    <Card title={t('ad.tools.move')} intro={t('ad.tools.moveIntro')}>
      <div className="ad-filterbar">
        <select className="ad-input" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={t('ad.tools.tool')}>
          <option value="">{t('ad.tools.pickTool')}</option>
          {cats.map((c, i) => (
            <optgroup key={i} label={c.title}>
              {(c.tools || []).map((x, k) => <option key={k} value={`${i}:${k}`}>{x.name}</option>)}
            </optgroup>
          ))}
        </select>
        <select className="ad-input" value={to} onChange={(e) => setTo(e.target.value)} aria-label={t('ad.tools.target')}>
          <option value="">{t('ad.tools.pickCat')}</option>
          {cats.map((c, i) => <option key={i} value={i} disabled={i === ci}>{c.title}</option>)}
        </select>
        <button type="button" className="ad-btn ad-btn--primary" onClick={move} disabled={!from || to === '' || Number(to) === ci}>{t('ad.tools.moveBtn')}</button>
      </div>
    </Card>
  );
}

export function ToolsPage() {
  const t = useAdminT();
  const { draft } = useEditor();
  const n = (draft.tools || []).reduce((k, c) => k + (c.tools || []).length, 0);
  return (
    <>
      <PageHead title={t('ad.mod.tools')} intro={t('ad.mod.toolsIntro')}>
        <a className="ad-btn ad-btn--ghost" href="/#tools" target="_blank" rel="noreferrer">{t('ad.nav.view')}</a>
      </PageHead>
      <p className="ad-help">{t('ad.tools.count', { c: (draft.tools || []).length, n })}</p>
      <Card title={t('ad.tools.heading')}>
        <ObjectFields def={F.text.fields.tools} path={['text', 'tools']} />
      </Card>
      <Card title={t('ad.tools.list')} intro={t('ad.tools.listIntro')}>
        <ListField def={F.tools} path={['tools']} flat />
      </Card>
      <MoveTool />
    </>
  );
}

// ═════════════ Digital products ═════════════
export function ProductsPage() {
  const t = useAdminT();
  const { draft } = useEditor();
  const free = draft.products.filter((p) => p.kind === 'free');
  return (
    <>
      <PageHead title={t('ad.mod.products')} intro={t('ad.mod.productsIntro')}>
        <Link className="ad-btn ad-btn--ghost" to="/admin/leads">{t('ad.mod.leads')}</Link>
      </PageHead>
      {free.some((p) => !p.file) && (
        <div className="ad-alert ad-alert--warn" role="status">{t('ad.prod.noFile', { names: free.filter((p) => !p.file).map((p) => p.t).join(', ') })}</div>
      )}
      <div className="ad-alert" role="note">{t('ad.prod.payments')}</div>
      <Card title={t('ad.prod.heading')}>
        <ObjectFields def={F.text.fields.products} path={['text', 'products']} />
      </Card>
      <ListCard k="products" />
      <Card title={t('ad.prod.links')}>
        <ul className="ad-todo">
          {draft.products.map((p) => (
            <li key={p.slug || p.t}>
              <a href={`/resources/${p.slug}`} target="_blank" rel="noreferrer" dir="ltr">/resources/{p.slug}</a> — {p.t}{p.published === false ? ` (${t('ad.f.hidden')})` : ''}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

// ═════════════ Leads (free PDF downloads) ═════════════
export function LeadsPage() {
  const t = useAdminT();
  const fmt = useFmtDate();
  const toast = useToast();
  const confirm = useConfirm();
  const { draft } = useEditor();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [product, setProduct] = useState('');
  const [consent, setConsent] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await api('/api/admin/leads'));
    } catch (e) {
      setError(e.status === 0 ? t('ad.err.network') : e.message);
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);

  const remove = async (l) => {
    if (!(await confirm({ title: t('ad.leads.deleteTitle', { name: l.name }), body: t('ad.leads.deleteBody'), ok: t('ad.in.delete'), danger: true }))) return;
    try {
      await api(`/api/admin/leads/${l.id}`, { method: 'DELETE' });
      setData((d) => ({ ...d, items: d.items.filter((x) => x.id !== l.id), total: d.total - 1 }));
      toast(t('ad.leads.deleted'));
    } catch (e) {
      toast(t('ad.in.failed', { msg: e.message }), 'error');
    }
  };

  const needle = q.trim().toLowerCase();
  const items = (data ? data.items : []).filter(
    (l) =>
      (!product || l.product === product) &&
      (!consent || (consent === 'yes') === !!l.consent) &&
      (!needle || [l.name, l.email].some((x) => String(x || '').toLowerCase().includes(needle)))
  );
  const products = [...new Set((data ? data.items : []).map((l) => l.product))];
  const nameOf = (slug, fallback) => (draft.products.find((p) => p.slug === slug) || {}).t || fallback || slug;
  const downloads = items.reduce((n, l) => n + (l.downloads || 0), 0);

  return (
    <>
      <PageHead title={t('ad.mod.leads')} intro={t('ad.mod.leadsIntro')}>
        <a className="ad-btn ad-btn--ghost" href="/api/admin/leads.csv" download>{t('ad.in.csv')}</a>
        <button type="button" className="ad-btn ad-btn--ghost" onClick={load}>{t('ad.in.refresh')}</button>
      </PageHead>
      {error && <p className="ad-error" role="alert">{error}</p>}
      {!data && !error && <p className="ad-empty" role="status">{t('ad.in.loading')}</p>}
      {data && (
        <Card>
          <div className="ad-stats ad-stats--inline">
            <div className="ad-stat"><span>{t('ad.leads.count')}</span><b>{items.length}</b></div>
            <div className="ad-stat"><span>{t('ad.leads.downloads')}</span><b>{downloads}</b><small>{t('ad.leads.downloadsHelp')}</small></div>
            <div className="ad-stat"><span>{t('ad.leads.consented')}</span><b>{items.filter((l) => l.consent).length}</b></div>
          </div>
          <div className="ad-filterbar">
            <input className="ad-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ad.leads.search')} aria-label={t('ad.leads.search')} />
            <select className="ad-input" value={product} onChange={(e) => setProduct(e.target.value)} aria-label={t('ad.leads.product')}>
              <option value="">{t('ad.leads.allProducts')}</option>
              {products.map((p) => <option key={p} value={p}>{nameOf(p)}</option>)}
            </select>
            <select className="ad-input" value={consent} onChange={(e) => setConsent(e.target.value)} aria-label={t('ad.leads.consent')}>
              <option value="">{t('ad.leads.anyConsent')}</option>
              <option value="yes">{t('ad.leads.consentYes')}</option>
              <option value="no">{t('ad.leads.consentNo')}</option>
            </select>
          </div>
          {items.length === 0 ? (
            <p className="ad-empty">{data.total ? t('ad.leads.noMatch') : t('ad.leads.empty')}</p>
          ) : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>{t('ad.leads.date')}</th><th>{t('ad.in.name')}</th><th>{t('ad.in.email')}</th><th>{t('ad.leads.product')}</th>
                    <th>{t('ad.leads.consent')}</th><th>{t('ad.leads.downloads')}</th><th><span className="sr-only">{t('ad.in.delete')}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((l) => (
                    <tr key={l.id}>
                      <td>{fmt(l.createdAt)}</td>
                      <td>{l.name}</td>
                      <td><a href={`mailto:${l.email}`} dir="ltr">{l.email}</a></td>
                      <td>{nameOf(l.product, l.productName)}</td>
                      <td>{l.consent ? t('ad.leads.consentYes') : t('ad.leads.consentNo')}</td>
                      <td>{l.downloads || 0}{l.lastDownloadAt ? <small className="ad-help"> · {fmt(l.lastDownloadAt)}</small> : null}</td>
                      <td><button type="button" className="ad-icon ad-icon--danger" onClick={() => remove(l)} aria-label={t('ad.leads.delete', { name: l.name })}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      <Card title={t('ad.leads.settings')} intro={t('ad.leads.settingsIntro')}>
        <ObjectFields def={F.leads} path={['leads']} />
      </Card>
    </>
  );
}

// ═════════════ Contact & social ═════════════
export function ContactPage() {
  const t = useAdminT();
  const { draft } = useEditor();
  const digits = String(draft.site.whatsapp || '').replace(/\D/g, '');
  return (
    <>
      <PageHead title={t('ad.mod.contact')} intro={t('ad.mod.contactIntro')} />
      <Card title={t('ad.contact.methods')} intro={t('ad.contact.methodsIntro')}>
        <ObjectFields def={F.site} path={['site']} only={['email', 'whatsapp', 'whatsappMessage', 'socials']} />
        {digits && (
          <p className="ad-help">
            {t('ad.contact.waTest')}{' '}
            <a href={`https://wa.me/${digits}${draft.site.whatsappMessage ? `?text=${encodeURIComponent(draft.site.whatsappMessage)}` : ''}`} target="_blank" rel="noreferrer" dir="ltr">wa.me/{digits}</a>
          </p>
        )}
      </Card>
      <Card title={t('ad.contact.heading')}>
        <ObjectFields def={F.text.fields.contact} path={['text', 'contact']} />
      </Card>
      <Card title={t('ad.contact.cards')} intro={t('ad.contact.cardsIntro')}>
        <ListField def={F.contactPaths} path={['contactPaths']} flat />
      </Card>
    </>
  );
}

// ═════════════ Booking ═════════════
const BUILTIN_FIELDS = ['provider', 'open', 'timezone', 'hours', 'interval', 'buffer', 'minNotice', 'maxDays', 'blocked', 'types', 'note'];
const EXTERNAL_FIELDS = ['provider', 'url', 'types', 'note'];

function Appointments({ items, onChange }) {
  const t = useAdminT();
  const fmt = useFmtDate();
  const toast = useToast();
  const confirm = useConfirm();
  const [show, setShow] = useState('upcoming');
  const now = Date.now();
  const list = items.filter((b) => (show === 'upcoming' ? Date.parse(b.end) >= now && b.status !== 'cancelled' : show === 'past' ? Date.parse(b.end) < now || b.status === 'done' : b.status === 'cancelled'));
  const patch = async (b, json, msg) => {
    try {
      const r = await api(`/api/admin/bookings/${b.id}`, { method: 'PATCH', json });
      onChange(items.map((x) => (x.id === b.id ? r.item : x)));
      toast(msg);
    } catch (e) {
      toast(t('ad.in.failed', { msg: e.message }), 'error');
    }
  };
  const remove = async (b) => {
    if (!(await confirm({ title: t('ad.bk.deleteTitle', { name: b.name }), body: t('ad.bk.deleteBody'), ok: t('ad.in.delete'), danger: true }))) return;
    try {
      await api(`/api/admin/bookings/${b.id}`, { method: 'DELETE' });
      onChange(items.filter((x) => x.id !== b.id));
      toast(t('ad.bk.deleted'));
    } catch (e) {
      toast(t('ad.in.failed', { msg: e.message }), 'error');
    }
  };
  return (
    <>
      <div className="ad-chips" role="group">
        {['upcoming', 'past', 'cancelled'].map((k) => (
          <button key={k} type="button" className={`ad-chip${show === k ? ' is-on' : ''}`} aria-pressed={show === k} onClick={() => setShow(k)}>{t(`ad.bk.${k}`)}</button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="ad-empty">{t('ad.booking.none')}</p>
      ) : (
        <ul className="ad-appts">
          {list.map((b) => (
            <li key={b.id} className="ad-appt">
              <b>{fmt(b.start)} · {b.type} ({b.duration} min)</b>
              <span>{b.name} · <a href={`mailto:${b.email}`} dir="ltr">{b.email}</a></span>
              {b.message && <span className="ad-help" dir="auto">{b.message}</span>}
              <span className={`ad-badge ad-badge--xs ${b.status === 'confirmed' ? 'ad-badge--ok' : 'ad-badge--muted'}`}>{t(`ad.bk.st.${b.status}`)}{b.cancelledBy ? ` · ${t(`ad.bk.by.${b.cancelledBy}`)}` : ''}</span>
              <div className="ad-row">
                <a className="ad-btn ad-btn--ghost ad-btn--sm" href={`mailto:${b.email}?subject=${encodeURIComponent(t('ad.bk.mailSubject'))}`}>{t('ad.in.reply')}</a>
                {b.status === 'confirmed' && <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => patch(b, { status: 'done' }, t('ad.in.statusSaved'))}>{t('ad.bk.markDone')}</button>}
                {b.status === 'confirmed' && (
                  <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={async () => (await confirm({ title: t('ad.bk.cancelTitle'), body: t('ad.bk.cancelBody'), ok: t('ad.bk.cancel') })) && patch(b, { status: 'cancelled' }, t('ad.bk.cancelled'))}>
                    {t('ad.bk.cancel')}
                  </button>
                )}
                <button type="button" className="ad-icon ad-icon--danger" onClick={() => remove(b)} aria-label={t('ad.bk.deleteTitle', { name: b.name })}>✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function BookingPage() {
  const t = useAdminT();
  const fmt = useFmtDate();
  const { draft, saved } = useEditor();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    try {
      setData(await api('/api/admin/bookings'));
    } catch (e) {
      setData({ connected: false, items: [], error: e.message });
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load, saved.version]);
  const b = draft.booking;
  const builtin = b.provider === 'builtin';
  const provider = b.provider === 'cal' ? 'Cal.com' : 'Calendly';
  const env = b.provider === 'cal' ? 'CALCOM_API_KEY' : 'CALENDLY_TOKEN';
  const own = data ? (builtin ? data.items : data.own) || [] : [];
  return (
    <>
      <PageHead title={t('ad.mod.booking')} intro={t(builtin ? 'ad.bk.intro' : 'ad.mod.bookingIntro')}>
        <a className="ad-btn ad-btn--ghost" href="/#contact" target="_blank" rel="noreferrer">{t('ad.nav.view')}</a>
      </PageHead>
      {builtin && (
        <div className={`ad-alert ${b.open ? '' : 'ad-alert--warn'}`} role="status">
          {b.open ? t('ad.bk.isOpen') : t('ad.bk.isClosed')}
          {saved.data.booking.open !== b.open && ` ${t('ad.bk.saveToApply')}`}
        </div>
      )}
      <Card title={t('ad.booking.settings')} intro={t(builtin ? 'ad.bk.settingsIntro' : 'ad.booking.settingsIntro')}>
        <ObjectFields def={F.booking} path={['booking']} only={builtin ? BUILTIN_FIELDS : EXTERNAL_FIELDS} />
        {!builtin && !b.url && !(b.types || []).some((x) => x.url) && <p className="ad-alert ad-alert--warn">{t('ad.booking.noUrl')}</p>}
      </Card>
      {(builtin || own.length > 0) && (
        <Card title={t('ad.bk.appointments')}>
          <button type="button" className="ad-btn ad-btn--ghost" onClick={load} disabled={busy}>{t('ad.in.refresh')}</button>
          {data && <Appointments items={own} onChange={(items) => setData((d) => (builtin ? { ...d, items } : { ...d, own: items }))} />}
        </Card>
      )}
      {!builtin && (
        <Card title={t('ad.booking.upcoming', { provider })}>
          <div className="ad-row">
            <span className={`ad-badge ${data && data.connected && !data.error ? 'ad-badge--ok' : 'ad-badge--muted'}`}>
              {!data ? '…' : data.connected ? (data.error ? t('ad.int.error') : t('ad.int.connected')) : t('ad.int.notConnected')}
            </span>
            <button type="button" className="ad-btn ad-btn--ghost" onClick={load} disabled={busy}>{t('ad.in.refresh')}</button>
          </div>
          {data && !data.connected && <p className="ad-help">{t('ad.booking.howConnect', { provider, env })}</p>}
          {data && data.error && <p className="ad-error" role="alert">{data.error}</p>}
          {data && data.connected && !data.error && data.items.length === 0 && <p className="ad-empty">{t('ad.booking.none')}</p>}
          {data && data.items.length > 0 && (
            <ul className="ad-appts">
              {data.items.map((a) => (
                <li key={a.id} className="ad-appt">
                  <b>{fmt(a.start)}</b>
                  <span>{a.title}</span>
                  {a.invitees.map((i) => (
                    <span key={i.email} className="ad-help">
                      {i.name} · <a href={`mailto:${i.email}`} dir="ltr">{i.email}</a>
                      {i.rescheduleUrl && <> · <a href={i.rescheduleUrl} target="_blank" rel="noreferrer">{t('ad.booking.reschedule')}</a></>}
                      {i.cancelUrl && <> · <a href={i.cancelUrl} target="_blank" rel="noreferrer">{t('ad.booking.cancel')}</a></>}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          )}
          <p className="ad-help">{t('ad.booking.readOnly', { provider })}</p>
        </Card>
      )}
    </>
  );
}

// ═════════════ CV & files ═════════════
export function FilesPage() {
  const t = useAdminT();
  const { draft } = useEditor();
  return (
    <>
      <PageHead title={t('ad.mod.files')} intro={t('ad.mod.filesIntro')} />
      <Card title={t('ad.files.cv')}>
        <ObjectFields def={F.site} path={['site']} only={['cvFile', 'cvLabel', 'cv']} />
        {!draft.site.cvFile && !draft.site.cv && <p className="ad-help">{t('ad.files.noCv')}</p>}
      </Card>
      <Card title={t('ad.files.downloads')} intro={t('ad.files.downloadsIntro')}>
        <ul className="ad-todo">
          {draft.products.filter((p) => p.kind === 'free').map((p, i) => (
            <li key={i}>{p.t} — {p.file ? t('ad.f.pdf.privateOk') : t('ad.f.pdf.none')} · <Link to="/admin/products">{t('ad.pr.edit')} →</Link></li>
          ))}
        </ul>
      </Card>
    </>
  );
}

// ═════════════ SEO ═════════════
/** Finds images without a description and pages without search texts. */
function seoChecks(draft) {
  const out = [];
  const add = (sev, text, to) => out.push({ sev, text, to });
  if (!draft.site.url) add('warn', ['ad.seo.c.noUrl'], '/admin/seo');
  if (!draft.site.seoDescription) add('warn', ['ad.seo.c.noHomeDesc'], '/admin/seo');
  if (draft.site.portrait && !draft.site.portraitAlt) add('info', ['ad.seo.c.portraitAlt'], '/admin/site');
  draft.projects.forEach((p, i) => {
    if (!p.published || p.archived) return;
    if (!p.seoDescription && (p.summary || '').length < 50) add('info', ['ad.seo.c.projDesc', { title: p.title }], `/admin/projects/${i}`);
    if (p.cover && !p.coverAlt) add('info', ['ad.seo.c.coverAlt', { title: p.title }], `/admin/projects/${i}`);
  });
  draft.mind.forEach((m) => m.image && !m.imageAlt && add('info', ['ad.seo.c.mindAlt', { word: m.word }], '/admin/sections/mind'));
  draft.expertise.forEach((e) => e.image && !e.imageAlt && add('info', ['ad.seo.c.expAlt', { title: e.title }], '/admin/sections/expertise'));
  draft.products.forEach((p) => p.image && !p.imageAlt && add('info', ['ad.seo.c.prodAlt', { title: p.t }], '/admin/products'));
  for (const l of ['fr', 'ar']) {
    const n = missingTranslations(draft, l).length;
    if (n) add('warn', [l === 'fr' ? 'ad.ov.todo.trFr' : 'ad.ov.todo.trAr', { n }], '/admin/translations');
  }
  if (!draft.seo.ogImage && !draft.site.portrait) add('info', ['ad.seo.c.ogImage'], '/admin/seo');
  return out;
}

export function SeoPage() {
  const t = useAdminT();
  const { draft } = useEditor();
  const toast = useToast();
  const [links, setLinks] = useState(null);
  const [busy, setBusy] = useState(false);
  const checks = useMemo(() => seoChecks(draft), [draft]);
  const run = async () => {
    setBusy(true);
    try {
      setLinks(await api('/api/admin/seo/check-links', { method: 'POST' }));
    } catch (e) {
      toast(t('ad.in.failed', { msg: e.message }), 'error');
    } finally {
      setBusy(false);
    }
  };
  const broken = links ? links.results.filter((r) => !r.ok) : [];
  return (
    <>
      <PageHead title={t('ad.mod.seo')} intro={t('ad.mod.seoIntro')}>
        <a className="ad-btn ad-btn--ghost" href="/sitemap.xml" target="_blank" rel="noreferrer">sitemap.xml ↗</a>
        <a className="ad-btn ad-btn--ghost" href="/robots.txt" target="_blank" rel="noreferrer">robots.txt ↗</a>
      </PageHead>
      <Card title={t('ad.seo.checks')} intro={t('ad.seo.checksIntro')}>
        {checks.length === 0 ? (
          <p className="ad-empty">{t('ad.seo.allGood')}</p>
        ) : (
          <ul className="ad-todo">
            {checks.map((c, i) => (
              <li key={i} className={c.sev === 'warn' ? 'is-warn' : ''}><Link to={c.to}>{t(c.text[0], c.text[1])} →</Link></li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={t('ad.seo.home')}>
        <ObjectFields def={F.site} path={['site']} only={['url', 'seoTitle', 'seoDescription']} />
      </Card>
      <Card title={t('ad.seo.settings')}>
        <ObjectFields def={F.seo} path={['seo']} />
      </Card>
      <Card title={t('ad.seo.links')} intro={t('ad.seo.linksIntro')}>
        <button type="button" className="ad-btn ad-btn--primary" onClick={run} disabled={busy} aria-busy={busy}>{busy ? t('ad.seo.checking') : t('ad.seo.check')}</button>
        {links && (
          <>
            <p className="ad-help" role="status">{t('ad.seo.result', { n: links.checked, bad: broken.length })}{links.total > links.checked ? ` ${t('ad.seo.limit', { n: links.checked })}` : ''}</p>
            {broken.length > 0 && (
              <ul className="ad-todo">
                {broken.map((r) => (
                  <li key={r.url} className="is-warn"><span dir="ltr">{r.url}</span> — {r.status ? `HTTP ${r.status}` : t(r.error === 'timeout' ? 'ad.seo.timeout' : 'ad.seo.unreachable')} <small className="ad-help">({r.where.slice(0, 3).join(', ')})</small></li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>
      <Card title={t('ad.seo.external')}>
        <p className="ad-help">{t('ad.seo.externalText')}</p>
      </Card>
    </>
  );
}

// ═════════════ Interface texts (buttons, labels, messages) ═════════════
export function UiTextsPage() {
  const t = useAdminT();
  const { draft, update } = useEditor();
  const { editLang } = useEditLang();
  const [q, setQ] = useState('');
  const [onlyChanged, setOnlyChanged] = useState(false);
  const ui = draft.ui || {};
  const keys = useMemo(() => Object.keys(siteEn), []);
  const needle = q.trim().toLowerCase();
  const own = ui[editLang] || {};
  const shown = keys.filter((k) => {
    if (onlyChanged && !own[k]) return false;
    if (!needle) return true;
    return [k, siteEn[k], SITE[editLang][k], own[k]].some((x) => String(x || '').toLowerCase().includes(needle));
  });
  const set = (k, v) => {
    const next = { ...(ui[editLang] || {}) };
    if (v) next[k] = v;
    else delete next[k];
    update(['ui'], { ...ui, [editLang]: next });
  };
  const changed = Object.keys(own).length;
  return (
    <>
      <PageHead title={t('ad.mod.ui')} intro={t('ad.mod.uiIntro')} />
      <Card>
        <div className="ad-filterbar">
          <input className="ad-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ad.ui.search')} aria-label={t('ad.ui.search')} />
          <label className="ad-check">
            <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} /> {t('ad.ui.onlyChanged', { n: changed })}
          </label>
        </div>
        <p className="ad-help">{t('ad.ui.help', { lang: (LANGS.find((l) => l.code === editLang) || LANGS[0]).label })}</p>
        <ul className="ad-uitexts">
          {shown.slice(0, 120).map((k) => (
            <li key={k} className={own[k] ? 'is-changed' : ''}>
              <label className="ad-label" htmlFor={`ui-${k}`}><code dir="ltr">{k}</code></label>
              <input
                id={`ui-${k}`}
                className="ad-input"
                {...inputLangProps(editLang)}
                value={own[k] || ''}
                placeholder={SITE[editLang][k] || siteEn[k]}
                maxLength={400}
                onChange={(e) => set(k, e.target.value)}
              />
              {own[k] && <button type="button" className="ad-link" onClick={() => set(k, '')}>{t('ad.ui.reset')}</button>}
            </li>
          ))}
        </ul>
        {shown.length > 120 && <p className="ad-help">{t('ad.ui.more', { n: shown.length - 120 })}</p>}
      </Card>
    </>
  );
}

// ═════════════ Integrations ═════════════
const PHASE2 = ['searchConsole', 'analytics', 'googleAds', 'metaAds', 'ai', 'payments'];

export function IntegrationsPage({ status }) {
  const t = useAdminT();
  const ints = (status && status.integrations) || {};
  const rows = [['booking', ints.booking], ...PHASE2.map((k) => [k, ints[k]])];
  return (
    <>
      <PageHead title={t('ad.mod.integrations')} intro={t('ad.mod.integrationsIntro')} />
      <Card>
        <ul className="ad-ints">
          {rows.map(([k, s]) => (
            <li key={k} className="ad-int">
              <div>
                <b>{t(`ad.int.${k}`)}</b>
                <p className="ad-help">{t(`ad.int.${k}Text`)}</p>
              </div>
              <span className={`ad-badge ${s && s.connected ? 'ad-badge--ok' : 'ad-badge--muted'}`}>{s && s.connected ? t('ad.int.connected') : t('ad.int.notConnected')}</span>
              {k !== 'booking' && <span className="ad-badge ad-badge--xs ad-badge--muted">{t('ad.int.phase2')}</span>}
            </li>
          ))}
        </ul>
        <p className="ad-help">{t('ad.int.secrets')}</p>
      </Card>
    </>
  );
}
