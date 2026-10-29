// Form fields generated from shared/schema.js. Each field reads and writes the draft at `path`.
// Texts follow the content language chosen at the top of the dashboard (English or
// French); images, colours and links are shared by all languages.
import { useEffect, useId, useRef, useState } from 'react';
import { PALETTE, isTranslatable } from '../../shared/schema.js';
import { pathKey, uploadImage, uploadPdf } from './api.js';
import { useEditor, useToast } from './state.jsx';
import { useConfirm } from './ui.jsx';
import { editPath, inputLangProps, useAdminT, useEditLang, useErrorText, useL } from './i18n.jsx';
import { useI18n } from '../i18n/index.jsx';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];
const maxMb = () => window.__ntMaxUploadMb || 5;

function useFieldError(path) {
  const { errors } = useEditor();
  const text = useErrorText();
  const key = pathKey(path);
  const e = errors.find((x) => x.path === key);
  return e ? text(e, false) : '';
}

function Frame({ id, def, error, children, counter, shared = false, english }) {
  const t = useAdminT();
  const L = useL();
  return (
    <div className={`ad-field${error ? ' has-error' : ''}`}>
      <div className="ad-field__head">
        <label htmlFor={id} className="ad-label">
          {L(def.label)}
          {def.required && <span className="ad-req" aria-hidden="true"> *</span>}
          {def.required && <span className="sr-only"> {t('ad.f.required')}</span>}
        </label>
        {shared && <span className="ad-badge ad-badge--muted ad-badge--xs">{t('ad.shared')}</span>}
        {counter}
      </div>
      {def.help && <p className="ad-help" id={`${id}-help`}>{L(def.help)}</p>}
      {english !== undefined && (
        <p className="ad-english" lang="en" dir="ltr">{english ? t('ad.english', { text: english }) : t('ad.englishEmpty')}</p>
      )}
      {children}
      {error && <p className="ad-error" id={`${id}-err`} role="alert">{error}</p>}
    </div>
  );
}

const shorten = (v, n = 160) => {
  const s = Array.isArray(v) ? v.join(', ') : String(v ?? '');
  return s.length > n ? `${s.slice(0, n)}…` : s;
};

function TextField({ def, path }) {
  const { read, update } = useEditor();
  const { editLang } = useEditLang();
  const id = useId();
  const ep = editPath(def, path, editLang);
  const error = useFieldError(ep.path);
  const value = read(ep.path) ?? '';
  const english = ep.translation ? read(ep.englishPath) ?? '' : undefined;
  const max = def.max || 200;
  const len = String(value).length;
  const textual = ['text', 'textarea'].includes(def.type);
  const shared = editLang !== 'en' && !ep.translation;
  const props = {
    id,
    value,
    maxLength: max,
    'aria-invalid': !!error,
    'aria-describedby': [def.help && `${id}-help`, error && `${id}-err`].filter(Boolean).join(' ') || undefined,
    onChange: (e) => update(ep.path, e.target.value),
    ...(textual ? inputLangProps(editLang) : { dir: 'ltr' }),
    placeholder: ep.translation ? shorten(english, 80) : undefined,
  };
  const counter = def.type !== 'number' && len > max * 0.8 ? <span className={`ad-count${len >= max ? ' is-max' : ''}`}>{len}/{max}</span> : null;
  const fdef = ep.translation ? { ...def, required: false } : def;
  return (
    <Frame id={id} def={fdef} error={error} counter={counter} shared={shared} english={english !== undefined ? shorten(english) : undefined}>
      {def.type === 'textarea' ? (
        <textarea className="ad-input" rows={Math.min(8, Math.max(3, Math.ceil(Math.max(len, String(english || '').length) / 90)))} {...props} />
      ) : def.type === 'number' ? (
        <input className="ad-input ad-input--sm" type="number" min={def.min} max={def.max} {...props} onChange={(e) => update(ep.path, e.target.value === '' ? '' : Number(e.target.value))} />
      ) : (
        <input className="ad-input" type={def.type === 'email' ? 'email' : def.type === 'phone' ? 'tel' : def.type === 'url' && def.kind !== 'file' ? 'url' : 'text'} inputMode={def.type === 'url' ? 'url' : def.type === 'phone' ? 'tel' : undefined} {...props} />
      )}
    </Frame>
  );
}

