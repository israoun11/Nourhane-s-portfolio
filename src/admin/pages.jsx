import { useEffect, useState } from 'react';
import { Link, useRouter } from '../router.jsx';
import { newProject, schema, slugify } from '../../shared/schema.js';
import { api } from './api.js';
import { Field, ImageField, ListField, ObjectFields } from './fields.jsx';
import { useEditor, useToast } from './state.jsx';
import { Card, PageHead, useConfirm } from './ui.jsx';
import { useAdminT, useFmtDate, useL } from './i18n.jsx';
import { useMissingCounts } from './Translations.jsx';

const F = schema.fields;

// ═════════════ Overview ═════════════
export function Overview({ status, email, unread }) {
  const { saved, draft, dirty } = useEditor();
  const t = useAdminT();
  const fmt = useFmtDate();
  const pub = draft.projects.filter((p) => p.published).length;
  const emptyStory = draft.timeline.filter((y) => !(y.photos || []).some((p) => p.src)).length;
  const noGallery = draft.projects.filter((p) => !(p.gallery || []).some((g) => g.src)).length;
  const tr = useMissingCounts();
  const missing = [
    tr.fr > 0 && { t: t('ad.ov.todo.trFr', { n: tr.fr }), to: '/admin/translations' },
    tr.ar > 0 && { t: t('ad.ov.todo.trAr', { n: tr.ar }), to: '/admin/translations' },
    !draft.site.portrait && { t: t('ad.ov.todo.portrait'), to: '/admin/site' },
    !draft.site.email && { t: t('ad.ov.todo.email'), to: '/admin/contact' },
    draft.projects.some((p) => !p.cover) && { t: t('ad.ov.todo.covers', { n: draft.projects.filter((p) => !p.cover).length }), to: '/admin/projects' },
    emptyStory > 0 && { t: t('ad.ov.todo.story', { n: emptyStory }), to: '/admin/story' },
    draft.products.some((p) => p.kind === 'free' && p.published && !p.file) && { t: t('ad.ov.todo.freePdf'), to: '/admin/products' },
    !draft.site.cvFile && !draft.site.cv && { t: t('ad.ov.todo.cv'), to: '/admin/files' },
    draft.booking.provider === 'builtin' && !draft.booking.open && { t: t('ad.ov.todo.bookingOpen'), to: '/admin/booking' },
    draft.booking.provider !== 'builtin' && !draft.booking.url && { t: t('ad.ov.todo.booking'), to: '/admin/booking' },
    !draft.site.url && { t: t('ad.ov.todo.siteUrl'), to: '/admin/seo' },
    noGallery > 0 && { t: t('ad.ov.todo.galleries', { n: noGallery }), to: '/admin/projects' },
    !Object.values(draft.site.socials).some(Boolean) && { t: t('ad.ov.todo.socials'), to: '/admin/contact' },
  ].filter(Boolean);
  const quick = [
    ['/admin/inbox', 'inbox'],
    ['/admin/projects', 'projects'],
    ['/admin/texts', 'texts'],
    ['/admin/story', 'story'],
    ['/admin/leads', 'leads'],
    ['/admin/site', 'site'],
    ['/admin/history', 'history'],
  ];
  return (
    <>
      <PageHead title={t('ad.ov.title')} intro={t('ad.ov.intro', { email })}>
        <a className="ad-btn ad-btn--ghost" href="/" target="_blank" rel="noreferrer">{t('ad.nav.view')}</a>
      </PageHead>
      {status && !status.persistent && (
        <div className="ad-alert ad-alert--warn" role="alert">
          <strong>{t('ad.ov.devStorage')}</strong> {t('ad.ov.devStorageText')}
        </div>
      )}
      <div className="ad-stats">
        <div className="ad-stat"><span>{t('ad.ov.lastSaved')}</span><b>{fmt(saved.updatedAt)}</b><small>{t('ad.ov.version', { v: saved.version })}{dirty ? t('ad.ov.unsaved') : ''}</small></div>
        <div className="ad-stat"><span>{t('ad.ov.projects')}</span><b>{t('ad.ov.visible', { n: pub })}</b><small>{t('ad.ov.hidden', { n: draft.projects.length - pub })}</small></div>
        <div className="ad-stat"><span>{t('ad.ov.images')}</span><b>{status ? status.media : '—'}</b><small>{t('ad.ov.uploaded')}</small></div>
        <Link className="ad-stat ad-stat--link" to="/admin/inbox"><span>{t('ad.ov.messages')}</span><b>{unread === null ? '—' : t('ad.ov.unread', { n: unread })}</b><small>{t('ad.ov.openInbox')}</small></Link>
      </div>
      <div className="ad-cols">
        <Card title={t('ad.ov.quick')}>
          <div className="ad-quick">
            {quick.map(([to, k]) => (
              <Link key={k} className="ad-quick__item" to={to}>{t(`ad.ov.q.${k}`)}<small>{t(`ad.ov.q.${k}Sub`)}</small></Link>
            ))}
          </div>
        </Card>
        <Card title={t('ad.ov.todo')}>
          {missing.length ? (
            <ul className="ad-todo">
              {missing.map((m) => <li key={m.t}><Link to={m.to}>{m.t} →</Link></li>)}
            </ul>
          ) : (
            <p className="ad-empty">{t('ad.ov.done')}</p>
          )}
        </Card>
      </div>
    </>
  );
}

