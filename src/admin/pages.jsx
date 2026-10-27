import { useEffect, useState } from 'react';
import { Link, useRouter } from '../router.jsx';
import { newProject, schema, slugify } from '../../shared/schema.js';
import { api } from './api.js';
import { Field, ImageField, ListField, ObjectFields } from './fields.jsx';
import { useEditor, useToast } from './state.jsx';
import { Card, PageHead, fmtDate, useConfirm } from './ui.jsx';

const F = schema.fields;

// ═════════════ Overview ═════════════
export function Overview({ status, email }) {
  const { saved, draft, dirty } = useEditor();
  const pub = draft.projects.filter((p) => p.published).length;
  const missing = [
    !draft.site.portrait && { t: 'Add your portrait photo', to: '/admin/site' },
    !draft.site.email && { t: 'Add your contact email', to: '/admin/site' },
    draft.projects.some((p) => !p.cover) && { t: `Add cover images to ${draft.projects.filter((p) => !p.cover).length} project(s)`, to: '/admin/projects' },
    !Object.values(draft.site.socials).some(Boolean) && { t: 'Add your social profile links', to: '/admin/site' },
  ].filter(Boolean);
  return (
    <>
      <PageHead title="Welcome back" intro={`Signed in as ${email}. Everything you change here appears on your website once you press “Save changes”.`}>
        <a className="ad-btn ad-btn--ghost" href="/" target="_blank" rel="noreferrer">View website ↗</a>
      </PageHead>
      {status && !status.persistent && (
        <div className="ad-alert ad-alert--warn" role="alert">
          <strong>Development storage.</strong> Content and images are saved on this computer only. Before going live, connect Supabase (see README → Production setup) so your changes survive redeploys.
        </div>
      )}
      <div className="ad-stats">
        <div className="ad-stat"><span>Last saved</span><b>{fmtDate(saved.updatedAt)}</b><small>Version {saved.version}{dirty ? ' · unsaved changes' : ''}</small></div>
        <div className="ad-stat"><span>Projects</span><b>{pub} visible</b><small>{draft.projects.length - pub} hidden</small></div>
        <div className="ad-stat"><span>Images</span><b>{status ? status.media : '—'}</b><small>uploaded</small></div>
        <div className="ad-stat"><span>Contact form</span><b>{status ? (status.formConnected ? 'Connected' : 'Not connected') : '—'}</b><small>{status && !status.formConnected ? 'see README' : 'messages delivered'}</small></div>
      </div>
      <div className="ad-cols">
        <Card title="Quick actions">
          <div className="ad-quick">
            <Link className="ad-quick__item" to="/admin/projects">Manage projects<small>add, edit, hide or reorder</small></Link>
            <Link className="ad-quick__item" to="/admin/texts">Edit page texts<small>headlines and introductions</small></Link>
            <Link className="ad-quick__item" to="/admin/site">Website info &amp; photos<small>portrait, email, links</small></Link>
            <Link className="ad-quick__item" to="/admin/history">Restore an older version<small>last 10 saves are kept</small></Link>
          </div>
        </Card>
        <Card title="Still to complete">
          {missing.length ? (
            <ul className="ad-todo">
              {missing.map((m) => <li key={m.t}><Link to={m.to}>{m.t} →</Link></li>)}
            </ul>
          ) : (
            <p className="ad-empty">Everything essential is filled in.</p>
          )}
        </Card>
      </div>
    </>
  );
}

// ═════════════ Website info ═════════════
export function SiteInfo() {
  return (
    <>
      <PageHead title="Website information" intro="Your name, photos, contact details and links." />
      <Card title="Identity">
        <ObjectFields def={F.site} path={['site']} only={['name', 'role', 'portrait']} />
      </Card>
      <Card title="Contact & links">
        <ObjectFields def={F.site} path={['site']} only={['email', 'cv', 'codastudioUrl', 'socials']} />
      </Card>
      <Card title="CodaStudio & training photos">
        <ObjectFields def={F.site} path={['site']} only={['codastudio', 'training']} />
      </Card>
      <Card title="Search engines" intro="How the website appears in Google and when shared.">
        <ObjectFields def={F.site} path={['site']} only={['seoTitle', 'seoDescription']} />
      </Card>
    </>
  );
}

