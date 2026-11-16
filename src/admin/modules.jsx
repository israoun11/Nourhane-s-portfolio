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

const F = schema.fields;
const SITE = { en: siteEn, fr: siteFr };

const ListCard = ({ k }) => (
  <Card>
    <ListField def={F[k]} path={[k]} flat />
  </Card>
);

// ═════════════ My story ═════════════
// Same slides as the website (src/sections/Journey.jsx → yearSlides): real photos only.
function slidesOf(m) {
  const photos = (m.photos || []).filter((p) => p.src);
  if (!m.cover) return photos;
  const cover = { cover: true, src: m.cover };
  return m.coverPosition === 'last' ? [...photos, cover] : [cover, ...photos];
}

export function StoryPage() {
  const t = useAdminT();
  const { draft } = useEditor();
  const [y, setY] = useState(0);
  const year = draft.timeline[Math.min(y, draft.timeline.length - 1)];
  return (
    <>
      <PageHead title={t('ad.mod.story')} intro={t('ad.mod.storyIntro')} />
      {year && (
        <Card title={t('ad.story.order')} intro={t('ad.story.orderIntro')}>
          <div className="ad-chips" role="group" aria-label={t('ad.story.year')}>
            {draft.timeline.map((m, i) => (
              <button key={i} type="button" className={`ad-chip${i === y ? ' is-on' : ''}`} aria-pressed={i === y} onClick={() => setY(i)}>{m.y}</button>
            ))}
          </div>
          {slidesOf(year).length ? (
            <ol className="ad-slides">
              {slidesOf(year).map((s, i) => (
                <li key={i} className={`ad-slide${s.cover ? ' is-cover' : ''}`}>
                  <img src={s.src} alt="" />
                  <b>{i + 1}{s.cover ? ` · ${t('ad.story.cover')}` : ''}</b>
                </li>
              ))}
            </ol>
          ) : (
            <p className="ad-help">{t('ad.story.noPhotos', { year: year.y })}</p>
          )}
        </Card>
      )}
      <Card title={t('ad.story.settings')}>
        <ObjectFields def={F.storySettings} path={['storySettings']} />
      </Card>
      <Card title={t('ad.story.texts')}>
        <ObjectFields def={F.text.fields.journey} path={['text', 'journey']} />
      </Card>
      <ListCard k="timeline" />
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
  draft.expertise.forEach((e) => e.image && !e.imageAlt && add('info', ['ad.seo.c.expAlt', { title: e.title }], '/admin/sections/expertise'));
  draft.products.forEach((p) => p.image && !p.imageAlt && add('info', ['ad.seo.c.prodAlt', { title: p.t }], '/admin/products'));
  const nFr = missingTranslations(draft, 'fr').length;
  if (nFr) add('warn', ['ad.ov.todo.trFr', { n: nFr }], '/admin/translations');
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
              {s && !s.connected && s.needs && <code className="ad-help" dir="ltr">{s.needs.join(', ')}</code>}
            </li>
          ))}
        </ul>
        <p className="ad-help">{t('ad.int.secrets')}</p>
      </Card>
    </>
  );
}

