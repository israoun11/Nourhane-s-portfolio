// Layout settings that belong to the design (not editable content).

// Home grid layout for projects 2, 3, 4… (project 1 is featured). Repeats if there are more.
export const homeGridLayout = [
  { flex: '1 1 340px', ratio: '4 / 5', offset: '0px' },
  { flex: '1.4 1 440px', ratio: '16 / 11', offset: 'clamp(0px, 5vw, 80px)' },
  { flex: '1.4 1 440px', ratio: '16 / 11', offset: '0px' },
  { flex: '1 1 340px', ratio: '4 / 5', offset: 'clamp(0px, 4vw, 64px)' },
  { flex: '1 1 100%', ratio: '21 / 8', offset: '0px' },
];

// Portfolio filters (labels: pf.f.<id> in src/i18n/site/<lang>.js)
export const filters = ['all', 'marketing', 'branding', 'ecommerce', 'content', 'ux'];

// Frames shown on a project page while it has no gallery images yet
// (labels: gal.1 … gal.6 and hints gal.1h … gal.6h in src/i18n/site/<lang>.js).
export const defaultGalleryKeys = [1, 2, 3, 4, 5, 6];