function SharedNote() {
  const { editLang } = useEditLang();
  const t = useAdminT();
  return editLang !== 'en' ? <span className="ad-badge ad-badge--muted ad-badge--xs">{t('ad.shared')}</span> : null;
}

function BoolField({ def, path }) {
  const { read, update } = useEditor();
  const t = useAdminT();
  const L = useL();
  const id = useId();
  const cur = read(path);
  const on = cur === undefined ? def.default === true : cur === true;
  const vis = ['published', 'visible'].includes(path[path.length - 1]);
  return (
    <div className="ad-field ad-field--inline">
      <button id={id} type="button" role="switch" aria-checked={on} className={`ad-switch${on ? ' is-on' : ''}`} onClick={() => update(path, !on)}>
        <span />
      </button>
      <label htmlFor={id} className="ad-label">{L(def.label)}</label>
      <span className={`ad-badge ${on ? 'ad-badge--ok' : 'ad-badge--muted'}`}>{vis ? (on ? t('ad.f.visible') : t('ad.f.hidden')) : on ? t('ad.f.on') : t('ad.f.off')}</span>
      <SharedNote />
    </div>
  );
}

function ColorField({ def, path }) {
  const { read, update } = useEditor();
  const L = useL();
  const value = read(path);
  const id = useId();
  return (
    <div className="ad-field">
      <div className="ad-field__head">
        <span className="ad-label" id={id}>{L(def.label)}</span>
        <SharedNote />
      </div>
      <div className="ad-swatches" role="radiogroup" aria-labelledby={id}>
        {PALETTE.map((c) => (
          <button key={c.value} type="button" role="radio" aria-checked={value === c.value} title={L(c.label)} aria-label={L(c.label)}
            className={`ad-swatch${value === c.value ? ' is-on' : ''}`} style={{ background: c.value }} onClick={() => update(path, c.value)} />
        ))}
      </div>
    </div>
  );
}

function SelectField({ def, path }) {
  const { read, update } = useEditor();
  const { editLang } = useEditLang();
  const L = useL();
  const id = useId();
  return (
    <Frame id={id} def={def} shared={editLang !== 'en'}>
      <select id={id} className="ad-input" value={read(path) ?? def.default ?? def.options[0].value} onChange={(e) => update(path, e.target.value)}>
        {def.options.map((o) => <option key={o.value} value={o.value}>{L(o.label)}</option>)}
      </select>
    </Frame>
  );
}

function MultiField({ def, path }) {
  const { read, update, draft } = useEditor();
  const L = useL();
  const value = read(path) || [];
  const options = def.source === 'projects' ? draft.projects.map((p) => ({ value: p.slug, label: p.title })) : def.options;
  const id = useId();
  const toggle = (v) => update(path, value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="ad-field">
      <div className="ad-field__head">
        <span className="ad-label" id={id}>{L(def.label)}</span>
        <SharedNote />
      </div>
      <div className="ad-checks" role="group" aria-labelledby={id}>
        {options.map((o) => (
          <label key={o.value} className={`ad-check${value.includes(o.value) ? ' is-on' : ''}`}>
            <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} />
            {def.source === 'projects' ? o.label : L(o.label)}
          </label>
        ))}
      </div>
    </div>
  );
}

