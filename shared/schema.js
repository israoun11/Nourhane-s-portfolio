// ─────────────────────────────────────────────────────────────
//  CONTENT SCHEMA — one source of truth for:
//   • server-side validation of everything the dashboard saves
//   • the admin forms (labels, help texts, field types)
//  Plain JavaScript, used by both the browser and Node.
//
//  Translations: every text field (text, textarea, tags) is written in English
//  and can be translated. Translations live next to the English text, in the
//  same object:  { title: 'Hello', i18n: { fr: { title: 'Bonjour' }, ar: { … } } }
//  so they move along when items are reordered. Empty = the English text is shown.
// ─────────────────────────────────────────────────────────────
import { KEPT_TRANSLATIONS } from './i18n/langs.js';

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
const bool = (label, o = {}) => ({ type: 'boolean', label, ...o });
const num = (label, o = {}) => ({ type: 'number', label, min: 0, max: 100000, ...o });
const select = (label, options, o = {}) => ({ type: 'select', label, options, ...o });
/** A PDF: public (CV) or private (downloads given only after the lead form). */
const pdf = (label, o = {}) => ({ type: 'file', label, access: 'public', ...o });
const IMAGE_POS = [
  { value: 'center', label: 'Centre' }, { value: 'top', label: 'Top' }, { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' },
];
export const BOOKING_PROVIDERS = [{ value: 'builtin', label: 'Built-in calendar (this website)' }, { value: 'calendly', label: 'Calendly' }, { value: 'cal', label: 'Cal.com' }];
export const WEEKDAYS = [
  { value: '1', label: 'Monday' }, { value: '2', label: 'Tuesday' }, { value: '3', label: 'Wednesday' }, { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' }, { value: '6', label: 'Saturday' }, { value: '0', label: 'Sunday' },
];
export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isTimeZone = (tz) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return !!tz;
  } catch {
    return false;
  }
};
const BOOKING_HOSTS = { calendly: ['calendly.com'], cal: ['cal.com', 'app.cal.com'] };
/** Booking pages may only come from the chosen provider (they are shown inside the website). */
export function isBookingUrl(v, provider) {
  if (!v || provider === 'builtin') return true;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && (BOOKING_HOSTS[provider] || []).some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
/** Texts that can be translated (English is stored in the field, translations in `i18n`). */
export const isTranslatable = (f) => ['text', 'textarea', 'tags'].includes(f.type) && !f.hidden && !f.noTranslate;

const heading = (help) => ({
  title: text('Heading — first part', { required: true, max: 120 }),
  titleEm: text('Heading — highlighted part', { help: help || 'Shown in blue italic after the first part.', max: 120 }),
});

export const schema = obj('Website', {
  site: obj('Website information', {
    name: text('Owner name', { required: true, max: 80, keepName: true }),
    role: text('Professional title', { required: true, max: 120 }),
    portrait: image('Hero portrait', { help: 'Vertical photo (about 4:5). Shown in black & white automatically.' }),
    portraitAlt: text('Portrait — description for screen readers', { max: 160, help: 'Leave empty to use “Portrait of <your name>”.' }),
    portraitPos: select('Portrait — focus point', IMAGE_POS, { help: 'Which part of the photo stays visible when it is cropped.' }),
    email: { type: 'email', label: 'Contact email', help: 'Shown under the contact form (“Or email …”). Leave empty to hide.' },
    whatsapp: { type: 'phone', label: 'WhatsApp number', help: 'International format, e.g. +216 12 345 678. Leave empty to hide the WhatsApp button.' },
    whatsappMessage: text('WhatsApp — pre-filled message', { max: 200, help: 'Optional. Appears in the visitor’s WhatsApp when they open the chat.' }),
    cvFile: pdf('CV (PDF file)', { help: 'Upload your CV as a PDF. It is checked to be a real PDF before it is published.' }),
    cvLabel: text('CV button label', { max: 40, help: 'Leave empty to use “Download CV”.' }),
    // Older “CV link” (kept so an existing link still works; the CV is now uploaded as a PDF).
    cv: link('CV link (alternative)', { kind: 'file', hidden: true }),
    url: link('Website address', { help: 'Your public address, e.g. https://nourhanethabet.com — used for search engines (sitemap, canonical links).' }),
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
    // Removed sections (“One creative mind”, testimonials): their saved texts and images are kept
    // in storage untouched, but they are no longer shown on the website or in the dashboard.
    mind: { ...obj('“One creative mind” section', heading()), hidden: true },
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
      statSuffix: text('After the number', { max: 4, keepName: true }),
      statLabel: text('Label under the number', { max: 40 }),
      statSub: text('Small line', { max: 80 }),
      cta: text('Button', { max: 40 }),
    }),
    personality: obj('Personality section', {
      ...heading('Shown in pink italic after the first part.'),
      annotation: text('Handwritten note', { max: 60 }),
    }),
    tools: obj('Tools section', { ...heading(), intro: area('Introduction', { max: 300 }) }),
    products: obj('Digital products section', { ...heading(), note: area('Note', { max: 300 }) }),
    proof: { ...obj('Testimonials section', { ...heading(), note: text('Small note', { max: 160 }) }), hidden: true },
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

  logos: list('Logo carousel', obj('Logo', {
    name: text('Brand name', { required: true, max: 80, keepName: true, help: 'Describes the logo for screen readers and search engines.' }),
    image: image('Logo image', { help: 'PNG with a transparent background works best. Keep little empty space around the logo.' }),
    href: link('Link (optional)', { help: 'Opens the brand’s website when the logo is clicked. Leave empty for no link.' }),
  }), { min: 0, max: 30, itemTitle: 'name' }),

  mind: list('Ways of thinking', obj('Item', {
    word: text('Big word', { required: true, max: 20 }),
    q: text('Question / statement', { required: true, max: 120 }),
    text: area('Description', { max: 400 }),
    links: tags('Informs (chips)', { max: 4, itemMax: 30 }),
    imgLabel: text('Image placeholder label', { max: 40, help: 'Shown only while no image is uploaded.' }),
    image: image('Image', { help: 'About 5:4. Shown inside a frame — the coloured shapes stay around it.' }),
    imageAlt: text('Image — description for screen readers', { max: 160 }),
    imagePos: select('Image — focus point', IMAGE_POS),
    bg: color('Background colour'),
    art: art(),
  }), { min: 1, max: 6, itemTitle: 'word' }),

  timeline: list('Journey milestones', obj('Milestone', {
    y: text('Year', { required: true, max: 12, noTranslate: true }),
    t: text('Title', { required: true, max: 80 }),
    phase: text('Phase label', { max: 40 }),
    d: area('Description', { required: true, max: 800 }),
    chips: tags('Keywords', { max: 6, itemMax: 40 }),
    cover: image('Featured cover (first slide)', { hidden: true }),
    coverAlt: text('Featured cover — description', { max: 160, hidden: true }),
    coverPosition: select('Featured cover — position in the slider', [{ value: 'first', label: 'First slide' }, { value: 'last', label: 'Last slide' }], { hidden: true }),
    photos: list('Photos of this year', obj('Photo', {
      src: image('Photo'),
      caption: text('Caption', { max: 100, help: 'Optional. Shown under the photo.' }),
      alt: text('Description for screen readers', { max: 160, help: 'Optional. Leave empty to use the caption.' }),
    }), { min: 0, max: 20, gallery: true, itemTitle: 'caption', help: 'Shown in this year’s slider, after the designed visual of the year, in this order. Use ← → to change the order.' }),
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
    image: image('Area image', { help: 'Shown in the card that appears on hover (about 4:5), and as a small picture on phones.' }),
    imageAlt: text('Image — description for screen readers', { max: 160 }),
    link: link('Link (optional)', { help: 'A page or project that shows this discipline. Leave empty for no link.' }),
    linkLabel: text('Link label', { max: 40, help: 'Leave empty to use “Learn more”.' }),
    bg: color('Hover card colour'),
    c: color('Hover accent colour'),
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
    slug: { type: 'slug', label: 'Page address', help: 'Used in the link: /resources/your-address.' },
    kind: select('Type', [
      { value: 'free', label: 'Free download (name + email first)' },
      { value: 'paid', label: 'Paid (shown with its price — checkout not connected yet)' },
      { value: 'soon', label: 'Coming soon' },
    ]),
    d: area('Short description', { max: 200 }),
    long: area('Full description (product page)', { max: 3000 }),
    image: image('Cover image', { help: 'Cover of the product (about 2:1). The colour design is shown until you add one.' }),
    imageAlt: text('Cover — description for screen readers', { max: 160 }),
    file: pdf('Downloadable PDF', { access: 'private', help: 'Kept private: visitors receive it only after filling in the form.' }),
    cta: text('Download button text', { max: 40, help: 'Leave empty to use “Download the free PDF”.' }),
    price: num('Price', { max: 100000, help: 'Only for paid products.' }),
    currency: text('Currency', { max: 4, noTranslate: true, help: 'e.g. TND, EUR, USD.' }),
    promo: text('Promotion text', { max: 80, help: 'Optional, e.g. “−20% this month”.' }),
    seoTitle: text('Search engine title', { max: 70 }),
    seoDescription: area('Search engine description', { max: 200 }),
    published: bool('Visible on the website', { default: true }),
    bg: color('Background colour'),
    c: color('Accent colour'),
  }), { min: 0, max: 20, itemTitle: 't' }),

  leads: obj('Download form & leads', {
    formIntro: area('Text above the form', { max: 300 }),
    privacy: area('Privacy notice', { required: true, max: 800 }),
    consentLabel: text('Optional newsletter consent (checkbox label)', { max: 200, help: 'Unticked by default. Leave empty to not ask.' }),
    success: text('Message after the form', { max: 200 }),
    retentionMonths: num('Keep leads for (months)', { max: 120, help: '0 = keep until you delete them. Older leads are deleted automatically.' }),
    linkHours: num('Download link valid for (hours)', { min: 1, max: 168, default: 24 }),
    messagesRetentionMonths: num('Keep contact messages for (months)', { max: 120, help: '0 = keep until you delete them. Older messages are deleted automatically.' }),
  }),

  stats: list('Statistics', obj('Statistic', {
    value: text('Number', { required: true, max: 12, noTranslate: true, help: 'e.g. +70' }),
    label: text('Label', { required: true, max: 40 }),
    description: text('Small description', { max: 120 }),
    href: link('Link (optional)'),
    visible: bool('Visible on the website', { default: true }),
  }), { min: 0, max: 8, itemTitle: 'label', help: 'Publish only figures that are accurate.' }),

  tools: list('Tools, platforms & technologies', obj('Category', {
    title: text('Category name', { required: true, max: 60 }),
    description: text('Category description', { max: 160 }),
    visible: bool('Visible on the website', { default: true }),
    tools: list('Tools', obj('Tool', {
      name: text('Name', { required: true, max: 60, keepName: true }),
      symbol: text('Card letters', { max: 3, noTranslate: true, help: 'The two letters shown on the tool card, e.g. Cc for CapCut. Leave empty to use the first letters of the name.' }),
      description: text('Short description', { max: 140, help: 'Shown in the detail panel when the tool is selected.' }),
      url: link('Official website (optional)'),
      icon: image('Logo or icon (optional)', { help: 'Only official logos you are allowed to use. Without one, the name is shown as a clean label.' }),
      visible: bool('Visible on the website', { default: true }),
    }), { min: 0, max: 40, itemTitle: 'name' }),
  }), { min: 0, max: 30, itemTitle: 'title' }),

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

  contactPaths: list('Contact cards', obj('Card', {
    id: text('ID', { hidden: true, max: 20 }),
    kind: select('What the card opens', [{ value: 'form', label: 'The contact form (message category)' }, { value: 'booking', label: 'The meeting booking calendar' }]),
    title: text('Title', { required: true, max: 60 }),
    text: area('Description', { max: 200 }),
    icon: image('Icon or image (optional)'),
    visible: bool('Visible on the website', { default: true }),
  }), { min: 1, max: 6, itemTitle: 'title' }),

  booking: obj('Meeting booking', {
    provider: select('Booking service', BOOKING_PROVIDERS, { default: 'builtin' }),
    open: bool('Accept bookings on the website', { default: false, help: 'Built-in calendar: switch on once your availability below is correct.' }),
    timezone: text('Your time zone', { max: 60, noTranslate: true, default: 'Africa/Tunis', help: 'e.g. Africa/Tunis, Europe/Paris. Visitors see the times in their own time zone.' }),
    hours: list('Weekly availability', obj('Time range', {
      day: select('Day', WEEKDAYS),
      start: text('From (HH:MM)', { max: 5, noTranslate: true }),
      end: text('To (HH:MM)', { max: 5, noTranslate: true }),
    }), { min: 0, max: 30, itemTitle: 'day', help: 'Built-in calendar: the times you can take meetings. Add several ranges for the same day if needed.' }),
    interval: num('Start times every (minutes)', { min: 10, max: 240, default: 30 }),
    buffer: num('Break between meetings (minutes)', { min: 0, max: 240, default: 15 }),
    minNotice: num('Minimum notice (hours)', { min: 0, max: 720, default: 24 }),
    maxDays: num('Bookable up to (days ahead)', { min: 1, max: 365, default: 30 }),
    blocked: tags('Unavailable days (YYYY-MM-DD)', { max: 60, itemMax: 10, noTranslate: true, help: 'Holidays or days off, e.g. 2026-12-25.' }),
    url: link('Booking page address', { help: 'Only for Calendly or Cal.com: your page, e.g. https://calendly.com/your-name or https://cal.com/your-name.' }),
    types: list('Meeting types', obj('Meeting type', {
      name: text('Name', { required: true, max: 60 }),
      duration: num('Duration (minutes)', { min: 5, max: 480, default: 30 }),
      url: link('Booking page for this type', { help: 'Only for Calendly or Cal.com, e.g. https://calendly.com/your-name/30min' }),
    }), { min: 0, max: 8, itemTitle: 'name' }),
    note: area('Text above the calendar', { max: 300 }),
  }),

  seo: obj('SEO', {
    indexing: bool('Allow search engines to index the website', { default: true }),
    workTitle: text('Portfolio page — search title', { max: 70 }),
    workDescription: area('Portfolio page — search description', { max: 200 }),
    ogImage: image('Sharing image', { help: 'Shown when a page is shared on social networks (about 1200 × 630).' }),
    robotsExtra: area('Extra robots.txt rules', { max: 2000, noTranslate: true, help: 'Advanced. Added to the generated robots.txt (e.g. Disallow: /private).' }),
    structuredData: bool('Add structured data (JSON-LD) for search engines', { default: true }),
    redirects: list('Redirects', obj('Redirect', {
      from: text('Old address', { required: true, max: 200, noTranslate: true, help: 'A path on this website, e.g. /old-page' }),
      to: text('New address', { required: true, max: 500, noTranslate: true, help: 'A path (e.g. /work/novaseeds) or a full https:// link.' }),
    }), { min: 0, max: 100, itemTitle: 'from' }),
  }),

  ads: obj('Paid ads — budget alerts', {
    currency: text('Currency of your ad accounts', { max: 4, noTranslate: true, default: 'TND' }),
    googleMonthly: num('Google Ads — monthly budget alert', { max: 10000000, help: 'A warning appears in the dashboard when spend over the last 28 days passes this amount. 0 = no alert. Budgets are never changed from here.' }),
    metaMonthly: num('Meta Ads — monthly budget alert', { max: 10000000, help: 'Same for Meta Ads. 0 = no alert.' }),
  }),

  storySettings: obj('My story slider', {
    dots: bool('Show the dots under the slider', { default: true }),
    counter: bool('Show the photo counter (e.g. 2 / 5)', { default: true }),
  }),

  ui: { type: 'uitexts', label: 'Interface texts', hidden: true },
  toolsSeed: { type: 'number', label: 'Tools list version', hidden: true, min: 0, max: 1000, default: 0 },
  socialsSeed: { type: 'number', label: 'Social links version', hidden: true, min: 0, max: 1000, default: 0 },

  projects: list('Projects', obj('Project', {
    published: { type: 'boolean', label: 'Visible on the website' },
    archived: bool('Archived (hidden, kept in the dashboard)'),
    title: text('Project title', { required: true, max: 80, keepName: true }),
    client: text('Client', { max: 80, keepName: true, help: 'Leave empty to use the project title.' }),
    slug: { type: 'slug', label: 'Page address', help: 'Used in the link: /work/your-address. Lowercase letters, numbers and dashes.' },
    n: text('Number', { hidden: true, max: 4 }),
    short: text('Short line', { max: 80, help: 'Shown on the portfolio orbit.' }),
    summary: area('Summary', { required: true, max: 400 }),
    tags: tags('Disciplines', { max: 6, itemMax: 40 }),
    cats: { type: 'multiselect', label: 'Portfolio filters', options: CATEGORIES },
    industry: text('Industry', { max: 60 }),
    year: text('Year', { max: 12, noTranslate: true }),
    role: text('My role', { max: 400 }),
    deliverables: text('Deliverables', { max: 500 }),
    challenge: text('Challenge (one line, landing page)', { max: 200 }),
    context: area('Context', { max: 1200 }),
    problem: area('The problem', { max: 1200 }),
    solution: area('What I did', { max: 1200 }),
    objective: area('Objective', { max: 1200 }),
    strategy: area('Strategy', { max: 1200 }),
    execution: area('Execution', { max: 1200 }),
    toolsUsed: tags('Tools used', { max: 20, itemMax: 40, noTranslate: true }),
    url: link('Project website'),
    sourceUrl: link('Source code'),
    links: list('Other links', obj('Link', {
      label: text('Label', { required: true, max: 60 }),
      url: link('Address'),
    }), { min: 0, max: 8, itemTitle: 'label' }),
    related: { type: 'multiselect', label: 'Related case studies', source: 'projects', max: 3 },
    seoTitle: text('Search engine title', { max: 70, help: 'Leave empty to use the project title.' }),
    seoDescription: area('Search engine description', { max: 200, help: 'Leave empty to use the summary.' }),
    approach: list('Approach — “How it came together” (4 cards)', obj('Card', {
      text: area('Text', { max: 500 }),
      image: image('Card image', { help: 'Small image at the top of the card (about 16:10).' }),
    }), {
      fixed: true, min: 4, max: 4, itemTitle: 'text',
      // older content stored each step as plain text
      coerce: (v) => (typeof v === 'string' ? { text: v, image: '' } : v),
    }),
    resultsIntro: text('Line under “The outcome”', { max: 160, help: 'Optional — e.g. “From the client’s accounts, as they sent them.”' }),
    results: list('Results (verified figures only)', obj('Result', {
      value: text('Figure', { required: true, max: 40 }),
      label: text('What it measures', { required: true, max: 120 }),
      image: image('Image under the figure', { help: 'The proof of this figure — e.g. a statistics screenshot or the client’s message. Portrait screenshots fit best.' }),
      imageAlt: text('Image — description for screen readers', { max: 160 }),
    }), { min: 0, max: 6, itemTitle: 'value', help: 'Shown in “The outcome”: each figure with its own image under it.' }),
    feedback: obj('Client feedback (approved only)', {
      quote: area('Quote', { max: 800 }),
      name: text('Name', { max: 80 }),
      role: text('Role · Company', { max: 120 }),
    }),
    // “What I took away” is no longer shown on project pages; saved texts are kept, not edited.
    learning: area('What I took away', { max: 600, hidden: true }),
    cover: image('Cover image', { help: 'Landscape, about 2400 × 1500.' }),
    coverAlt: text('Cover — description for screen readers', { max: 160 }),
    logo: image('Client logo (optional)', { help: 'Shown on the project card while there is no cover image.' }),
    gallery: list('Project gallery', obj('Image', {
      src: image('Image'),
      label: text('Caption', { max: 80 }),
      hint: text('Placeholder hint', { max: 120, help: 'Shown only while no image is uploaded.' }),
    }), { min: 0, max: 24, gallery: true, itemTitle: 'label', help: 'Shown in the “The work” slider on the project page, in this order. Every image is shown whole (not cropped).' }),
    mono: text('Placeholder initials', { max: 20, noTranslate: true, help: 'Big letters shown on the card while no cover image is uploaded.' }),
    bg: color('Card colour (without image)'),
    fg: color('Card text colour'),
    art: art(),
  }), { min: 0, max: 60, itemTitle: 'title' }),

  /** Original names of uploaded PDFs ({ "<file reference>": "my-cv.pdf" }), shown in the dashboard. */
  fileNames: { type: 'filenames', label: 'Uploaded file names', hidden: true },
});
// Removed sections: kept in storage untouched, hidden everywhere (see text.mind / text.proof).
schema.fields.mind.hidden = true;
schema.fields.testimonials.hidden = true;

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

// Validation messages: a code (translated in the dashboard) + an English fallback.
export const MESSAGES = {
  text: 'must be text',
  tooLong: 'is too long (maximum {max} characters)',
  required: 'is required',
  slug: 'may only contain lowercase letters, numbers and dashes',
  number: 'must be a number',
  range: 'must be between {min} and {max}',
  email: 'is not a valid email address',
  url: 'must be a full https:// link or a site path starting with /',
  color: 'must be a colour like #1534DD',
  choice: 'has an invalid choice',
  maxItems: 'can have at most {max} items',
  itemTooLong: 'items can be at most {max} characters',
  minItems: 'needs at least {min} items',
  slugTaken: 'Page address “{slug}” is used by two projects',
  phone: 'must be a phone number in international format (8 to 15 digits)',
  file: 'is not a valid uploaded file',
  booking: 'must be a page of the chosen booking service (https://calendly.com/… or https://cal.com/…)',
  timezone: 'is not a known time zone (e.g. Africa/Tunis)',
  time: 'must be a time like 09:30',
  timeOrder: 'must be later than the start time',
  redirect: 'must start with / (a path on this website)',
};
export const formatMessage = (tpl, params = {}) => String(tpl).replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? ''));

