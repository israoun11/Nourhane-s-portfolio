// Form fields generated from shared/schema.js. Each field reads and writes the draft at `path`.
import { useEffect, useId, useRef, useState } from 'react';
import { PALETTE } from '../../shared/schema.js';
import { pathKey, uploadImage } from './api.js';
import { useEditor, useToast } from './state.jsx';
import { useConfirm } from './ui.jsx';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

function useFieldError(path) {
  const { errors } = useEditor();
  const key = pathKey(path);
  const e = errors.find((x) => x.path === key);
  return e ? e.message.replace(/^[^:]*:\s*/, '') : '';
}

function Frame({ id, def, error, children, counter }) {
  return (
    <div className={`ad-field${error ? ' has-error' : ''}`}>
      <div className="ad-field__head">
        <label htmlFor={id} className="ad-label">
          {def.label}
          {def.required && <span className="ad-req" aria-hidden="true"> *</span>}
          {def.required && <span className="sr-only"> (required)</span>}
        </label>
        {counter}
      </div>
      {def.help && <p className="ad-help" id={`${id}-help`}>{def.help}</p>}
      {children}
      {error && <p className="ad-error" id={`${id}-err`} role="alert">{error}</p>}
    </div>
  );
}

function TextField({ def, path }) {
  const { read, update } = useEditor();
  const id = useId();
  const error = useFieldError(path);
  const value = read(path) ?? '';
  const max = def.max || 200;
  const len = String(value).length;
  const props = {
    id,
    value,
    maxLength: max,
    'aria-invalid': !!error,
    'aria-describedby': [def.help && `${id}-help`, error && `${id}-err`].filter(Boolean).join(' ') || undefined,
    onChange: (e) => update(path, def.type === 'number' ? e.target.value : e.target.value),
  };
  const counter = def.type !== 'number' && len > max * 0.8 ? <span className={`ad-count${len >= max ? ' is-max' : ''}`}>{len}/{max}</span> : null;
  return (
    <Frame id={id} def={def} error={error} counter={counter}>
      {def.type === 'textarea' ? (
        <textarea className="ad-input" rows={Math.min(8, Math.max(3, Math.ceil(len / 90)))} {...props} />
      ) : def.type === 'number' ? (
        <input className="ad-input ad-input--sm" type="number" min={def.min} max={def.max} {...props} onChange={(e) => update(path, e.target.value === '' ? '' : Number(e.target.value))} />
      ) : (
        <input className="ad-input" type={def.type === 'email' ? 'email' : def.type === 'url' && def.kind !== 'file' ? 'url' : 'text'} inputMode={def.type === 'url' ? 'url' : undefined} {...props} />
      )}
    </Frame>
  );
}

function BoolField({ def, path }) {
  const { read, update } = useEditor();
  const id = useId();
  const on = read(path) === true;
  return (
    <div className="ad-field ad-field--inline">
      <button id={id} type="button" role="switch" aria-checked={on} className={`ad-switch${on ? ' is-on' : ''}`} onClick={() => update(path, !on)}>
        <span />
      </button>
      <label htmlFor={id} className="ad-label">{def.label}</label>
      <span className={`ad-badge ${on ? 'ad-badge--ok' : 'ad-badge--muted'}`}>{on ? 'Visible' : 'Hidden'}</span>
    </div>
  );
}

function ColorField({ def, path }) {
  const { read, update } = useEditor();
  const value = read(path);
  const id = useId();
  return (
    <div className="ad-field">
      <span className="ad-label" id={id}>{def.label}</span>
      <div className="ad-swatches" role="radiogroup" aria-labelledby={id}>
        {PALETTE.map((c) => (
          <button key={c.value} type="button" role="radio" aria-checked={value === c.value} title={c.label} aria-label={c.label}
            className={`ad-swatch${value === c.value ? ' is-on' : ''}`} style={{ background: c.value }} onClick={() => update(path, c.value)} />
        ))}
      </div>
    </div>
  );
}