// ═════════════ Reports: Analytics & Search, Paid ads, AI assistant ═════════════
const nf = (v, d = 0) => (v === null || v === undefined || Number.isNaN(v) ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d }));
const pct = (v) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)} %`);

function useReport(kind, days) {
  const [data, setData] = useState(null);
  const load = useCallback(async () => {
    setData(null);
    try {
      setData(await api(`/api/admin/insights/${kind}?days=${days}`));
    } catch (e) {
      setData({ connected: true, error: e.message });
    }
  }, [kind, days]);
  useEffect(() => {
    load();
  }, [load]);
  return [data, load];
}

/** Honest state of a report: loading, not connected (with what is missing), error. */
function ReportState({ data, children }) {
  const t = useAdminT();
  if (!data) return <p className="ad-empty" role="status">{t('ad.in.loading')}</p>;
  if (!data.connected) {
    return (
      <div className="ad-alert ad-alert--warn" role="status">
        <b>{t('ad.int.notConnected')}.</b> {t('ad.rep.needs')} <code dir="ltr">{(data.needs || []).join(', ')}</code>
      </div>
    );
  }
  if (data.error) return <p className="ad-error" role="alert">{t('ad.rep.error', { msg: data.error })}</p>;
  return children;
}

function Days({ days, setDays }) {
  const t = useAdminT();
  return (
    <div className="ad-chips" role="group" aria-label={t('ad.rep.period')}>
      {[7, 28, 90].map((d) => (
        <button key={d} type="button" className={`ad-chip${days === d ? ' is-on' : ''}`} aria-pressed={days === d} onClick={() => setDays(d)}>{t('ad.rep.days', { n: d })}</button>
      ))}
    </div>
  );
}

function Bars({ rows, k }) {
  const max = Math.max(1, ...rows.map((r) => r[k] || 0));
  return (
    <div className="ad-bars" aria-hidden="true">
      {rows.map((r, i) => <span key={i} title={`${r.date}: ${r[k]}`} style={{ height: `${Math.max(2, ((r[k] || 0) / max) * 100)}%` }} />)}
    </div>
  );
}

function Stat({ label, value, sub }) {
  return <div className="ad-stat"><span>{label}</span><b>{value}</b>{sub && <small>{sub}</small>}</div>;
}

export function AnalyticsPage() {
  const t = useAdminT();
  const [days, setDays] = useState(28);
  const [ga, reloadGa] = useReport('analytics', days);
  const [sc, reloadSc] = useReport('search', days);
  return (
    <>
      <PageHead title={t('ad.mod.analytics')} intro={t('ad.rep.analyticsIntro')}>
        <button type="button" className="ad-btn ad-btn--ghost" onClick={() => { reloadGa(); reloadSc(); }}>{t('ad.in.refresh')}</button>
      </PageHead>
      <Days days={days} setDays={setDays} />
      <Card title="Google Analytics 4">
        <ReportState data={ga}>
          {ga && ga.totals && (
            <>
              <div className="ad-stats ad-stats--inline">
                <Stat label={t('ad.rep.sessions')} value={nf(ga.totals.sessions)} />
                <Stat label={t('ad.rep.users')} value={nf(ga.totals.users)} />
                <Stat label={t('ad.rep.conversions')} value={nf(ga.totals.conversions)} />
                <Stat label={t('ad.rep.organicPaid')} value={`${nf(ga.organicVsPaid.organic)} / ${nf(ga.organicVsPaid.paid)}`} sub={t('ad.rep.organicPaidSub')} />
              </div>
              <Bars rows={ga.daily} k="sessions" />
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead><tr><th>{t('ad.rep.channel')}</th><th>{t('ad.rep.sessions')}</th><th>{t('ad.rep.users')}</th><th>{t('ad.rep.conversions')}</th></tr></thead>
                  <tbody>{ga.channels.map((c) => <tr key={c.channel}><td>{c.channel}</td><td>{nf(c.sessions)}</td><td>{nf(c.users)}</td><td>{nf(c.conversions)}</td></tr>)}</tbody>
                </table>
              </div>
            </>
          )}
        </ReportState>
      </Card>
      <Card title="Google Search Console">
        <ReportState data={sc}>
          {sc && sc.totals && (
            <>
              <div className="ad-stats ad-stats--inline">
                <Stat label={t('ad.rep.clicks')} value={nf(sc.totals.clicks)} />
                <Stat label={t('ad.rep.impressions')} value={nf(sc.totals.impressions)} />
                <Stat label="CTR" value={pct(sc.totals.ctr)} />
                <Stat label={t('ad.rep.position')} value={nf(sc.totals.position, 1)} />
              </div>
              <Bars rows={sc.daily} k="clicks" />
              <div className="ad-cols">
                {[['queries', 'query'], ['pages', 'page']].map(([list, key]) => (
                  <div key={list} className="ad-table-wrap">
                    <table className="ad-table">
                      <thead><tr><th>{t(`ad.rep.${key}`)}</th><th>{t('ad.rep.clicks')}</th><th>{t('ad.rep.impressions')}</th><th>{t('ad.rep.position')}</th></tr></thead>
                      <tbody>{sc[list].map((r) => <tr key={r[key]}><td dir="auto">{r[key]}</td><td>{nf(r.clicks)}</td><td>{nf(r.impressions)}</td><td>{nf(r.position, 1)}</td></tr>)}</tbody>
                    </table>
                  </div>
                ))}
              </div>
            </>
          )}
        </ReportState>
      </Card>
      <Card title={t('ad.rep.cwv')}>
        <p className="ad-help">{t('ad.rep.cwvText')}</p>
        <a className="ad-btn ad-btn--ghost" href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(window.location.origin)}`} target="_blank" rel="noreferrer">PageSpeed Insights ↗</a>
      </Card>
    </>
  );
}

