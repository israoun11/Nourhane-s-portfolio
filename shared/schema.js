// ─────────────────────────────────────────────────────────────
//  CONTENT SCHEMA — one source of truth for:
//   • server-side validation of everything the dashboard saves
//   • the admin forms (labels, help texts, field types)
//  Plain JavaScript, used by both the browser and Node.
// ─────────────────────────────────────────────────────────────

export const PALETTE = [
  { value: '#1534DD', label: 'Royal Blue' },
  { value: '#F174AB', label: 'Creative Pink' },
  { value: '#FFF9F5', label: 'Warm Ivory' },
  { value: '#202033', label: 'Midnight Ink' },
  { value: '#B9E8E5', label: 'Soft Aqua' },
  { value: '#2E2E46', label: 'Ink (light)' },
  { value: '#EFE6DC', label: 'Sand' },
  { value: '#FFFFFF', label: 'White' },
];

export const CATEGORIES = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'branding', label: 'Branding' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'content', label: 'Content' },
  { value: 'ux', label: 'UX/UI' },
];

export const TESTIMONIAL_KINDS = [
  { value: 'WRITTEN TESTIMONIAL', label: 'Written testimonial' },
  { value: 'REVIEW SCREENSHOT', label: 'Review screenshot' },
  { value: 'AUDIO REVIEW', label: 'Audio review' },
  { value: 'PROJECT FEEDBACK', label: 'Project feedback' },
];

// ── field builders ──
const text = (label, o = {}) => ({ type: 'text', label, max: 200, ...o });
const area = (label, o = {}) => ({ type: 'textarea', label, max: 2000, ...o });
const image = (label, o = {}) => ({ type: 'image', label, ...o });
const link = (label, o = {}) => ({ type: 'url', label, kind: 'link', ...o });
const color = (label, o = {}) => ({ type: 'color', label, ...o });
const raw = (o = {}) => ({ type: 'css', hidden: true, ...o });
const art = () => ({ type: 'art', hidden: true });
const obj = (label, fields, o = {}) => ({ type: 'object', label, fields, ...o });
const list = (label, of, o = {}) => ({ type: 'list', label, of, max: 40, ...o });
const tags = (label, o = {}) => ({ type: 'tags', label, max: 12, itemMax: 60, ...o });
const heading = (help) => ({
  title: text('Heading — first part', { required: true, max: 120 }),
  titleEm: text('Heading — highlighted part', { help: help || 'Shown in blue italic after the first part.', max: 120 }),
});