const joinPath = (path, k) => (path ? `${path}.${k}` : k);

function vField(f, v, path, errs) {
  const err = (code, params = {}) =>
    errs.push({ path, code, params, label: f.label || path, message: `${f.label || path}: ${formatMessage(MESSAGES[code], params)}` });
  switch (f.type) {
    case 'text':
    case 'textarea':
    case 'slug': {
      if (v === undefined || v === null) v = '';
      if (typeof v !== 'string' && typeof v !== 'number') return err('text'), '';
      let s = clean(v);
      if (f.type === 'text') s = s.replace(/[\r\n]+/g, ' ');
      s = s.trim();
      const max = f.max || 200;
      if (s.length > max) err('tooLong', { max });
      if (f.required && !s) err('required');
      if (f.type === 'slug' && !SLUG.test(s)) err('slug');
      return s.slice(0, max);
    }
    case 'number': {
      if (v === undefined || v === null || v === '') return f.default ?? f.min ?? 0;
      const n = Number(v);
      if (!Number.isFinite(n)) return err('number'), f.min || 0;
      if (n < (f.min ?? -Infinity) || n > (f.max ?? Infinity)) err('range', { min: f.min, max: f.max });
      return Math.round(n);
    }
    case 'boolean':
      return v === undefined || v === null ? f.default === true : v === true;
    case 'phone': {
      const s = clean(v || '').trim();
      const digits = s.replace(/[\s().-]/g, '');
      if (s && !/^\+?\d{8,15}$/.test(digits)) err('phone');
      return s;
    }
    case 'file': {
      const s = clean(v || '').trim();
      if (!s) return '';
      if (f.access === 'private') {
        if (!/^private:[a-f0-9]{64}\.pdf$/.test(s)) return err('file'), '';
        return s;
      }
      if (!isSafeUrl(s, 'file')) return err('url'), '';
      return s;
    }
    case 'filenames': {
      // Only names of files that are actually used, as plain short strings.
      const out = {};
      const src = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
      for (const [ref, name] of Object.entries(src)) {
        if (typeof ref !== 'string' || typeof name !== 'string') continue;
        if (!/^(private:[a-f0-9]{64}\.pdf|https?:\/\/\S+\.pdf|\/uploads\/[a-f0-9]{64}\.pdf)$/.test(ref)) continue;
        const n = clean(name).replace(/[\\/<>"]/g, '').trim().slice(0, 160);
        if (n) out[ref] = n;
        if (Object.keys(out).length >= 200) break;
      }
      return out;
    }
    case 'uitexts': {
      const out = {};
      const src = v && typeof v === 'object' ? v : {};
      for (const lang of ['en', ...KEPT_TRANSLATIONS]) {
        const d = src[lang] && typeof src[lang] === 'object' ? src[lang] : {};
        const o = {};
        for (const [k, val] of Object.entries(d)) {
          if (!/^[a-z][\w.]{1,60}$/i.test(k) || typeof val !== 'string') continue;
          const t = clean(val).trim().slice(0, 400);
          if (t) o[k] = t;
        }
        if (Object.keys(o).length) out[lang] = o;
      }
      return out;
    }
    case 'email': {
      const s = clean(v || '').trim();
      if (s && (!EMAIL.test(s) || s.length > 200)) err('email');
      return s;
    }
    case 'url':
    case 'image': {
      const s = clean(v || '').trim();
      if (!isSafeUrl(s, f.kind)) err('url');
      return s;
    }
    case 'color': {
      const s = String(v || '');
      if (!HEX.test(s)) return err('color'), '#202033';
      return s.toUpperCase();
    }
    case 'select': {
      if (v === undefined || v === null || v === '') return f.default ?? f.options[0].value;
      if (!f.options.some((o) => o.value === v)) return err('choice'), f.options[0].value;
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
      if (out.length > f.max) err('maxItems', { max: f.max });
      if (out.some((x) => x.length > f.itemMax)) err('itemTooLong', { max: f.itemMax });
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
      for (const [k, sub] of Object.entries(f.fields)) out[k] = vField(sub, src[k], joinPath(path, k), errs);
      // Translations of this object's texts. Empty translations are dropped (English is shown).
      const tkeys = Object.keys(f.fields).filter((k) => isTranslatable(f.fields[k]));
      if (tkeys.length && src.i18n && typeof src.i18n === 'object') {
        const i18n = {};
        for (const lang of KEPT_TRANSLATIONS) {
          const li = src.i18n[lang];
          if (!li || typeof li !== 'object') continue;
          const o = {};
          for (const k of tkeys) {
            if (li[k] === undefined || li[k] === null) continue;
            const t = vField({ ...f.fields[k], required: false }, li[k], joinPath(path, `i18n.${lang}.${k}`), errs);
            if (Array.isArray(t) ? t.length : t !== '') o[k] = t;
          }
          if (Object.keys(o).length) i18n[lang] = o;
        }
        if (Object.keys(i18n).length) out.i18n = i18n;
      }
      return out;
    }
    case 'list': {
      let arr = Array.isArray(v) ? v : [];
      if (f.coerce) arr = arr.map(f.coerce);
      if (arr.length > f.max) err('maxItems', { max: f.max });
      if (arr.length < (f.min || 0)) err('minItems', { min: f.min });
      if (f.fixed && arr.length < f.min) arr = [...arr, ...Array.from({ length: f.min - arr.length }, () => undefined)];
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
  // Products without a page address get one from their name (older content, new products).
  if (input && Array.isArray(input.products)) {
    input = { ...input, products: input.products.map((p) => (p && typeof p === 'object' && !p.slug ? { ...p, slug: slugify(p.t).slice(0, 60) } : p)) };
  }
  const value = vField(schema, input, '', errors);

  // Projects: unique addresses, numbering follows the order.
  const seen = new Set();
  value.projects.forEach((p, i) => {
    if (seen.has(p.slug)) errors.push({ path: `projects[${i}].slug`, code: 'slugTaken', params: { slug: p.slug }, label: '', message: formatMessage(MESSAGES.slugTaken, { slug: p.slug }) });
    seen.add(p.slug);
    p.n = pad2(i);
  });
  value.method.forEach((m, i) => (m.n = pad2(i)));
  value.expertise.forEach((e, i) => {
    e.n = pad2(i);
    e.proof = e.proof.filter((s) => seen.has(s)).slice(0, 4);
  });
  // Contact cards keep a stable id (it is the category of messages); new cards get one.
  const used = new Set();
  value.contactPaths.forEach((c, i) => {
    let id = SLUG.test(c.id || '') ? c.id : slugify(c.title).slice(0, 20) || `card-${i + 1}`;
    while (used.has(id)) id = `${id.slice(0, 16)}-${i + 1}`;
    used.add(id);
    c.id = id;
  });
  // Products: unique page addresses
  const pslugs = new Set();
  value.products.forEach((p, i) => {
    if (!p.slug) p.slug = slugify(p.t).slice(0, 60);
    if (pslugs.has(p.slug)) errors.push({ path: `products[${i}].slug`, code: 'slugTaken', params: { slug: p.slug }, label: '', message: formatMessage(MESSAGES.slugTaken, { slug: p.slug }) });
    pslugs.add(p.slug);
  });
  value.projects.forEach((p) => (p.related = p.related.filter((s) => seen.has(s) && s !== p.slug).slice(0, 3)));
  // Booking pages must come from the chosen service
  const bk = value.booking;
  if (!isBookingUrl(bk.url, bk.provider)) errors.push({ path: 'booking.url', code: 'booking', params: {}, label: 'Booking page address', message: `Booking page address: ${MESSAGES.booking}` });
  bk.types.forEach((t, i) => {
    if (!isBookingUrl(t.url, bk.provider)) errors.push({ path: `booking.types[${i}].url`, code: 'booking', params: {}, label: 'Booking page for this type', message: `Booking page for this type: ${MESSAGES.booking}` });
  });
  if (!isTimeZone(bk.timezone)) errors.push({ path: 'booking.timezone', code: 'timezone', params: {}, label: 'Your time zone', message: `Your time zone: ${MESSAGES.timezone}` });
  bk.hours.forEach((h, i) => {
    for (const k of ['start', 'end']) if (!HHMM.test(h[k])) errors.push({ path: `booking.hours[${i}].${k}`, code: 'time', params: {}, label: k === 'start' ? 'From (HH:MM)' : 'To (HH:MM)', message: `${k === 'start' ? 'From' : 'To'}: ${MESSAGES.time}` });
    if (HHMM.test(h.start) && HHMM.test(h.end) && h.end <= h.start) errors.push({ path: `booking.hours[${i}].end`, code: 'timeOrder', params: {}, label: 'To (HH:MM)', message: `To: ${MESSAGES.timeOrder}` });
  });
  bk.blocked = bk.blocked.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  value.seo.redirects.forEach((r, i) => {
    if (!/^\/(?!\/)/.test(r.from)) errors.push({ path: `seo.redirects[${i}].from`, code: 'redirect', params: {}, label: 'Old address', message: `Old address: ${MESSAGES.redirect}` });
    if (!/^\/(?!\/)/.test(r.to) && !/^https:\/\//.test(r.to)) errors.push({ path: `seo.redirects[${i}].to`, code: 'url', params: {}, label: 'New address', message: `New address: ${MESSAGES.url}` });
  });

  return { ok: errors.length === 0, errors, value };
}

/** Every image/file URL referenced in the content (for cleaning up unused uploads). */
export function collectUrls(content) {
  const urls = new Set();
  const walk = (v) => {
    if (typeof v === 'string') {
      if (v.startsWith('/uploads/') || v.startsWith('private:') || /^https?:\/\//.test(v)) urls.add(v);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(content);
  return urls;
}

/** Public view: hidden/archived projects and products removed, private file ids hidden. */
export function publicView(content) {
  const projects = content.projects.filter((p) => p.published && !p.archived);
  const live = new Set(projects.map((p) => p.slug));
  // ad budget alerts stay in the dashboard; removed sections and PDF file names are not sent
  const { ads, mind, testimonials, fileNames, ...rest } = content;
  const { mind: _m, proof: _p, ...text } = content.text || {};
  return {
    ...rest,
    text,
    projects: projects.map((p) => ({ ...p, related: (p.related || []).filter((s) => live.has(s)) })),
    expertise: content.expertise.map((e) => ({ ...e, proof: e.proof.filter((s) => live.has(s)) })),
    products: (content.products || []).filter((p) => p.published).map(({ file, ...p }) => ({ ...p, hasFile: !!file })),
    contactPaths: (content.contactPaths || []).filter((c) => c.visible),
    stats: (content.stats || []).filter((x) => x.visible),
    tools: (content.tools || []).filter((c) => c.visible).map((c) => ({ ...c, tools: c.tools.filter((x) => x.visible) })).filter((c) => c.tools.length),
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
    approach: [0, 1, 2, 3].map(() => ({ text: '', image: '' })), results: [], feedback: { quote: '', name: '', role: '' }, learning: '',
    archived: false, client: '', objective: '', strategy: '', execution: '', toolsUsed: [], url: '', sourceUrl: '', links: [], related: [], seoTitle: '', seoDescription: '',
    cover: '', coverAlt: '', logo: '', gallery: [], mono: 'New', bg: '#2E2E46', fg: '#FFF9F5',
    art: [
      { width: '40%', left: '50%', top: '-10%', borderRadius: '50%', background: '#1534DD' },
      { width: '18%', left: '14%', top: '40%', background: '#F174AB' },
    ],
  };
}