// ═════════════ Page texts ═════════════
export function Texts() {
  const groups = Object.entries(F.text.fields);
  const [open, setOpen] = useState('hero');
  return (
    <>
      <PageHead title="Page texts" intro="Headlines, introductions and button labels, section by section — in the order they appear on the page." />
      {groups.map(([k, def]) => (
        <Card key={k} title={def.label} collapsible open={open === k} onToggle={() => setOpen(open === k ? '' : k)}>
          {def.type === 'object' ? <ObjectFields def={def} path={['text', k]} /> : <Field def={def} path={['text', k]} />}
        </Card>
      ))}
    </>
  );
}

// ═════════════ Section lists ═════════════
export const SECTION_PAGES = [
  { key: 'mind', label: 'Ways of thinking', intro: 'The four big words in “One creative mind”. Hover text and image for each.' },
  { key: 'timeline', label: 'Journey', intro: 'Milestones of “My story”, in order. Add an image to replace the illustration of a year.' },
  { key: 'method', label: 'Method', intro: 'The four steps of “Behind the strategy”.' },
  { key: 'expertise', label: 'Expertise', intro: 'Numbered rows with links to the projects that prove them.' },
  { key: 'codaServices', label: 'CodaStudio', intro: 'Capabilities shown as chips in the CodaStudio section.' },
  { key: 'learning', label: 'Training', intro: 'Training offers with their status.' },
  { key: 'series', label: 'Content series', intro: 'Video series in the personality section. Add a link when episodes are online.' },
  { key: 'products', label: 'Digital products', intro: 'Upcoming products — always shown as “Coming soon”.' },
  { key: 'testimonials', label: 'Testimonials', intro: 'Only authentic, approved feedback. Empty quotes show a clear placeholder.' },
  { key: 'contactPaths', label: 'Contact paths', intro: 'The three ways to get in touch.' },
];

export function SectionPage({ k }) {
  const meta = SECTION_PAGES.find((s) => s.key === k);
  const def = F[k];
  if (!meta || !def) return <p className="ad-empty">Unknown section.</p>;
  return (
    <>
      <PageHead title={meta.label} intro={meta.intro} />
      <Card>{def.type === 'list' ? <ListField def={def} path={[k]} flat /> : <Field def={def} path={[k]} />}</Card>
    </>
  );
}