export const schema = obj('Website', {
  site: obj('Website information', {
    name: text('Owner name', { required: true, max: 80 }),
    role: text('Professional title', { required: true, max: 120 }),
    portrait: image('Hero portrait', { help: 'Vertical photo (about 4:5). Shown in black & white automatically.' }),
    email: { type: 'email', label: 'Contact email', help: 'Shown under the contact form. Leave empty to hide.' },
    cv: link('CV (PDF link)', { kind: 'file', help: 'A link to your CV PDF (e.g. Google Drive share link or /files/cv.pdf).' }),
    codastudioUrl: link('CodaStudio website', { help: 'Full address starting with https://' }),
    socials: obj('Social profiles', {
      linkedin: link('LinkedIn'),
      instagram: link('Instagram'),
      youtube: link('YouTube'),
    }, { help: 'Links only appear on the website once filled in.' }),
    codastudio: obj('CodaStudio visuals', {
      logo: image('Studio logo'),
      work: list('Client project images', image('Image'), { fixed: true, min: 2, max: 2 }),
    }),
    training: list('Training photos', image('Photo'), { fixed: true, min: 2, max: 2 }),
    seoTitle: text('Search engine title', { max: 70, help: 'Shown in Google results and the browser tab.' }),
    seoDescription: area('Search engine description', { max: 200 }),
  }),

  text: obj('Page texts', {
    hero: obj('Hero (top of the page)', {
      hello: text('Small greeting', { max: 60 }),
      line1: text('Headline line 1', { required: true, max: 30 }),
      line2: text('Headline line 2 (blue italic)', { required: true, max: 30 }),
      line3: text('Headline line 3 (underlined)', { required: true, max: 30 }),
      tagA: text('Tagline part 1', { max: 80 }),
      tagB: text('Tagline part 2 (blue italic)', { max: 80 }),
      tagC: text('Tagline part 3', { max: 80 }),
      intro: area('Introduction', { max: 400 }),
      cta1: text('Main button', { max: 40 }),
      cta2: text('Second button', { max: 40 }),
      label1: text('Label on the photo — line 1', { max: 40 }),
      label2: text('Label on the photo — line 2 (pink)', { max: 40 }),
      annotation: text('Handwritten note', { max: 60 }),
    }),
    band: tags('Moving word band', { max: 8, itemMax: 24, help: 'Words that slide across the page under the hero.' }),
    mind: obj('“One creative mind” section', heading()),
    journey: obj('Journey section', {
      eyebrow: text('Small label', { max: 60 }),
      title: area('Heading', { max: 120, help: 'Press Enter to start a new line.' }),
      grew: text('Blue italic line', { max: 80 }),
      sub: area('Introduction', { max: 300 }),
    }),
    work: obj('Selected work section', {
      ...heading(),
      intro: area('Introduction', { max: 300 }),
      note: text('Small note under the projects', { max: 160 }),
      cta: text('Button', { max: 40 }),
    }),
    method: obj('Method section', heading()),
    expertise: obj('Expertise section', heading()),
    coda: obj('CodaStudio section', {
      eyebrow: text('Small label', { max: 40 }),
      ...heading('Shown in pink italic after the first part.'),
      text: area('Description', { max: 500 }),
      cta1: text('Main button', { max: 40 }),
      cta2: text('Second button', { max: 40 }),
    }),
    learning: obj('Training section', {
      ...heading(),
      statValue: { type: 'number', label: 'Big number', min: 0, max: 100000 },
      statSuffix: text('After the number', { max: 4 }),
      statLabel: text('Label under the number', { max: 40 }),
      statSub: text('Small line', { max: 80 }),
      cta: text('Button', { max: 40 }),
    }),
    personality: obj('Personality section', {
      ...heading('Shown in pink italic after the first part.'),
      annotation: text('Handwritten note', { max: 60 }),
    }),
    products: obj('Digital products section', { ...heading(), note: area('Note', { max: 300 }) }),
    proof: obj('Testimonials section', { ...heading(), note: text('Small note', { max: 160 }) }),
    contact: obj('Contact section', heading()),
    footer: obj('Footer motto', {
      motto1: text('Part 1', { max: 40 }),
      motto2: text('Part 2 (pink)', { max: 40 }),
      motto3: text('Part 3 (aqua)', { max: 40 }),
    }),
    portfolio: obj('Portfolio page', {
      eyebrow: text('Small label', { max: 60 }),
      ...heading('Shown in pink italic after the first part.'),
      intro: area('Introduction', { max: 400 }),
      ctaTitle: text('Closing heading', { max: 60 }),
      ctaEm: text('Closing heading — highlighted part', { max: 60 }),
    }),
  }),

  mind: list('Ways of thinking', obj('Item', {
    word: text('Big word', { required: true, max: 20 }),
    q: text('Question / statement', { required: true, max: 120 }),
    text: area('Description', { max: 400 }),
    links: tags('Informs (chips)', { max: 4, itemMax: 30 }),
    imgLabel: text('Image placeholder label', { max: 40, help: 'Shown only while no image is uploaded.' }),
    image: image('Image', { help: 'About 5:4.' }),
    bg: color('Background colour'),
    art: art(),
  }), { min: 1, max: 6, itemTitle: 'word' }),

  timeline: list('Journey milestones', obj('Milestone', {
    y: text('Year', { required: true, max: 12 }),
    t: text('Title', { required: true, max: 80 }),
    phase: text('Phase label', { max: 40 }),
    d: area('Description', { required: true, max: 800 }),
    chips: tags('Keywords', { max: 6, itemMax: 40 }),
    image: image('Image', { help: 'Optional. Replaces the illustration (about 5:4).' }),
  }), { min: 1, max: 12, itemTitle: 'y' }),

  method: list('Method steps', obj('Step', {
    n: text('Number', { hidden: true, max: 4 }),
    t: text('Step name', { required: true, max: 30 }),
    d: area('Description', { max: 300 }),
    bg: color('Circle colour'),
    fg: color('Number colour'),
    pad: raw(),
  }), { fixed: true, min: 4, max: 4, itemTitle: 't' }),

  expertise: list('Expertise areas', obj('Area', {
    n: text('Number', { hidden: true, max: 4 }),
    title: text('Title', { required: true, max: 80 }),
    text: area('Description', { max: 400 }),
    proof: { type: 'multiselect', label: 'Evidence projects', source: 'projects', max: 4 },
    bg: color('Hover card colour'),
    c: color('Hover shape colour'),
    r: raw(),
  }), { min: 1, max: 10, itemTitle: 'title' }),

  codaServices: tags('CodaStudio capabilities', { max: 10, itemMax: 40 }),

  learning: list('Training offers', obj('Offer', {
    title: text('Title', { required: true, max: 80 }),
    status: { type: 'select', label: 'Status', options: [{ value: 'available', label: 'Available' }, { value: 'soon', label: 'Coming soon' }] },
  }), { min: 0, max: 12, itemTitle: 'title' }),

  series: list('Content series', obj('Series', {
    a: text('Title — line 1', { required: true, max: 30 }),
    b: text('Title — line 2 (pink)', { max: 30 }),
    d: area('Description', { max: 300 }),
    href: link('Video or playlist link', { help: 'Leave empty to show “Episodes coming soon”.' }),
    thumb: image('Thumbnail', { help: 'About 4:5. Shown in black & white.' }),
    bg: color('Frame colour'),
    rot: raw(), offset: raw(), clip: raw(),
  }), { min: 0, max: 6, itemTitle: 'b' }),

  products: list('Digital products', obj('Product', {
    t: text('Name', { required: true, max: 60 }),
    d: area('Description', { max: 200 }),
    bg: color('Background colour'),
    c: color('Accent colour'),
  }), { min: 0, max: 10, itemTitle: 't' }),

  testimonials: list('Testimonials', obj('Testimonial', {
    kind: { type: 'select', label: 'Type', options: TESTIMONIAL_KINDS },
    big: text('Big word on the coloured side', { max: 20 }),
    quote: area('Quote', { max: 800, help: 'Only authentic, approved feedback.' }),
    name: text('Client name', { max: 80 }),
    meta: text('Role · Company', { max: 120 }),
    image: image('Review screenshot'),
    audio: link('Audio file link', { kind: 'media', help: 'Optional link to an MP3 voice note.' }),
    bg: color('Side colour'),
    fg: color('Side text colour'),
  }), { min: 0, max: 12, itemTitle: 'kind' }),

  contactPaths: list('Contact paths', obj('Path', {
    id: text('ID', { hidden: true, max: 20 }),
    title: text('Title', { required: true, max: 60 }),
    text: area('Description', { max: 200 }),
  }), { fixed: true, min: 3, max: 3, itemTitle: 'title' }),

  projects: list('Projects', obj('Project', {
    published: { type: 'boolean', label: 'Visible on the website' },
    title: text('Project title', { required: true, max: 80 }),
    slug: { type: 'slug', label: 'Page address', help: 'Used in the link: /work/your-address. Lowercase letters, numbers and dashes.' },
    n: text('Number', { hidden: true, max: 4 }),
    short: text('Short line', { max: 80, help: 'Shown on the portfolio orbit.' }),
    summary: area('Summary', { required: true, max: 400 }),
    tags: tags('Disciplines', { max: 6, itemMax: 40 }),
    cats: { type: 'multiselect', label: 'Portfolio filters', options: CATEGORIES },
    industry: text('Industry', { max: 60 }),
    year: text('Year', { max: 12 }),
    role: text('My role', { max: 200 }),
    deliverables: text('Deliverables', { max: 200 }),
    challenge: text('Challenge (one line, landing page)', { max: 200 }),
    context: area('Context', { max: 1200 }),
    problem: area('The problem', { max: 1200 }),
    solution: area('What I did', { max: 1200 }),
    approach: list('Approach (4 steps)', area('Step', { max: 500 }), { fixed: true, min: 4, max: 4 }),
    results: list('Results (verified figures only)', obj('Result', {
      value: text('Figure', { required: true, max: 20 }),
      label: text('What it measures', { required: true, max: 120 }),
    }), { min: 0, max: 6, itemTitle: 'value' }),
    feedback: obj('Client feedback (approved only)', {
      quote: area('Quote', { max: 800 }),
      name: text('Name', { max: 80 }),
      role: text('Role · Company', { max: 120 }),
    }),
    learning: area('What I took away', { max: 600 }),
    cover: image('Cover image', { help: 'Landscape, about 2400 × 1500.' }),
    gallery: list('Gallery', obj('Image', {
      src: image('Image'),
      label: text('Caption', { max: 80 }),
      hint: text('Placeholder hint', { max: 120, help: 'Shown only while no image is uploaded.' }),
    }), { min: 0, max: 12, itemTitle: 'label' }),
    mono: text('Placeholder initials', { max: 20, help: 'Big letters shown on the card while no cover image is uploaded.' }),
    bg: color('Card colour (without image)'),
    fg: color('Card text colour'),
    art: art(),
  }), { min: 0, max: 60, itemTitle: 'title' }),
});