// ═════════════ Website info ═════════════
export function SiteInfo() {
  const t = useAdminT();
  return (
    <>
      <PageHead title={t('ad.site.title')} intro={t('ad.site.intro')} />
      <Card title={t('ad.site.identity')}>
        <ObjectFields def={F.site} path={['site']} only={['name', 'role', 'portrait', 'portraitAlt', 'portraitPos']} />
      </Card>
      <Card title={t('ad.site.contact')}>
        <ObjectFields def={F.site} path={['site']} only={['codastudioUrl']} />
      </Card>
      <Card title={t('ad.site.photos')}>
        <ObjectFields def={F.site} path={['site']} only={['codastudio', 'training']} />
      </Card>
      <Card title={t('ad.site.seo')} intro={t('ad.site.seoIntro')}>
        <ObjectFields def={F.site} path={['site']} only={['seoTitle', 'seoDescription']} />
      </Card>
      <p className="ad-help">{t('ad.site.moved')} <Link to="/admin/contact">{t('ad.mod.contact')}</Link> · <Link to="/admin/files">{t('ad.mod.files')}</Link> · <Link to="/admin/seo">{t('ad.mod.seo')}</Link></p>
    </>
  );
}

// ═════════════ Page texts ═════════════
export function Texts() {
  const t = useAdminT();
  const L = useL();
  const groups = Object.entries(F.text.fields);
  const [open, setOpen] = useState('hero');
  return (
    <>
      <PageHead title={t('ad.texts.title')} intro={t('ad.texts.intro')} />
      {groups.map(([k, def]) => (
        <Card key={k} title={L(def.label)} collapsible open={open === k} onToggle={() => setOpen(open === k ? '' : k)}>
          {def.type === 'object' ? <ObjectFields def={def} path={['text', k]} /> : <Field def={def} path={['text', k]} />}
        </Card>
      ))}
    </>
  );
}

// ═════════════ Section lists ═════════════
// Sections without a page of their own (story, products, contact cards… have their own module).
export const SECTION_PAGES = ['logos', 'mind', 'method', 'expertise', 'codaServices', 'learning', 'series', 'testimonials'];
const OTHER_SECTIONS = ['timeline', 'products', 'contactPaths'];

export function SectionPage({ k }) {
  const t = useAdminT();
  const def = F[k];
  if (!(SECTION_PAGES.includes(k) || OTHER_SECTIONS.includes(k)) || !def) return <p className="ad-empty">{t('ad.sec.unknown')}</p>;
  return (
    <>
      <PageHead title={t(`ad.sec.${k}`)} intro={t(`ad.sec.${k}Intro`)} />
      <Card>{def.type === 'list' ? <ListField def={def} path={[k]} flat /> : <Field def={def} path={[k]} />}</Card>
    </>
  );
}

