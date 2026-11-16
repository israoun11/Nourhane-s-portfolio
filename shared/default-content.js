import { DEFAULT_TOOLS as TOOLS } from './tools-list.js';
// ─────────────────────────────────────────────────────────────
//  DEFAULT CONTENT — the approved website content.
//  Used once to seed the database on first start, and as the
//  offline fallback. After that, edit everything in /admin.
//  French and Arabic translations of these texts: shared/i18n/content-fr.js
//  (filled in automatically when the site starts).
// ─────────────────────────────────────────────────────────────

const B = '#1534DD', P = '#F174AB', I = '#FFF9F5', K = '#202033', A = '#B9E8E5', K2 = '#2E2E46', S = '#EFE6DC';

// Four empty photo slots per year of "My story" — filled in the dashboard.
const photoSlots = () => [0, 1, 2, 3].map(() => ({ src: '', caption: '' }));

const emptyCase = {
  industry: '', year: '', role: '', deliverables: '', context: '', problem: '', challenge: '', solution: '',
  approach: [0, 1, 2, 3].map(() => ({ text: '', image: '' })),
  archived: false, client: '', objective: '', strategy: '', execution: '', toolsUsed: [], url: '', sourceUrl: '', links: [], related: [], seoTitle: '', seoDescription: '', results: [], feedback: { quote: '', name: '', role: '' }, learning: '', cover: '', coverAlt: '', logo: '', gallery: [],
};

/** Nourhane's Calendly scheduling page (given by the owner). */
export const CALENDLY_URL = 'https://calendly.com/nourhane-althabet/30min';

export const BOOKING_CARD = { id: 'booking', kind: 'booking', title: 'Book a meeting', text: 'Pick a time that suits you for a video call.', icon: '', visible: true };
export const DEFAULT_TOOLS = TOOLS;