function TagsField({ def, path }) {
  const { read, update } = useEditor();
  const { editLang } = useEditLang();
  const t = useAdminT();
  const L = useL();
  const ep = editPath(def, path, editLang);
  const value = read(ep.path) || [];
  const english = ep.translation ? read(ep.englishPath) || [] : undefined;
  const [input, setInput] = useState('');
  const id = useId();
  const error = useFieldError(ep.path);
  const add = () => {
    const v = input.trim().slice(0, def.itemMax);
    if (!v || value.length >= def.max) return;
    update(ep.path, [...value, v]);
    setInput('');
  };
  return (
    <Frame id={id} def={{ ...def, help: def.help || t('ad.f.tagsHelp', { max: def.max }) }} error={error} english={english !== undefined ? shorten(english) : undefined}>
      <div className="ad-tags" {...inputLangProps(editLang)}>
        {value.map((tag, i) => (
          <span key={`${tag}-${i}`} className="ad-tag">
            {tag}
            <button type="button" aria-label={t('ad.f.tagRemove', { tag })} onClick={() => update(ep.path, value.filter((_, k) => k !== i))}>×</button>
          </span>
        ))}
        {value.length < def.max && (
          <input id={id} className="ad-tags__input" value={input} maxLength={def.itemMax} placeholder={t('ad.f.tagsAdd')} aria-label={L(def.label)}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',' || e.key === '،') {
                e.preventDefault();
                add();
              } else if (e.key === 'Backspace' && !input && value.length) update(ep.path, value.slice(0, -1));
            }}
            onBlur={add}
          />
        )}
      </div>
    </Frame>
  );
}

// ── images ──
function useImageUpload() {
  const toast = useToast();
  const t = useAdminT();
  const check = (file) => {
    if (!ACCEPT.includes(file.type)) {
      toast(t('ad.f.img.type'), 'error');
      return false;
    }
    if (file.size > maxMb() * 1024 * 1024) {
      toast(t('ad.f.img.size', { size: (file.size / 1024 / 1024).toFixed(1), max: maxMb() }), 'error');
      return false;
    }
    return true;
  };
  const errorText = (e) =>
    e.status === 415 ? t('ad.f.img.typeServer') : e.status === 413 ? t('ad.f.img.tooBig', { max: maxMb() }) : e.status === 429 ? t('ad.f.img.rate') : e.status === 0 ? t('ad.err.network') : e.message;
  return { check, errorText, toast, t };
}