// ═════════════ Projects ═════════════
export function Projects() {
  const { draft, update } = useEditor();
  const { navigate } = useRouter();
  const confirm = useConfirm();
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
    if (await confirm({ title: `Delete “${p.title}”?`, body: 'The project and its page will be removed from the website when you save. Its images stay restorable through History for a while.', ok: 'Delete project', danger: true })) {
      update(['projects'], list.filter((_, k) => k !== i));
    }
  };
  return (
    <>
      <PageHead title="Projects" intro="The order here is the order on the website. The first project is featured on the home page.">
        <button type="button" className="ad-btn ad-btn--primary" onClick={add}>+ Add project</button>
      </PageHead>
      {list.length === 0 && <p className="ad-empty">No projects yet. Use “Add project” to create the first one.</p>}
      <ol className="ad-projects">
        {list.map((p, i) => (
          <li key={`${p.slug}-${i}`} className={`ad-proj${p.published ? '' : ' is-hidden'}`}>
            <div className="ad-proj__thumb" style={{ background: p.bg }}>
              {p.cover ? <img src={p.cover} alt="" /> : <span style={{ color: p.fg }}>{p.mono || p.title.slice(0, 2)}</span>}
            </div>
            <div className="ad-proj__main">
              <span className="ad-proj__n">{String(i + 1).padStart(2, '0')}{i === 0 ? ' · Featured' : ''}</span>
              <Link to={`/admin/projects/${i}`} className="ad-proj__t">{p.title || 'Untitled project'}</Link>
              <span className="ad-proj__meta">/work/{p.slug}</span>
            </div>
            <div className="ad-proj__tools">
              <button type="button" className={`ad-badge ${p.published ? 'ad-badge--ok' : 'ad-badge--muted'} ad-badge--btn`} onClick={() => update(['projects', i, 'published'], !p.published)} aria-label={`${p.published ? 'Hide' : 'Show'} ${p.title}`}>
                {p.published ? 'Visible' : 'Hidden'}
              </button>
              <button type="button" className="ad-icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${p.title} up`}>↑</button>
              <button type="button" className="ad-icon" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label={`Move ${p.title} down`}>↓</button>
              <Link className="ad-btn ad-btn--ghost" to={`/admin/projects/${i}`}>Edit</Link>
              <button type="button" className="ad-icon ad-icon--danger" onClick={() => remove(i)} aria-label={`Delete ${p.title}`}>✕</button>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

export function ProjectEdit({ index }) {
  const { draft, readSaved, update, preview } = useEditor();
  const p = draft.projects[index];
  const pf = F.projects.of.fields;
  if (!p) {
    return (
      <>
        <PageHead title="Project not found" />
        <p className="ad-empty">This project does not exist (it may have been deleted). <Link to="/admin/projects">Back to projects</Link></p>
      </>
    );
  }
  const savedSlug = readSaved(['projects', index, 'slug']);
  const only = (keys) => <ObjectFields def={F.projects.of} path={['projects', index]} only={keys} />;
  return (
    <>
      <PageHead title={p.title || 'Untitled project'} intro={<>Page address: <code>/work/{p.slug}</code></>}>
        <Link className="ad-btn ad-btn--ghost" to="/admin/projects">← All projects</Link>
        <button type="button" className="ad-btn ad-btn--ghost" onClick={() => preview(`/work/${p.slug}`, p.slug)}>Preview page ↗</button>
      </PageHead>
      <Card title="Basics">
        <Field def={pf.published} path={['projects', index, 'published']} />
        {only(['title'])}
        <div className="ad-field">
          {only(['slug'])}
          <button type="button" className="ad-link" onClick={() => update(['projects', index, 'slug'], slugify(p.title))}>Use the title as address</button>
          {savedSlug && savedSlug !== p.slug && <p className="ad-help">Changing the address breaks links you may already have shared to /work/{savedSlug}.</p>}
        </div>
        {only(['short', 'summary', 'tags', 'cats'])}
      </Card>
      <Card title="Images">
        <ImageField def={pf.cover} path={['projects', index, 'cover']} />
        <ListField def={pf.gallery} path={['projects', index, 'gallery']} />
      </Card>
      <Card title="Case study details" intro="Empty fields show a clear placeholder on the website.">
        {only(['industry', 'year', 'role', 'deliverables', 'challenge', 'context', 'problem', 'solution', 'approach', 'learning'])}
      </Card>
      <Card title="Results & feedback" intro="Only verified figures and approved feedback.">
        {only(['results', 'feedback'])}
      </Card>
      <Card title="Card design (when no cover image)">
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
      title: `Restore the version from ${fmtDate(it.updatedAt)}?`,
      body: `${dirty ? 'Your unsaved changes will be lost. ' : ''}The current version stays in this list, so you can switch back.`,
      ok: 'Restore',
    });
    if (!ok) return;
    setBusy(it.version);
    try {
      const next = await api('/api/admin/restore', { method: 'POST', json: { version: it.version, currentVersion: saved.version } });
      replaceSaved(next);
      toast('Restored — this version is now live.');
    } catch (e) {
      toast(`Could not restore — ${e.message}`, 'error');
    } finally {
      setBusy(0);
    }
  };

  return (
    <>
      <PageHead title="History" intro="The last 10 saved versions. Restoring makes an older version live again." />
      <Card>
        <div className="ad-hist ad-hist--current"><b>Current version {saved.version}</b><span>saved {fmtDate(saved.updatedAt)}</span></div>
        {error && <p className="ad-error" role="alert">{error}</p>}
        {!items && !error && <p className="ad-empty" role="status">Loading…</p>}
        {items && items.length === 0 && <p className="ad-empty">No earlier versions yet — they appear here after your next save.</p>}
        {items && items.length > 0 && (
          <ul className="ad-histlist">
            {items.map((it) => (
              <li key={it.version} className="ad-hist">
                <div>
                  <b>Version {it.version}</b>
                  <span>{fmtDate(it.updatedAt)} · {it.projects} projects · “{it.heroLine}”</span>
                </div>
                <button type="button" className="ad-btn ad-btn--ghost" onClick={() => restore(it)} disabled={!!busy}>
                  {busy === it.version ? 'Restoring…' : 'Restore'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