// ═════════════ Projects ═════════════
export function Projects() {
  const { draft, update } = useEditor();
  const { navigate } = useRouter();
  const confirm = useConfirm();
  const t = useAdminT();
  const list = draft.projects;
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    update(['projects'], next);
  };
  const add = () => {
    const p = newProject(list);
    update(['projects'], [...list, p]);
    navigate(`/admin/projects/${list.length}`);
  };
  const remove = async (i) => {
    const p = list[i];
    if (await confirm({ title: t('ad.pr.deleteTitle', { title: p.title }), body: t('ad.pr.deleteBody'), ok: t('ad.pr.deleteOk'), danger: true })) {
      update(['projects'], list.filter((_, k) => k !== i));
    }
  };
  return (
    <>
      <PageHead title={t('ad.pr.title')} intro={t('ad.pr.intro')}>
        <button type="button" className="ad-btn ad-btn--primary" onClick={add}>{t('ad.pr.add')}</button>
      </PageHead>
      {list.length === 0 && <p className="ad-empty">{t('ad.pr.empty')}</p>}
      <ol className="ad-projects">
        {list.map((p, i) => (
          <li key={`${p.slug}-${i}`} className={`ad-proj${p.published ? '' : ' is-hidden'}`}>
            <div className="ad-proj__thumb" style={{ background: p.bg }}>
              {p.cover ? <img src={p.cover} alt="" /> : <span style={{ color: p.fg }}>{p.mono || p.title.slice(0, 2)}</span>}
            </div>
            <div className="ad-proj__main">
              <span className="ad-proj__n">{String(i + 1).padStart(2, '0')}{i === 0 ? t('ad.pr.featured') : ''} · {t('ad.pr.images', { n: (p.gallery || []).filter((g) => g.src).length })}</span>
              <Link to={`/admin/projects/${i}`} className="ad-proj__t">{p.title || t('ad.pr.untitled')}</Link>
              <span className="ad-proj__meta" dir="ltr">/work/{p.slug}</span>
              {p.archived && <span className="ad-badge ad-badge--muted ad-badge--xs">{t('ad.pr.archived')}</span>}
            </div>
            <div className="ad-proj__tools">
              <button type="button" className={`ad-badge ${p.published ? 'ad-badge--ok' : 'ad-badge--muted'} ad-badge--btn`} onClick={() => update(['projects', i, 'published'], !p.published)} aria-label={p.published ? t('ad.pr.hide', { title: p.title }) : t('ad.pr.show', { title: p.title })}>
                {p.published ? t('ad.pr.visible') : t('ad.pr.hidden')}
              </button>
              <button type="button" className="ad-icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t('ad.pr.up', { title: p.title })}>↑</button>
              <button type="button" className="ad-icon" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label={t('ad.pr.down', { title: p.title })}>↓</button>
              <Link className="ad-btn ad-btn--ghost" to={`/admin/projects/${i}`}>{t('ad.pr.edit')}</Link>
              <button type="button" className="ad-icon ad-icon--danger" onClick={() => remove(i)} aria-label={t('ad.pr.delete', { title: p.title })}>✕</button>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

export function ProjectEdit({ index }) {
  const { draft, readSaved, update, preview } = useEditor();
  const t = useAdminT();
  const p = draft.projects[index];
  const pf = F.projects.of.fields;
  if (!p) {
    return (
      <>
        <PageHead title={t('ad.pe.notFound')} />
        <p className="ad-empty">{t('ad.pe.notFoundBody')} <Link to="/admin/projects">{t('ad.pe.back')}</Link></p>
      </>
    );
  }
  const savedSlug = readSaved(['projects', index, 'slug']);
  const only = (keys) => <ObjectFields def={F.projects.of} path={['projects', index]} only={keys} />;
  return (
    <>
      <PageHead title={p.title || t('ad.pr.untitled')} intro={<>{t('ad.pe.address')} <code dir="ltr">/work/{p.slug}</code></>}>
        <Link className="ad-btn ad-btn--ghost" to="/admin/projects">{t('ad.pe.all')}</Link>
        <button type="button" className="ad-btn ad-btn--ghost" onClick={() => preview(`/work/${p.slug}`, p.slug)}>{t('ad.pe.preview')}</button>
      </PageHead>
      <Card title={t('ad.pe.basics')}>
        <Field def={pf.published} path={['projects', index, 'published']} />
        <Field def={pf.archived} path={['projects', index, 'archived']} />
        {only(['title'])}
        <div className="ad-field">
          {only(['slug'])}
          <button type="button" className="ad-link" onClick={() => update(['projects', index, 'slug'], slugify(p.title))}>{t('ad.pe.useTitle')}</button>
          {savedSlug && savedSlug !== p.slug && <p className="ad-help">{t('ad.pe.slugWarn', { slug: savedSlug })}</p>}
        </div>
        {only(['short', 'summary', 'tags', 'cats'])}
      </Card>
      <Card title={t('ad.pe.images')} intro={t('ad.pe.imagesIntro')}>
        <ImageField def={pf.cover} path={['projects', index, 'cover']} />
        {only(['coverAlt', 'logo'])}
        <Field def={pf.gallery} path={['projects', index, 'gallery']} />
      </Card>
      <Card title={t('ad.pe.details')} intro={t('ad.pe.detailsIntro')}>
        {only(['client', 'industry', 'year', 'role', 'deliverables', 'challenge', 'context', 'problem', 'solution', 'learning'])}
      </Card>
      <Card title={t('ad.pe.case')} intro={t('ad.pe.caseIntro')}>
        {only(['objective', 'strategy', 'execution', 'toolsUsed'])}
      </Card>
      <Card title={t('ad.pe.linksCard')}>
        {only(['url', 'sourceUrl', 'links', 'related'])}
      </Card>
      <Card title={t('ad.pe.seo')}>
        {only(['seoTitle', 'seoDescription'])}
      </Card>
      <Card title={t('ad.pe.approach')} intro={t('ad.pe.approachIntro')}>
        <div className="ad-approach">
          {(p.approach || []).map((_, i) => (
            <fieldset key={i} className="ad-group ad-approach__card">
              <legend>{t(`ad.pe.step${i + 1}`)}</legend>
              <ObjectFields def={pf.approach.of} path={['projects', index, 'approach', i]} />
            </fieldset>
          ))}
        </div>
      </Card>
      <Card title={t('ad.pe.results')} intro={t('ad.pe.resultsIntro')}>
        {only(['results', 'feedback'])}
      </Card>
      <Card title={t('ad.pe.design')}>
        {only(['mono', 'bg', 'fg'])}
      </Card>
    </>
  );
}

// ═════════════ History ═════════════
export function History() {
  const { saved, dirty, replaceSaved } = useEditor();
  const confirm = useConfirm();
  const toast = useToast();
  const t = useAdminT();
  const fmt = useFmtDate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(0);
  const load = () => api('/api/admin/history').then((r) => setItems(r.items), (e) => setError(e.message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved.version]);

  const restore = async (it) => {
    const ok = await confirm({
      title: t('ad.hi.confirmTitle', { date: fmt(it.updatedAt) }),
      body: `${dirty ? t('ad.hi.confirmUnsaved') : ''}${t('ad.hi.confirmBody')}`,
      ok: t('ad.hi.restore'),
    });
    if (!ok) return;
    setBusy(it.version);
    try {
      const next = await api('/api/admin/restore', { method: 'POST', json: { version: it.version, currentVersion: saved.version } });
      replaceSaved(next);
      toast(t('ad.hi.done'));
    } catch (e) {
      toast(t('ad.hi.failed', { msg: e.message }), 'error');
    } finally {
      setBusy(0);
    }
  };

  return (
    <>
      <PageHead title={t('ad.hi.title')} intro={t('ad.hi.intro')} />
      <Card>
        <div className="ad-hist ad-hist--current"><b>{t('ad.hi.current', { v: saved.version })}</b><span>{t('ad.hi.saved', { date: fmt(saved.updatedAt) })}</span></div>
        {error && <p className="ad-error" role="alert">{error}</p>}
        {!items && !error && <p className="ad-empty" role="status">{t('ad.hi.loading')}</p>}
        {items && items.length === 0 && <p className="ad-empty">{t('ad.hi.empty')}</p>}
        {items && items.length > 0 && (
          <ul className="ad-histlist">
            {items.map((it) => (
              <li key={it.version} className="ad-hist">
                <div>
                  <b>{t('ad.hi.version', { v: it.version })}</b>
                  <span>{t('ad.hi.meta', { date: fmt(it.updatedAt), n: it.projects, line: it.heroLine })}</span>
                </div>
                <button type="button" className="ad-btn ad-btn--ghost" onClick={() => restore(it)} disabled={!!busy}>
                  {busy === it.version ? t('ad.hi.restoring') : t('ad.hi.restore')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