export function ImageField({ def, path }) {
  const { read, readSaved, update } = useEditor();
  const { editLang } = useEditLang();
  const { check, errorText, toast, t } = useImageUpload();
  const L = useL();
  const value = read(path) || '';
  const savedValue = readSaved(path) || '';
  const id = useId();
  const error = useFieldError(path);
  const input = useRef(null);
  const [busy, setBusy] = useState(null); // { progress, local }
  const [linkMode, setLinkMode] = useState(false);
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [value]);

  const pick = async (file) => {
    if (!file || !check(file)) return;
    const local = URL.createObjectURL(file);
    setBusy({ progress: 0, local });
    try {
      const res = await uploadImage(file, (p) => setBusy((b) => (b ? { ...b, progress: p } : b)));
      update(path, res.url);
      toast(res.reused ? t('ad.f.img.reused') : t('ad.f.img.uploaded'));
    } catch (e) {
      toast(t('ad.f.img.failed', { msg: errorText(e) }), 'error');
    } finally {
      setBusy(null);
      URL.revokeObjectURL(local);
      if (input.current) input.current.value = '';
    }
  };

  const shown = busy ? busy.local : value;
  const changed = value !== savedValue;
  return (
    <Frame id={id} def={def} error={error} shared={editLang !== 'en'}>
      <div className={`ad-image${shown ? '' : ' is-empty'}`}>
        <div className="ad-image__preview">
          {shown && !broken ? (
            <img src={shown} alt={t('ad.f.img.preview', { label: L(def.label) })} onError={() => setBroken(true)} />
          ) : (
            <span>{broken ? t('ad.f.img.broken') : t('ad.f.img.none')}</span>
          )}
          {busy && (
            <div className="ad-progress" role="progressbar" aria-valuenow={busy.progress} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${busy.progress}%` }} />
              <b>{busy.progress < 100 ? t('ad.f.img.uploading', { p: busy.progress }) : t('ad.f.img.processing')}</b>
            </div>
          )}
        </div>
        <div className="ad-image__side">
          {changed && !busy && <span className="ad-badge ad-badge--warn">{t('ad.f.img.changed')}</span>}
          <input ref={input} id={id} type="file" accept={ACCEPT.join(',')} className="sr-only" onChange={(e) => pick(e.target.files[0])} disabled={!!busy} />
          <div className="ad-row">
            <label htmlFor={id} className={`ad-btn ad-btn--primary${busy ? ' is-disabled' : ''}`}>{value ? t('ad.f.img.replace') : t('ad.f.img.upload')}</label>
            {value && !busy && <RemoveImage onRemove={() => update(path, '')} />}
            {changed && !busy && <button type="button" className="ad-btn ad-btn--ghost" onClick={() => update(path, savedValue)}>{t('ad.f.img.undo')}</button>}
          </div>
          <p className="ad-help">{t('ad.f.img.help', { max: maxMb() })}</p>
          <button type="button" className="ad-link" onClick={() => setLinkMode((v) => !v)} aria-expanded={linkMode}>
            {linkMode ? t('ad.f.img.hideLink') : t('ad.f.img.useLink')}
          </button>
          {linkMode && (
            <input className="ad-input" type="url" dir="ltr" placeholder="https://…" value={value} aria-label={t('ad.f.img.linkLabel', { label: L(def.label) })} onChange={(e) => update(path, e.target.value.trim())} />
          )}
        </div>
      </div>
    </Frame>
  );
}

/** A PDF file: upload (checked to be a real PDF by the server), preview, replace, remove. */
export function FileField({ def, path }) {
  const { read, readSaved, update } = useEditor();
  const { editLang } = useEditLang();
  const toast = useToast();
  const confirm = useConfirm();
  const t = useAdminT();
  const value = read(path) || '';
  const savedValue = readSaved(path) || '';
  const id = useId();
  const error = useFieldError(path);
  const input = useRef(null);
  const [busy, setBusy] = useState(null);
  const maxPdf = window.__ntMaxPdfMb || 20;
  const priv = def.access === 'private';

  const pick = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      toast(t('ad.f.pdf.type'), 'error');
      return;
    }
    if (file.size > maxPdf * 1024 * 1024) {
      toast(t('ad.f.pdf.size', { size: (file.size / 1024 / 1024).toFixed(1), max: maxPdf }), 'error');
      return;
    }
    setBusy(0);
    try {
      const blob = file.type === 'application/pdf' ? file : new File([file], file.name, { type: 'application/pdf' });
      const res = await uploadPdf(blob, def.access, (p) => setBusy(p));
      update(path, res.url);
      toast(t('ad.f.pdf.uploaded', { name: file.name }));
    } catch (e) {
      toast(t('ad.f.pdf.failed', { msg: e.status === 415 ? t('ad.f.pdf.notPdf') : e.status === 413 ? t('ad.f.pdf.tooBig', { max: maxPdf }) : e.status === 0 ? t('ad.err.network') : e.message }), 'error');
    } finally {
      setBusy(null);
      if (input.current) input.current.value = '';
    }
  };
  const previewUrl = value.startsWith('private:') ? `/api/admin/file?name=${encodeURIComponent(value)}` : value;
  const changed = value !== savedValue;
  return (
    <Frame id={id} def={def} error={error} shared={editLang !== 'en'}>
      <div className={`ad-file${value ? '' : ' is-empty'}`}>
        <div className="ad-file__icon" aria-hidden="true">PDF</div>
        <div className="ad-file__main">
          {busy !== null ? (
            <div className="ad-progress ad-progress--inline" role="progressbar" aria-valuenow={busy} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${busy}%` }} />
              <b>{busy < 100 ? t('ad.f.img.uploading', { p: busy }) : t('ad.f.pdf.checking')}</b>
            </div>
          ) : value ? (
            <>
              <b>{t(priv ? 'ad.f.pdf.privateOk' : 'ad.f.pdf.publicOk')}</b>
              <a className="ad-link" href={previewUrl} target="_blank" rel="noreferrer">{t('ad.f.pdf.preview')} ↗</a>
            </>
          ) : (
            <span className="ad-help">{t('ad.f.pdf.none')}</span>
          )}
          {changed && busy === null && <span className="ad-badge ad-badge--warn">{t('ad.f.img.changed')}</span>}
        </div>
        <div className="ad-row">
          <input ref={input} id={id} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => pick(e.target.files[0])} disabled={busy !== null} />
          <label htmlFor={id} className={`ad-btn ad-btn--primary${busy !== null ? ' is-disabled' : ''}`}>{value ? t('ad.f.pdf.replace') : t('ad.f.pdf.upload')}</label>
          {value && busy === null && (
            <button type="button" className="ad-btn ad-btn--ghost" onClick={async () => (await confirm({ title: t('ad.f.pdf.removeTitle'), body: t('ad.f.pdf.removeBody'), ok: t('ad.f.img.remove') })) && update(path, '')}>
              {t('ad.f.img.remove')}
            </button>
          )}
          {changed && busy === null && <button type="button" className="ad-btn ad-btn--ghost" onClick={() => update(path, savedValue)}>{t('ad.f.img.undo')}</button>}
        </div>
      </div>
      <p className="ad-help">{t(priv ? 'ad.f.pdf.privateHelp' : 'ad.f.pdf.publicHelp', { max: maxPdf })}</p>
    </Frame>
  );
}