function SelectField({ def, path }) {
  const { read, update } = useEditor();
  const id = useId();
  return (
    <Frame id={id} def={def}>
      <select id={id} className="ad-input" value={read(path)} onChange={(e) => update(path, e.target.value)}>
        {def.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Frame>
  );
}

function MultiField({ def, path }) {
  const { read, update, draft } = useEditor();
  const value = read(path) || [];
  const options = def.source === 'projects' ? draft.projects.map((p) => ({ value: p.slug, label: p.title })) : def.options;
  const id = useId();
  const toggle = (v) => update(path, value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="ad-field">
      <span className="ad-label" id={id}>{def.label}</span>
      <div className="ad-checks" role="group" aria-labelledby={id}>
        {options.map((o) => (
          <label key={o.value} className={`ad-check${value.includes(o.value) ? ' is-on' : ''}`}>
            <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function TagsField({ def, path }) {
  const { read, update } = useEditor();
  const value = read(path) || [];
  const [input, setInput] = useState('');
  const id = useId();
  const error = useFieldError(path);
  const add = () => {
    const t = input.trim().slice(0, def.itemMax);
    if (!t || value.length >= def.max) return;
    update(path, [...value, t]);
    setInput('');
  };
  return (
    <Frame id={id} def={{ ...def, help: def.help || `Type a word and press Enter. Up to ${def.max}.` }} error={error}>
      <div className="ad-tags">
        {value.map((t, i) => (
          <span key={`${t}-${i}`} className="ad-tag">
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => update(path, value.filter((_, k) => k !== i))}>×</button>
          </span>
        ))}
        {value.length < def.max && (
          <input id={id} className="ad-tags__input" value={input} maxLength={def.itemMax} placeholder="Add…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                add();
              } else if (e.key === 'Backspace' && !input && value.length) update(path, value.slice(0, -1));
            }}
            onBlur={add}
          />
        )}
      </div>
    </Frame>
  );
}

export function ImageField({ def, path }) {
  const { read, readSaved, update } = useEditor();
  const toast = useToast();
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
    if (!file) return;
    if (!ACCEPT.includes(file.type)) return toast('Please choose a JPEG, PNG or WebP image.', 'error');
    const max = (window.__ntMaxUploadMb || 5) * 1024 * 1024;
    if (file.size > max) return toast(`This image is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${window.__ntMaxUploadMb || 5} MB. Try compressing it (e.g. squoosh.app).`, 'error');
    const local = URL.createObjectURL(file);
    setBusy({ progress: 0, local });
    try {
      const res = await uploadImage(file, (p) => setBusy((b) => (b ? { ...b, progress: p } : b)));
      update(path, res.url);
      toast(res.reused ? 'This image was already uploaded — reused it. Remember to save.' : 'Image uploaded. Press “Save changes” to publish it.');
    } catch (e) {
      toast(`Upload failed — ${e.message}`, 'error');
    } finally {
      setBusy(null);
      URL.revokeObjectURL(local);
      if (input.current) input.current.value = '';
    }
  };

  const shown = busy ? busy.local : value;
  const changed = value !== savedValue;
  return (
    <Frame id={id} def={def} error={error}>
      <div className={`ad-image${shown ? '' : ' is-empty'}`}>
        <div className="ad-image__preview">
          {shown && !broken ? (
            <img src={shown} alt={`Preview: ${def.label}`} onError={() => setBroken(true)} />
          ) : (
            <span>{broken ? 'Image could not be loaded' : 'No image yet'}</span>
          )}
          {busy && (
            <div className="ad-progress" role="progressbar" aria-valuenow={busy.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
              <span style={{ width: `${busy.progress}%` }} />
              <b>{busy.progress < 100 ? `Uploading… ${busy.progress}%` : 'Processing…'}</b>
            </div>
          )}
        </div>
        <div className="ad-image__side">
          {changed && !busy && <span className="ad-badge ad-badge--warn">Changed — not saved yet</span>}
          <input ref={input} id={id} type="file" accept={ACCEPT.join(',')} className="sr-only" onChange={(e) => pick(e.target.files[0])} disabled={!!busy} />
          <div className="ad-row">
            <label htmlFor={id} className={`ad-btn ad-btn--primary${busy ? ' is-disabled' : ''}`}>{value ? 'Replace image' : 'Upload image'}</label>
            {value && !busy && <RemoveImage onRemove={() => update(path, '')} />}
            {changed && !busy && <button type="button" className="ad-btn ad-btn--ghost" onClick={() => update(path, savedValue)}>Undo</button>}
          </div>
          <p className="ad-help">JPEG, PNG or WebP · up to {window.__ntMaxUploadMb || 5} MB.</p>
          <button type="button" className="ad-link" onClick={() => setLinkMode((v) => !v)} aria-expanded={linkMode}>
            {linkMode ? 'Hide link field' : 'Or use an image link'}
          </button>
          {linkMode && (
            <input className="ad-input" type="url" placeholder="https://…" value={value} aria-label={`${def.label} — image link`} onChange={(e) => update(path, e.target.value.trim())} />
          )}
        </div>
      </div>
    </Frame>
  );
}

function RemoveImage({ onRemove }) {
  const confirm = useConfirm();
  return (
    <button type="button" className="ad-btn ad-btn--ghost" onClick={async () => (await confirm({ title: 'Remove this image?', body: 'The placeholder design will be shown instead. You can undo this until you save.', ok: 'Remove' })) && onRemove()}>
      Remove
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
      return <TextField def={def} path={path} />;
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
      return <ListField def={def} path={path} />;
    default:
      return null;
  }
}

export function ObjectFields({ def, path, nested = false, only }) {
  const entries = Object.entries(def.fields).filter(([k, f]) => !f.hidden && (!only || only.includes(k)));
  const body = entries.map(([k, f]) => <Field key={k} def={f} path={[...path, k]} />);
  if (!nested) return <>{body}</>;
  return (
    <fieldset className="ad-group">
      <legend>{def.label}</legend>
      {def.help && <p className="ad-help">{def.help}</p>}
      {body}
    </fieldset>
  );
}

// ── lists ──
const blankLike = (def, sample) => {
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
        return false;
      case 'number':
        return 0;
      case 'tags':
      case 'multiselect':
        return [];
      default:
        return '';
    }
  };
  return make(def, sample);
};