export const defaultContent = {
  site: {
    name: 'Nourhane Thabet',
    role: 'Creative & Digital Marketing Strategist',
    portrait: '',
    portraitAlt: '',
    portraitPos: 'center',
    email: '',
    whatsapp: '',
    whatsappMessage: '',
    cvFile: '',
    cvLabel: '',
    cv: '',
    url: '',
    codastudioUrl: '',
    socials: { linkedin: 'https://www.linkedin.com/in/nourhane-thabet-a656b729b', instagram: 'https://www.instagram.com/nourhane_thabet', youtube: '' },
    codastudio: { logo: '', work: ['', ''] },
    training: ['', ''],
    seoTitle: 'Nourhane Thabet — Creative & Digital Marketing Strategist',
    seoDescription: 'Nourhane Thabet — creative and digital marketing strategist, founder of CodaStudio and digital marketing trainer. I think beyond the visual.',
  },

  text: {
    hero: {
      hello: "HELLO, I'M NOURHANE.",
      line1: 'I think',
      line2: 'beyond the',
      line3: 'Visual.',
      tagA: 'Designer by background.',
      tagB: 'Strategist by evolution.',
      tagC: 'Entrepreneur by choice.',
      intro: "I'm Nourhane Thabet, a creative and digital marketing strategist connecting design thinking, marketing, technology, and business to bring meaningful ideas to life.",
      cta1: 'EXPLORE MY WORK',
      cta2: 'GET TO KNOW ME',
      label1: 'Creative & digital',
      label2: 'Marketing strategist',
      annotation: 'More than just pretty visuals. ↓',
    },
    mind: { title: 'ONE CREATIVE MIND.', titleEm: 'Multiple ways to think.' },
    journey: {
      eyebrow: 'MY STORY · 2021 — 2026',
      title: "I didn't start\nas a strategist.",
      grew: 'I grew into one.',
      sub: 'Every project, experience, and new discipline changed how I think about creativity and business.',
    },
    work: {
      title: 'THE IDEAS THAT',
      titleEm: 'made it real.',
      intro: 'Selected projects across marketing, design, digital experiences, and creative strategy.',
      note: 'Provisional selection — roles, years and results are verified before publication.',
      cta: 'EXPLORE ALL PROJECTS',
    },
    method: { title: 'Beautiful is good.', titleEm: 'Purposeful is better.' },
    expertise: { title: 'NOT ONE DISCIPLINE.', titleEm: 'One connected perspective.' },
    coda: {
      eyebrow: 'CHAPTER 2026',
      title: 'Then I built',
      titleEm: 'my own studio.',
      text: 'CodaStudio is my independent creative and digital marketing practice, bringing strategic thinking, visual communication, and digital execution together.',
      cta1: 'DISCOVER CODASTUDIO',
      cta2: "LET'S WORK TOGETHER",
    },
    learning: {
      title: 'KNOWLEDGE GROWS',
      titleEm: 'when we share it.',
      statValue: 50,
      statSuffix: '+',
      statLabel: 'PEOPLE TRAINED',
      statSub: 'in digital marketing.',
      cta: 'EXPLORE LEARNING',
    },
    personality: { title: 'Serious about strategy.', titleEm: 'Not always about everything else.', annotation: '↓ where my voice lives' },
    products: { title: 'TOOLS, IDEAS', titleEm: '& things worth sharing.', note: 'Everything here is in preparation. Use the contact form to hear when each one launches.' },
    proof: { title: 'THE PEOPLE BEHIND', titleEm: 'the projects.', note: 'Only authentic, approved feedback is published here.' },
    contact: { title: 'Got an idea?', titleEm: "Let's make it matter." },
    footer: { motto1: 'Still creating.', motto2: 'Still learning.', motto3: 'Still evolving.' },
    tools: { title: 'Tools, Platforms', titleEm: '& Technologies', intro: 'The tools I use every day — for advertising, content, analytics, design, AI and project management.' },
    portfolio: {
      eyebrow: 'PORTFOLIO · 2021 — 2026',
      title: 'Selected',
      titleEm: 'work.',
      intro: 'Brands, campaigns, stores and digital experiences — each one a mix of strategy, design and business thinking. Drag the orbit, or browse the index below.',
      ctaTitle: 'Have a project',
      ctaEm: 'in mind?',
    },
  },

  // Logo carousel under the hero — files live in /public/logos. Edit in the dashboard: Sections → Logo carousel.
  logos: [
    { name: 'Client logo (fox mark)', image: '/logos/fox-mark.png', href: '' },
    { name: 'La Tienda', image: '/logos/la-tienda.png', href: '' },
    { name: 'Client logo (chevron mark)', image: '/logos/chevron-mark.png', href: '' },
    { name: 'NovaSeeds Innovation Hub', image: '/logos/novaseeds.png', href: '' },
    { name: 'Nouvelle Vision Rénovation', image: '/logos/nvr.png', href: '' },
    { name: 'The Elo', image: '/logos/the-elo.png', href: '' },
    { name: 'Tunisie Compétences', image: '/logos/tunisie-competences.png', href: '' },
    { name: 'Days Up', image: '/logos/days-up.png', href: '' },
    { name: 'ProHealthCare+', image: '/logos/prohealthcare.png', href: '' },
  ],

  mind: [
    {
      word: 'Design', q: 'How things look and communicate.',
      text: 'My foundation. Grids, type and composition still shape how I structure every idea, from a campaign to a landing page.',
      links: ['Strategy', 'People'], imgLabel: 'BRAND / VISUAL WORK', image: '', bg: '#FFFFFF',
      art: [
        { width: '56%', left: '8%', top: '10%', background: B },
        { width: '34%', right: '8%', bottom: '10%', borderRadius: '50%', background: P },
      ],
    },
    {
      word: 'Strategy', q: 'Why things work and what they should achieve.',
      text: 'Marketing taught me to ask what a visual is for before deciding what it looks like — positioning, objectives, channels.',
      links: ['Business', 'Design'], imgLabel: 'CAMPAIGN / PLAN', image: '', bg: B,
      art: [
        { width: '40%', left: '10%', top: '14%', borderRadius: '50%', background: P },
        { width: '46%', right: '6%', bottom: '6%', background: I },
      ],
    },
    {
      word: 'People', q: 'Who we are creating for.',
      text: 'UX/UI made me design for real behaviour, and teaching made me explain ideas so others can use them.',
      links: ['Design', 'Strategy'], imgLabel: 'UX / TRAINING', image: '', bg: A,
      art: [
        { width: '30%', left: '14%', top: '20%', borderRadius: '50%', background: K },
        { width: '50%', right: '10%', bottom: '0%', borderRadius: '200px 200px 0 0', background: I },
      ],
    },
    {
      word: 'Business', q: 'How ideas connect to meaningful objectives.',
      text: 'E-commerce and building CodaStudio grounded my creativity in operations, budgets, clients and results.',
      links: ['Strategy', 'People'], imgLabel: 'E-COMMERCE / STUDIO', image: '', bg: K,
      art: [
        { width: '48%', left: '46%', top: '6%', borderRadius: '50%', background: P },
        { width: '30%', right: '56%', bottom: '8%', background: A },
      ],
    },
  ],

  timeline: [
    { y: '2021', t: 'The Beginning', phase: 'EXECUTION', cover: '', coverAlt: '', coverPosition: 'first', photos: photoSlots(), d: 'Graduated in Graphic Advertising / Graphic Design, with a final-year project focused on UX/UI Design. Worked as a graphic designer in a printing company and gained UX/UI and social media design experience through a marketing agency internship.', chips: ['Graphic design', 'Print', 'First UX/UI'] },
    { y: '2022', t: 'Growing Responsibility', phase: 'CRAFT + LEADERSHIP', cover: '', coverAlt: '', coverPosition: 'first', photos: photoSlots(), d: 'Lead Graphic Designer at a large printing company, supervising a junior designer. Pursued master’s-level studies in Theories of Creativity, and gained experience through an internship with a marketing company in Saudi Arabia.', chips: ['Lead designer', 'Branding', 'Creativity studies'] },
    { y: '2023', t: 'Independent Practice', phase: 'INDEPENDENCE', cover: '', coverAlt: '', coverPosition: 'first', photos: photoSlots(), d: 'Developed freelance experience across creative and marketing-related projects.', chips: ['Freelance', 'Creative', 'Marketing'] },
    { y: '2024', t: 'Understanding Business', phase: 'COMMERCE', cover: '', coverAlt: '', coverPosition: 'first', photos: photoSlots(), d: 'A year on an e-commerce project, combining marketing, design, project management, and commercial operations.', chips: ['E-commerce', 'Project management', 'Operations'] },
    { y: '2025', t: 'From Practice to Education', phase: 'EDUCATION', cover: '', coverAlt: '', coverPosition: 'first', photos: photoSlots(), d: 'Continued freelance work and trained more than 50 people in digital marketing.', chips: ['Training', '50+ people trained', 'Freelance'] },
    { y: '2026', t: 'Building Something of My Own', phase: 'STRATEGY + STUDIO', cover: '', coverAlt: '', coverPosition: 'first', photos: photoSlots(), d: 'Established CodaStudio and expanded into independent creative and strategic client projects.', chips: ['CodaStudio', 'Strategy', 'Client projects'] },
  ],

  method: [
    { n: '01', t: 'Discover', d: 'Understand the people, problem, brand, and business.', bg: B, fg: '#FFFFFF', pad: '0px' },
    { n: '02', t: 'Connect', d: 'Connect insights, ideas, opportunities, and objectives.', bg: P, fg: K, pad: 'clamp(0px, 8vw, 120px)' },
    { n: '03', t: 'Create', d: 'Translate strategy into experiences, campaigns, content, and design.', bg: K, fg: I, pad: '0px' },
    { n: '04', t: 'Evolve', d: 'Learn from performance, feedback, and experimentation.', bg: A, fg: K, pad: 'clamp(0px, 8vw, 120px)' },
  ],

  expertise: [
    { n: '01', title: 'Digital Marketing & Strategy', text: 'Channel planning, paid advertising and performance-led decisions that connect marketing to business goals.', proof: ['vxn-moto-procap', 'dar-el-keswa'], bg: B, c: P, r: '50%' },
    { n: '02', title: 'Social Media & Storytelling', text: 'Editorial lines, content systems and narratives that give brands a consistent, human voice.', proof: ['artisanscom', 'my-cover'], bg: P, c: I, r: '0' },
    { n: '03', title: 'Branding & Creative Direction', text: 'Positioning, identity and art direction rooted in a graphic design background.', proof: ['novaseeds'], bg: A, c: B, r: '50%' },
    { n: '04', title: 'UX/UI & Digital Experiences', text: 'User-centred websites and interfaces, from structure and flows to the final visual layer.', proof: ['novaseeds', 'ux-ui-project'], bg: K, c: A, r: '16px' },
    { n: '05', title: 'AI-Assisted Creative Production', text: 'AI tools for research, ideation and production — with human judgment on every output.', proof: ['vxn-moto-procap'], bg: I, c: B, r: '50%' },
    { n: '06', title: 'E-commerce & Project Management', text: 'Running online stores and projects end to end: catalogue, campaigns, operations, coordination.', proof: ['dar-el-keswa', 'my-cover'], bg: B, c: I, r: '0' },
  ],

  codaServices: ['Brand strategy', 'Creative direction', 'Digital marketing', 'Content production', 'Web & UX/UI'],

  learning: [
    { title: 'Digital marketing training', status: 'available' },
    { title: 'Social media strategy education', status: 'available' },
    { title: 'Practical workshops', status: 'available' },
    { title: 'Online courses', status: 'soon' },
    { title: 'Educational resources', status: 'soon' },
  ],

  series: [
    { a: 'Marketing', b: 'Crimes', d: 'Marketing misconceptions, mistakes, and sharp educational commentary.', bg: P, rot: '-2deg', offset: '0px', clip: 'polygon(2% 3%, 98% 0, 100% 97%, 0 100%)', href: '', thumb: '' },
    { a: 'Behind the', b: 'Strategy', d: 'Unpacking campaigns, business thinking, and creative decisions.', bg: A, rot: '1.5deg', offset: 'clamp(0px, 4vw, 56px)', clip: 'polygon(0 0, 100% 3%, 97% 100%, 3% 97%)', href: '', thumb: '' },
    { a: '9 Years', b: 'Later', d: 'Personal stories about creative growth, starting, experimenting, and building a public voice.', bg: I, rot: '-1deg', offset: '0px', clip: 'polygon(3% 0, 100% 2%, 98% 98%, 0 100%)', href: '', thumb: '' },
  ],

  products: [
    { t: 'Marketing e-books', slug: 'marketing-e-books', kind: 'free', d: 'Practical guides on strategy and content.', long: '', image: '', imageAlt: '', file: '', cta: '', price: 0, currency: '', promo: '', seoTitle: '', seoDescription: '', published: true, bg: B, c: P },
    { t: 'Digital templates', slug: 'digital-templates', kind: 'soon', d: 'Content calendars, briefs and planning tools.', long: '', image: '', imageAlt: '', file: '', cta: '', price: 0, currency: '', promo: '', seoTitle: '', seoDescription: '', published: true, bg: P, c: B },
    { t: 'Practical resources', slug: 'practical-resources', kind: 'soon', d: 'Checklists and frameworks from real projects.', long: '', image: '', imageAlt: '', file: '', cta: '', price: 0, currency: '', promo: '', seoTitle: '', seoDescription: '', published: true, bg: A, c: K },
    { t: 'Educational tools', slug: 'educational-tools', kind: 'soon', d: 'Exercises that support workshops and self-study.', long: '', image: '', imageAlt: '', file: '', cta: '', price: 0, currency: '', promo: '', seoTitle: '', seoDescription: '', published: true, bg: K, c: A },
    { t: 'Online courses', slug: 'online-courses', kind: 'soon', d: 'Structured digital marketing learning paths.', long: '', image: '', imageAlt: '', file: '', cta: '', price: 0, currency: '', promo: '', seoTitle: '', seoDescription: '', published: true, bg: S, c: B },
  ],

  leads: {
    formIntro: 'Leave your name and email address to receive the free PDF.',
    privacy: 'Your name and email are used only to send you this download and are never shared. You can ask for them to be deleted at any time by writing to me.',
    consentLabel: 'Yes, I would also like to hear about new free resources (optional).',
    success: 'Thank you! Your download is ready.',
    retentionMonths: 24,
    linkHours: 24,
    messagesRetentionMonths: 0,
  },

  // Figures supplied by Nourhane — keep them accurate before publishing.
  stats: [
    { value: '+70', label: 'Projects', description: '', href: '', visible: true },
    { value: '+50', label: 'Candidates', description: '', href: '', visible: true },
  ],

  tools: TOOLS,

  testimonials: [
    { kind: 'WRITTEN TESTIMONIAL', big: 'Words', bg: B, fg: '#FFFFFF', quote: '', name: '', meta: '[Role · Company]', image: '', audio: '' },
    { kind: 'REVIEW SCREENSHOT', big: 'Screens', bg: P, fg: K, quote: '', name: '', meta: '[Platform · Date]', image: '', audio: '' },
    { kind: 'AUDIO REVIEW', big: 'Voice', bg: A, fg: K, quote: '', name: '', meta: '[Role · Company]', image: '', audio: '' },
    { kind: 'PROJECT FEEDBACK', big: 'Projects', bg: K, fg: I, quote: '', name: '', meta: '[Project name]', image: '', audio: '' },
  ],

  contactPaths: [
    { id: 'work', kind: 'form', title: "Let's work together", text: 'For brands, entrepreneurs, and consulting inquiries.', icon: '', visible: true },
    { id: 'collab', kind: 'form', title: "Let's collaborate", text: 'For professional opportunities, employment, and creative partnerships.', icon: '', visible: true },
    { id: 'share', kind: 'form', title: "Let's share knowledge", text: 'For training, speaking, and educational collaborations.', icon: '', visible: true },
    BOOKING_CARD,
  ],

  // Meetings are booked on Nourhane's Calendly page (dates, availability, confirmation, emails and
  // calendar sync are handled by Calendly). The built-in calendar settings stay available as a fallback.
  booking: {
    provider: 'calendly', open: false, timezone: 'Africa/Tunis',
    hours: ['1', '2', '3', '4', '5'].map((day) => ({ day, start: '09:00', end: '17:00' })),
    interval: 30, buffer: 15, minNotice: 24, maxDays: 30, blocked: [], url: CALENDLY_URL,
    types: [{ name: 'Discovery call', duration: 30, url: CALENDLY_URL }],
    note: 'Choose a meeting type, a day and a time that suit you. Times are shown in your own time zone.',
  },

  seo: { indexing: true, workTitle: '', workDescription: '', ogImage: '', robotsExtra: '', structuredData: true, redirects: [] },

  storySettings: { dots: true, counter: true },

  ui: {},
  toolsSeed: 2,
  socialsSeed: 1,
  bookingSeed: 1,
  ads: { currency: 'TND', googleMonthly: 0, metaMonthly: 0 },

  projects: [
    {
      ...emptyCase, slug: 'vxn-moto-procap', n: '01', published: true, title: 'VXN Moto / PROCAP', mono: 'VXN',
      tags: ['Digital Marketing', 'AI-Assisted Content', 'E-commerce', 'Advertising'], cats: ['marketing', 'ecommerce', 'content'],
      short: 'Marketing & e-commerce growth',
      summary: 'Digital marketing, e-commerce, AI-assisted content and paid advertising brought together in one growth effort.',
      gallery: [
        { label: 'Campaign key visual', hint: 'main ad or campaign image', src: '' },
        { label: 'Social content', hint: 'post or story set', src: '' },
        { label: 'AI-assisted visuals', hint: 'generated product scenes', src: '' },
        { label: 'Store pages', hint: 'product or category page', src: '' },
        { label: 'Paid ads', hint: 'ad creatives across formats', src: '' },
        { label: 'Process & results', hint: 'dashboards, boards or before/after', src: '' },
      ],
      bg: K, fg: I,
      art: [
        { width: '56%', left: '44%', top: '-24%', borderRadius: '50%', background: B },
        { width: '16%', left: '12%', top: '46%', background: P, transform: 'rotate(-8deg)' },
      ],
    },
    {
      ...emptyCase, slug: 'novaseeds', n: '02', published: true, title: 'NovaSeeds', mono: 'Nova', logo: '/logos/novaseeds.png',
      tags: ['Brand Identity', 'Creative Direction', 'UX/UI'], cats: ['branding', 'ux'],
      short: 'Identity & landing page', summary: 'Identity, creative direction and landing page for an innovation hub in Gabès.',
      bg: A, fg: K,
      art: [
        { width: '34%', left: '12%', top: '12%', borderRadius: '50%', background: I },
        { width: '58%', right: '-10%', top: '22%', borderRadius: '50%', background: B },
      ],
    },
    {
      ...emptyCase, slug: 'dar-el-keswa', n: '03', published: true, title: 'Dar El Keswa', mono: 'Keswa',
      tags: ['E-commerce Management', 'Digital Marketing'], cats: ['ecommerce', 'marketing'],
      short: 'Online store, end to end', summary: 'Running an online store end to end, alongside the marketing that brings customers in.',
      bg: P, fg: K,
      art: [
        { width: '44%', left: '28%', top: '10%', borderRadius: '200px 200px 0 0', background: I },
        { width: '14%', right: '10%', top: '16%', borderRadius: '50%', background: B },
      ],
    },
    {
      ...emptyCase, slug: 'my-cover', n: '04', published: true, title: 'My Cover', mono: 'Cover',
      tags: ['Website', 'Social Media', 'E-commerce Campaigns'], cats: ['ecommerce', 'ux', 'marketing'],
      short: 'Website & social campaigns', summary: 'Website design, e-commerce setup and social media campaigns for an online brand.',
      bg: B, fg: '#FFFFFF',
      art: [
        { width: '40%', left: '46%', top: '6%', borderRadius: '50%', background: P },
        { width: '20%', right: '64%', top: '40%', background: K },
      ],
    },
    {
      ...emptyCase, slug: 'artisanscom', n: '05', published: true, title: 'ArtisansCom', mono: 'Artisans',
      tags: ['Content Strategy', 'Cultural Storytelling', 'Visual Communication'], cats: ['content', 'branding'],
      short: 'Cultural storytelling', summary: 'Content strategy and visual storytelling that give artisanal culture a contemporary voice.',
      bg: S, fg: K,
      art: [
        { width: '44%', left: '10%', top: '14%', background: A },
        { width: '40%', right: '8%', top: '30%', borderRadius: '50%', background: P },
      ],
    },
    {
      ...emptyCase, slug: 'ux-ui-project', n: '06', published: true, title: 'Selected UX/UI Project', mono: 'UX / UI',
      tags: ['User Experience', 'Interface Design'], cats: ['ux'],
      short: 'Digital product design', summary: 'From user research to interface: a digital product designed around real needs and flows.',
      bg: K2, fg: I,
      art: [
        { width: '18%', left: '62%', top: '20%', borderRadius: '14px', background: I },
        { width: '26%', right: '6%', top: '-20%', borderRadius: '50%', background: B },
      ],
    },
  ],
};