function RemoveImage({ onRemove }) {
  const confirm = useConfirm();
  const t = useAdminT();
  return (
    <button type="button" className="ad-btn ad-btn--ghost" onClick={async () => (await confirm({ title: t('ad.f.img.removeTitle'), body: t('ad.f.img.removeBody'), ok: t('ad.f.img.remove') })) && onRemove()}>
      {t('ad.f.img.remove')}
    </button>
  );
}

/** Renders any schema field at `path`. */
export function Field({ def, path }) {
  if (def.hidden) return null;
  switch (def.type) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'url':
    case 'number':
    case 'slug':
    case 'phone':
      return <TextField def={def} path={path} />;
    case 'file':
      return <FileField def={def} path={path} />;
    case 'image':
      return <ImageField def={def} path={path} />;
    case 'boolean':
      return <BoolField def={def} path={path} />;
    case 'color':
      return <ColorField def={def} path={path} />;
    case 'select':
      return <SelectField def={def} path={path} />;
    case 'multiselect':
      return <MultiField def={def} path={path} />;
    case 'tags':
      return <TagsField def={def} path={path} />;
    case 'object':
      return <ObjectFields def={def} path={path} nested />;
    case 'list':
      return def.gallery ? <GalleryField def={def} path={path} /> : <ListField def={def} path={path} />;
    default:
      return null;
  }
}

export function ObjectFields({ def, path, nested = false, only }) {
  const L = useL();
  const entries = Object.entries(def.fields).filter(([k, f]) => !f.hidden && (!only || only.includes(k)));
  const body = entries.map(([k, f]) => <Field key={k} def={f} path={[...path, k]} />);
  if (!nested) return <>{body}</>;
  return (
    <fieldset className="ad-group">
      <legend>{L(def.label)}</legend>
      {def.help && <p className="ad-help">{L(def.help)}</p>}
      {body}
    </fieldset>
  );
}

// ── lists ──
export const blankLike = (def, sample) => {
  // New items copy the design settings of an existing item and start with empty texts/images.
  const make = (f, s) => {
    switch (f.type) {
      case 'object': {
        const o = {};
        for (const [k, sub] of Object.entries(f.fields)) o[k] = make(sub, s ? s[k] : undefined);
        return o;
      }
      case 'list':
        return f.fixed ? Array.from({ length: f.min }, (_, i) => make(f.of, s ? s[i] : undefined)) : [];
      case 'color':
      case 'css':
      case 'art':
        return s !== undefined ? structuredClone(s) : f.type === 'color' ? PALETTE[0].value : f.type === 'art' ? [] : '';
      case 'select':
        return s !== undefined ? s : f.options[0].value;
      case 'boolean':
        return f.default === true;
      case 'number':
        return f.default ?? 0;
      case 'tags':
      case 'multiselect':
        return [];
      default:
        return '';
    }
  };
  return make(def, sample);
};