function itemTitle(def, item, i) {
  const k = def.itemTitle;
  const v = k && item && item[k];
  if (typeof item === 'string') return item ? item.slice(0, 60) : `Item ${i + 1}`;
  return v ? String(v).slice(0, 60) : `Item ${i + 1}`;
}

export function ListField({ def, path, flat = false }) {
  const { read, update } = useEditor();
  const confirm = useConfirm();
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
    if (await confirm({ title: `Delete “${itemTitle(def, items[i], i)}”?`, body: 'It will disappear from the website after you save. You can undo by pressing “Discard” before saving.', ok: 'Delete', danger: true })) {
      update(path, items.filter((_, k) => k !== i));
      setOpen(-1);
    }
  };
  const add = () => {
    const item = blankLike(def.of, items[items.length - 1]);
    update(path, [...items, item]);
    setOpen(items.length);
  };

  // A list of single fields (e.g. 4 approach steps, 2 photos): show them directly.
  if (def.of.type !== 'object') {
    return (
      <fieldset className="ad-group">
        <legend>{def.label}</legend>
        {def.help && <p className="ad-help">{def.help}</p>}
        <div className={def.of.type === 'image' ? 'ad-grid-2' : ''}>
          {items.map((_, i) => <Field key={i} def={{ ...def.of, label: `${def.of.label} ${i + 1}` }} path={[...path, i]} />)}
        </div>
      </fieldset>
    );
  }

  const body = (
    <>
      {error && <p className="ad-error" role="alert">{error}</p>}
      {items.length === 0 && <p className="ad-empty">Nothing here yet.{canAdd ? ' Use “Add” to create the first one.' : ''}</p>}
      <ol className="ad-items">
        {items.map((item, i) => (
          <li key={i} className={`ad-item${open === i ? ' is-open' : ''}`}>
            <div className="ad-item__bar">
              <button type="button" className="ad-item__toggle" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                <span className="ad-item__n">{String(i + 1).padStart(2, '0')}</span>
                <span className="ad-item__t">{itemTitle(def, item, i)}</span>
                <span className="ad-item__chev" aria-hidden="true">▾</span>
              </button>
              <div className="ad-item__tools">
                <button type="button" className="ad-icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                <button type="button" className="ad-icon" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down">↓</button>
                {canRemove && <button type="button" className="ad-icon ad-icon--danger" onClick={() => remove(i)} aria-label="Delete">✕</button>}
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
      {canAdd && <button type="button" className="ad-btn ad-btn--ghost ad-add" onClick={add}>+ Add {def.of.label.toLowerCase()}</button>}
    </>
  );
  if (flat) return body;
  return (
    <fieldset className="ad-group">
      <legend>{def.label}</legend>
      {def.help && <p className="ad-help">{def.help}</p>}
      {body}
    </fieldset>
  );
}