// ─────────────────────────────────────────────────────────────
//  Validation
// ─────────────────────────────────────────────────────────────
const SAFE_CSS = /^[-#%(),.\w\s]{0,120}$/;
const ART_KEYS = ['width', 'left', 'right', 'top', 'bottom', 'borderRadius', 'background', 'transform'];
const HEX = /^#[0-9a-fA-F]{6}$/;
const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Control characters (except tab/newline) are stripped from all text.
const clean = (s) => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

export function isSafeUrl(v, kind = 'link') {
  if (v === '') return true;
  if (typeof v !== 'string' || v.length > 1000) return false;
  if (/^\/(?!\/)[\w\-./%~]*$/.test(v)) return !v.includes('..'); // site-relative path
  try {
    const u = new URL(v);
    if (u.protocol === 'https:' || u.protocol === 'http:') return true;
    if (kind === 'link' && u.protocol === 'mailto:') return true;
    return false;
  } catch {
    return false;
  }
}

export function slugify(s) {
  return String(s || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'project';
}

function vField(f, v, path, errs) {
  const err = (msg) => errs.push({ path, message: `${f.label || path}: ${msg}` });
  switch (f.type) {
    case 'text':
    case 'textarea':
    case 'slug': {
      if (v === undefined || v === null) v = '';
      if (typeof v !== 'string' && typeof v !== 'number') return err('must be text'), '';
      let s = clean(v);
      if (f.type === 'text') s = s.replace(/[\r\n]+/g, ' ');
      s = s.trim();
      const max = f.max || 200;
      if (s.length > max) err(`is too long (maximum ${max} characters)`);
      if (f.required && !s) err('is required');
      if (f.type === 'slug' && !SLUG.test(s)) err('may only contain lowercase letters, numbers and dashes');
      return s.slice(0, max);
    }
    case 'number': {
      const n = Number(v);
      if (!Number.isFinite(n)) return err('must be a number'), f.min || 0;
      if (n < (f.min ?? -Infinity) || n > (f.max ?? Infinity)) err(`must be between ${f.min} and ${f.max}`);
      return Math.round(n);
    }
    case 'boolean':
      return v === true;
    case 'email': {
      const s = clean(v || '').trim();
      if (s && (!EMAIL.test(s) || s.length > 200)) err('is not a valid email address');
      return s;
    }
    case 'url':
    case 'image': {
      const s = clean(v || '').trim();
      if (!isSafeUrl(s, f.kind)) err('must be a full https:// link or a site path starting with /');
      return s;
    }
    case 'color': {
      const s = String(v || '');
      if (!HEX.test(s)) return err('must be a colour like #1534DD'), '#202033';
      return s.toUpperCase();
    }
    case 'select': {
      if (!f.options.some((o) => o.value === v)) return err('has an invalid choice'), f.options[0].value;
      return v;
    }
    case 'multiselect': {
      if (!Array.isArray(v)) return [];
      const out = [...new Set(v.filter((x) => typeof x === 'string'))];
      if (f.options) return out.filter((x) => f.options.some((o) => o.value === x));
      return out.slice(0, f.max || 10);
    }
    case 'tags': {
      if (!Array.isArray(v)) return [];
      const out = v.map((x) => clean(x).replace(/[\r\n]+/g, ' ').trim()).filter(Boolean);
      if (out.length > f.max) err(`can have at most ${f.max} items`);
      if (out.some((x) => x.length > f.itemMax)) err(`items can be at most ${f.itemMax} characters`);
      return out.slice(0, f.max).map((x) => x.slice(0, f.itemMax));
    }
    case 'css': {
      const s = String(v ?? '');
      if (!SAFE_CSS.test(s) || /url|expression|javascript/i.test(s)) return '';
      return s;
    }
    case 'art': {
      if (!Array.isArray(v)) return [];
      return v.slice(0, 4).map((shape) => {
        const o = {};
        if (shape && typeof shape === 'object') {
          ART_KEYS.forEach((k) => {
            const val = shape[k];
            if (typeof val === 'string' && SAFE_CSS.test(val) && !/url|expression|javascript/i.test(val)) o[k] = val;
          });
        }
        return o;
      });
    }
    case 'object': {
      const src = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
      const out = {};
      for (const [k, sub] of Object.entries(f.fields)) out[k] = vField(sub, src[k], path ? `${path}.${k}` : k, errs);
      return out;
    }
    case 'list': {
      const arr = Array.isArray(v) ? v : [];
      if (arr.length > f.max) err(`can have at most ${f.max} items`);
      if (arr.length < (f.min || 0)) err(`needs at least ${f.min} items`);
      return arr.slice(0, f.max).map((item, i) => vField(f.of, item, `${path}[${i}]`, errs));
    }
    default:
      return undefined;
  }
}

const pad2 = (i) => String(i + 1).padStart(2, '0');

/**
 * Validates and normalises a full content document.
 * Returns { ok, errors, value }. Unknown fields are dropped.
 */
export function validateContent(input) {
  const errors = [];
  const value = vField(schema, input, '', errors);

  // Projects: unique addresses, numbering follows the order.
  const seen = new Set();
  value.projects.forEach((p, i) => {
    if (seen.has(p.slug)) errors.push({ path: `projects[${i}].slug`, message: `Page address “${p.slug}” is used by two projects` });
    seen.add(p.slug);
    p.n = pad2(i);
  });
  value.method.forEach((m, i) => (m.n = pad2(i)));
  value.expertise.forEach((e, i) => {
    e.n = pad2(i);
    e.proof = e.proof.filter((s) => seen.has(s)).slice(0, 4);
  });
  const ids = ['work', 'collab', 'share'];
  value.contactPaths.forEach((c, i) => (c.id = ids[i]));

  return { ok: errors.length === 0, errors, value };
}

/** Every image/file URL referenced in the content (for cleaning up unused uploads). */
export function collectUrls(content) {
  const urls = new Set();
  const walk = (v) => {
    if (typeof v === 'string') {
      if (v.startsWith('/uploads/') || /^https?:\/\//.test(v)) urls.add(v);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(content);
  return urls;
}

/** Public view: hidden projects removed, references to them dropped. */
export function publicView(content) {
  const projects = content.projects.filter((p) => p.published);
  const live = new Set(projects.map((p) => p.slug));
  return {
    ...content,
    projects,
    expertise: content.expertise.map((e) => ({ ...e, proof: e.proof.filter((s) => live.has(s)) })),
  };
}

/** A blank project with sensible design defaults. */
export function newProject(existing = []) {
  let slug = 'new-project';
  let k = 2;
  while (existing.some((p) => p.slug === slug)) slug = `new-project-${k++}`;
  return {
    published: false, title: 'New project', slug, n: '', short: '', summary: '', tags: [], cats: [],
    industry: '', year: '', role: '', deliverables: '', challenge: '', context: '', problem: '', solution: '',
    approach: ['', '', '', ''], results: [], feedback: { quote: '', name: '', role: '' }, learning: '',
    cover: '', gallery: [], mono: 'New', bg: '#2E2E46', fg: '#FFF9F5',
    art: [
      { width: '40%', left: '50%', top: '-10%', borderRadius: '50%', background: '#1534DD' },
      { width: '18%', left: '14%', top: '40%', background: '#F174AB' },
    ],
  };
}