function useItemTitle(def) {
  const { editLang } = useEditLang();
  const t = useAdminT();
  const L = useL();
  return (item, i) => {
    const k = def.itemTitle;
    if (typeof item === 'string') return item ? item.slice(0, 60) : t('ad.f.list.item', { label: L(def.of.label), n: i + 1 });
    let v = k && item && item[k];
    if (k && editLang !== 'en' && item && item.i18n && item.i18n[editLang] && item.i18n[editLang][k]) v = item.i18n[editLang][k];
    // a choice (e.g. a weekday) shows its name; a time range shows its hours
    const fd = k && def.of.fields && def.of.fields[k];
    if (fd && fd.options) {
      const o = fd.options.find((x) => x.value === v);
      if (o) v = L(o.label);
      if (item && item.start && item.end) v = `${v} · ${item.start}–${item.end}`;
    }
    if (Array.isArray(v)) v = v.join(', ');
    return v ? String(v).slice(0, 60) : t('ad.f.list.item', { label: L(def.of.label), n: i + 1 });
  };
}

export function ListField({ def, path, flat = false }) {
  const { read, update } = useEditor();
  const confirm = useConfirm();
  const t = useAdminT();
  const L = useL();
  const itemTitle = useItemTitle(def);
  const items = read(path) || [];
  const [open, setOpen] = useState(() => (items.length <= 1 ? 0 : -1));
  const error = useFieldError(path);
  const canAdd = !def.fixed && items.length < def.max;
  const canRemove = !def.fixed && items.length > (def.min || 0);

  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    update(path, next);
    setOpen((o) => (o === i ? j : o === j ? i : o));
  };
  const remove = async (i) => {
    if (await confirm({ title: t('ad.f.list.deleteTitle', { title: itemTitle(items[i], i) }), body: t('ad.f.list.deleteBody'), ok: t('ad.f.list.delete'), danger: true })) {
      update(path, items.filter((_, k) => k !== i));
      setOpen(-1);
    }
  };
  const add = () => {
    const item = blankLike(def.of, items[items.length - 1]);
    update(path, [...items, item]);
    setOpen(items.length);
  };

  // A list of single fields (e.g. 2 photos): show them directly.
  if (def.of.type !== 'object') {
    return (
      <fieldset className="ad-group">
        <legend>{L(def.label)}</legend>
        {def.help && <p className="ad-help">{L(def.help)}</p>}
        <div className={def.of.type === 'image' ? 'ad-grid-2' : ''}>
          {items.map((_, i) => <Field key={i} def={{ ...def.of, label: `${L(def.of.label)} ${i + 1}` }} path={[...path, i]} />)}
        </div>
      </fieldset>
    );
  }

  const body = (
    <>
      {error && <p className="ad-error" role="alert">{error}</p>}
      {items.length === 0 && <p className="ad-empty">{t('ad.f.list.empty')}{canAdd ? t('ad.f.list.emptyAdd') : ''}</p>}
      <ol className="ad-items">
        {items.map((item, i) => (
          <li key={i} className={`ad-item${open === i ? ' is-open' : ''}`}>
            <div className="ad-item__bar">
              <button type="button" className="ad-item__toggle" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                <span className="ad-item__n">{String(i + 1).padStart(2, '0')}</span>
                <span className="ad-item__t">{itemTitle(item, i)}</span>
                <span className="ad-item__chev" aria-hidden="true">▾</span>
              </button>
              <div className="ad-item__tools">
                {!def.fixed && <button type="button" className="ad-icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t('ad.f.list.up')}>↑</button>}
                {!def.fixed && <button type="button" className="ad-icon" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={t('ad.f.list.down')}>↓</button>}
                {canRemove && <button type="button" className="ad-icon ad-icon--danger" onClick={() => remove(i)} aria-label={t('ad.f.list.delete')}>✕</button>}
              </div>
            </div>
            {open === i && (
              <div className="ad-item__body">
                <ObjectFields def={def.of} path={[...path, i]} />
              </div>
            )}
          </li>
        ))}
      </ol>
      {canAdd && <button type="button" className="ad-btn ad-btn--ghost ad-add" onClick={add}>{t('ad.f.list.add', { item: L(def.of.label).toLowerCase() })}</button>}
    </>
  );
  if (flat) return body;
  return (
    <fieldset className="ad-group">
      <legend>{L(def.label)}</legend>
      {def.help && <p className="ad-help">{L(def.help)}</p>}
      {body}
    </fieldset>
  );
}