function CampaignTable({ data, currency, meta = false }) {
  const t = useAdminT();
  return (
    <>
      <div className="ad-stats ad-stats--inline">
        <Stat label={t('ad.rep.spend')} value={`${nf(data.totals.spend, 2)} ${currency}`} />
        <Stat label={t('ad.rep.impressions')} value={nf(data.totals.impressions)} />
        <Stat label={t('ad.rep.clicks')} value={nf(data.totals.clicks)} sub={`CTR ${pct(data.totals.ctr)} · CPC ${nf(data.totals.cpc, 2)}`} />
        <Stat label={t('ad.rep.conversions')} value={nf(data.totals.conversions, 1)} sub={`CPA ${nf(data.totals.cpa, 2)} · ROAS ${nf(data.totals.roas, 2)}`} />
        {meta && <Stat label={t('ad.rep.leads')} value={nf(data.totals.leads)} />}
      </div>
      {data.campaigns.length === 0 ? (
        <p className="ad-empty">{t('ad.rep.noCampaigns')}</p>
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>{t('ad.rep.campaign')}</th>{!meta && <th>{t('ad.rep.status')}</th>}<th>{t('ad.rep.spend')}</th><th>{t('ad.rep.impressions')}</th>{meta && <th>{t('ad.rep.reach')}</th>}
                <th>{t('ad.rep.clicks')}</th><th>CTR</th><th>CPC</th>{meta && <th>CPM</th>}<th>{t('ad.rep.conversions')}</th>{meta && <th>{t('ad.rep.leads')}</th>}<th>CPA</th><th>ROAS</th>
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((c) => (
                <tr key={c.id}>
                  <td dir="auto">{c.name}</td>{!meta && <td>{c.status}</td>}<td>{nf(c.spend, 2)}</td><td>{nf(c.impressions)}</td>{meta && <td>{nf(c.reach)}</td>}
                  <td>{nf(c.clicks)}</td><td>{pct(c.ctr)}</td><td>{nf(c.cpc, 2)}</td>{meta && <td>{nf(c.cpm, 2)}</td>}<td>{nf(c.conversions, 1)}</td>{meta && <td>{nf(c.leads)}</td>}<td>{nf(c.cpa, 2)}</td><td>{nf(c.roas, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function AdsPage() {
  const t = useAdminT();
  const { draft } = useEditor();
  const [days, setDays] = useState(28);
  const [g, reloadG] = useReport('google-ads', days);
  const [m, reloadM] = useReport('meta-ads', days);
  const ads = draft.ads || {};
  const cur = ads.currency || '';
  const alert = (rep, limit) => rep && rep.totals && limit > 0 && days === 28 && rep.totals.spend > limit;
  const both = g && m && g.totals && m.totals;
  return (
    <>
      <PageHead title={t('ad.mod.ads')} intro={t('ad.rep.adsIntro')}>
        <button type="button" className="ad-btn ad-btn--ghost" onClick={() => { reloadG(); reloadM(); }}>{t('ad.in.refresh')}</button>
      </PageHead>
      <Days days={days} setDays={setDays} />
      {alert(g, ads.googleMonthly) && <div className="ad-alert ad-alert--warn" role="alert">{t('ad.rep.over', { name: 'Google Ads', spend: nf(g.totals.spend, 2), limit: nf(ads.googleMonthly, 2), cur })}</div>}
      {alert(m, ads.metaMonthly) && <div className="ad-alert ad-alert--warn" role="alert">{t('ad.rep.over', { name: 'Meta Ads', spend: nf(m.totals.spend, 2), limit: nf(ads.metaMonthly, 2), cur })}</div>}
      {both && (
        <Card title={t('ad.rep.compare')}>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th /><th>{t('ad.rep.spend')}</th><th>{t('ad.rep.clicks')}</th><th>CTR</th><th>CPC</th><th>{t('ad.rep.conversions')}</th><th>CPA</th><th>ROAS</th></tr></thead>
              <tbody>
                {[['Google Ads', g.totals], ['Meta Ads', m.totals]].map(([n, x]) => (
                  <tr key={n}><td>{n}</td><td>{nf(x.spend, 2)} {cur}</td><td>{nf(x.clicks)}</td><td>{pct(x.ctr)}</td><td>{nf(x.cpc, 2)}</td><td>{nf(x.conversions, 1)}</td><td>{nf(x.cpa, 2)}</td><td>{nf(x.roas, 2)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Card title="Google Ads"><ReportState data={g}>{g && g.totals && <CampaignTable data={g} currency={cur} />}</ReportState></Card>
      <Card title="Meta Ads (Facebook & Instagram)"><ReportState data={m}>{m && m.totals && <CampaignTable data={m} currency={cur} meta />}</ReportState></Card>
      <Card title={t('ad.rep.budget')} intro={t('ad.rep.budgetIntro')}>
        <ObjectFields def={F.ads} path={['ads']} />
      </Card>
      <p className="ad-help">{t('ad.rep.readOnly')}</p>
    </>
  );
}

export function AiPage() {
  const t = useAdminT();
  const toast = useToast();
  const [task, setTask] = useState('meta');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [status, setStatus] = useState(null);
  useEffect(() => {
    api('/api/admin/status').then((s) => setStatus(s.integrations && s.integrations.ai), () => {});
  }, []);
  const run = async () => {
    setBusy(true);
    setRes(null);
    try {
      setRes(await api('/api/admin/ai', { method: 'POST', json: { task, input } }));
    } catch (e) {
      setRes({ error: e.message });
    } finally {
      setBusy(false);
    }
  };
  const useReportData = async () => {
    try {
      const [g, m, a] = await Promise.all(['google-ads', 'meta-ads', 'analytics'].map((k) => api(`/api/admin/insights/${k}?days=28`)));
      setInput(JSON.stringify({ googleAds: g.totals ? g : 'not connected', metaAds: m.totals ? m : 'not connected', analytics: a.totals ? a.totals : 'not connected' }, null, 1));
      setTask('report');
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  return (
    <>
      <PageHead title={t('ad.mod.ai')} intro={t('ad.ai.intro')} />
      {status && !status.connected && (
        <div className="ad-alert ad-alert--warn" role="status"><b>{t('ad.int.notConnected')}.</b> {t('ad.rep.needs')} <code dir="ltr">{status.needs.join(', ')}</code></div>
      )}
      <Card>
        <label className="ad-label" htmlFor="ai-task">{t('ad.ai.task')}</label>
        <select id="ai-task" className="ad-input" value={task} onChange={(e) => setTask(e.target.value)}>
          {['meta', 'keywords', 'ideas', 'conversion', 'report'].map((k) => <option key={k} value={k}>{t(`ad.ai.t.${k}`)}</option>)}
        </select>
        <label className="ad-label" htmlFor="ai-input">{t('ad.ai.input')}</label>
        <textarea id="ai-input" className="ad-input" rows={8} value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('ad.ai.placeholder')} />
        <div className="ad-row">
          <button type="button" className="ad-btn ad-btn--primary" onClick={run} disabled={busy || !input.trim()}>{busy ? t('ad.ai.working') : t('ad.ai.run')}</button>
          <button type="button" className="ad-btn ad-btn--ghost" onClick={useReportData}>{t('ad.ai.useData')}</button>
        </div>
        {res && res.error && <p className="ad-error" role="alert">{res.error}</p>}
        {res && res.connected === false && <p className="ad-help">{t('ad.rep.needs')} <code dir="ltr">{(res.needs || []).join(', ')}</code></p>}
        {res && res.draft && (
          <div className="ad-draft">
            <p className="ad-help">{t('ad.ai.review')}</p>
            <pre dir="auto">{res.draft}</pre>
            <button type="button" className="ad-btn ad-btn--ghost" onClick={() => navigator.clipboard && navigator.clipboard.writeText(res.draft).then(() => toast(t('ad.ai.copied')))}>{t('ad.ai.copy')}</button>
          </div>
        )}
      </Card>
    </>
  );
}