// ── photo grid (project galleries, "My story" photos) ──
// Upload many images at once, replace one, remove an image but keep its place,
// delete a place, reorder with ← →, and write a caption (translatable) for each.
export function GalleryField({ def, path }) {
  const { read, update, updateWith } = useEditor();
  const confirm = useConfirm();
  const { check, errorText, toast, t } = useImageUpload();
  const { dir } = useI18n();
  const L = useL();
  const { editLang } = useEditLang();
  const id = useId();
  const error = useFieldError(path);
  const items = read(path) || [];
  const fields = def.of.fields;
  const srcKey = Object.keys(fields).find((k) => fields[k].type === 'image');
  const textKeys = Object.keys(fields).filter((k) => isTranslatable(fields[k]));
  const [busy, setBusy] = useState({}); // index → progress
  const [bulk, setBulk] = useState(null); // { i, n }
  const addInput = useRef(null);
  const withImage = items.filter((it) => it && it[srcKey]).length;
  const room = def.max - items.length;
  const rtl = dir === 'rtl';

  const blank = () => blankLike(def.of);
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    update(path, next);
  };

  const uploadInto = async (i, file) => {
    if (!file || !check(file)) return;
    setBusy((b) => ({ ...b, [i]: 0 }));
    try {
      const res = await uploadImage(file, (p) => setBusy((b) => ({ ...b, [i]: p })));
      update([...path, i, srcKey], res.url);
      toast(res.reused ? t('ad.f.img.reused') : t('ad.f.img.uploaded'));
    } catch (e) {
      toast(t('ad.f.img.failed', { msg: errorText(e) }), 'error');
    } finally {
      setBusy((b) => {
        const n = { ...b };
        delete n[i];
        return n;
      });
    }
  };

  const addMany = async (fileList) => {
    const files = [...(fileList || [])].filter(check).slice(0, Math.max(0, room + items.filter((it) => !it[srcKey]).length));
    if (!files.length) return;
    const urls = [];
    for (let k = 0; k < files.length; k++) {
      setBulk({ i: k + 1, n: files.length });
      try {
        const res = await uploadImage(files[k]);
        urls.push(res.url);
      } catch (e) {
        toast(t('ad.f.img.failed', { msg: errorText(e) }), 'error');
      }
    }
    setBulk(null);
    if (addInput.current) addInput.current.value = '';
    if (!urls.length) return;
    // Fill empty places first, then add new ones at the end (merged into the latest draft).
    updateWith(path, (cur) => {
      const next = [...(cur || [])];
      for (const url of urls) {
        const empty = next.findIndex((it) => it && !it[srcKey]);
        if (empty >= 0) next[empty] = { ...next[empty], [srcKey]: url };
        else if (next.length < def.max) next.push({ ...blank(), [srcKey]: url });
      }
      return next;
    });
    toast(t('ad.g.uploadedN', { n: urls.length }));
  };

  const deleteSlot = async (i) => {
    if (await confirm({ title: t('ad.g.deleteSlotTitle'), body: t('ad.g.deleteSlotBody'), ok: t('ad.f.list.delete'), danger: true })) {
      update(path, items.filter((_, k) => k !== i));
    }
  };

  return (
    <fieldset className="ad-group ad-gallery">
      <legend>{L(def.label)}</legend>
      {def.help && <p className="ad-help">{L(def.help)}</p>}
      <p className="ad-gallery__count">
        {t('ad.g.count', { n: withImage, e: items.length - withImage })}
        {def.slots && withImage < def.slots ? ` · ${t('ad.g.minHint', { min: def.slots })}` : ''}
        {editLang !== 'en' && <> · <span className="ad-badge ad-badge--muted ad-badge--xs">{t('ad.shared')}</span></>}
      </p>
      {error && <p className="ad-error" role="alert">{error}</p>}
      <ol className="ad-gallery__grid">
        {items.map((it, i) => {
          const src = it && it[srcKey];
          const inputId = `${id}-f${i}`;
          const progress = busy[i];
          return (
            <li key={i} className={`ad-gcard${src ? '' : ' is-empty'}`}>
              <div className="ad-gcard__img">
                {src ? <img src={src} alt="" /> : <span>{t('ad.g.empty')}</span>}
                <span className="ad-gcard__n">{t('ad.g.n', { n: i + 1 })}</span>
                {progress !== undefined && (
                  <div className="ad-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                    <span style={{ width: `${progress}%` }} />
                    <b>{progress < 100 ? t('ad.f.img.uploading', { p: progress }) : t('ad.f.img.processing')}</b>
                  </div>
                )}
              </div>
              <div className="ad-gcard__tools">
                <input id={inputId} type="file" accept={ACCEPT.join(',')} className="sr-only" onChange={(e) => uploadInto(i, e.target.files[0])} />
                <label htmlFor={inputId} className="ad-btn ad-btn--primary ad-btn--sm">{src ? t('ad.g.replace') : t('ad.g.upload')}</label>
                <button type="button" className="ad-icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t('ad.g.earlier')} title={t('ad.g.earlier')}>{rtl ? '→' : '←'}</button>
                <button type="button" className="ad-icon" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={t('ad.g.later')} title={t('ad.g.later')}>{rtl ? '←' : '→'}</button>
                {src && <button type="button" className="ad-icon" onClick={() => update([...path, i, srcKey], '')} aria-label={t('ad.g.removeImage')} title={t('ad.g.removeImage')}>⌫</button>}
                <button type="button" className="ad-icon ad-icon--danger" onClick={() => deleteSlot(i)} aria-label={t('ad.g.deleteSlot')} title={t('ad.g.deleteSlot')}>✕</button>
              </div>
              <div className="ad-gcard__fields">
                {textKeys.map((k) => <Field key={k} def={fields[k]} path={[...path, i, k]} />)}
              </div>
            </li>
          );
        })}
      </ol>
      <div
        className={`ad-gallery__add${bulk ? ' is-busy' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addMany(e.dataTransfer.files);
        }}
      >
        <input ref={addInput} id={`${id}-add`} type="file" accept={ACCEPT.join(',')} multiple className="sr-only" onChange={(e) => addMany(e.target.files)} disabled={!!bulk} />
        <label htmlFor={`${id}-add`} className={`ad-btn ad-btn--primary${bulk || withImage >= def.max ? ' is-disabled' : ''}`}>{t('ad.g.addPhotos')}</label>
        {room > 0 && <button type="button" className="ad-btn ad-btn--ghost" onClick={() => update(path, [...items, blank()])}>{t('ad.g.addSlot')}</button>}
        <span className="ad-help" role="status">{bulk ? t('ad.g.uploadingN', bulk) : `${t('ad.f.img.help', { max: maxMb() })} ${room <= 0 ? t('ad.g.max', { max: def.max }) : ''}`}</span>
      </div>
    </fieldset>
  );
}
