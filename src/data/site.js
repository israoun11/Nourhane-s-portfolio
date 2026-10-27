// Navigation (routes are part of the site structure, not editable content).
// All texts, images, links and projects are edited in the admin dashboard (/admin).

export const nav = [
  { n: '01', label: 'Home', href: '/', id: '' },
  { n: '02', label: 'Work', href: '/#work', id: 'work' },
  { n: '03', label: 'My Story', href: '/#story', id: 'story' },
  { n: '04', label: 'Expertise', href: '/#expertise', id: 'expertise' },
  { n: '05', label: 'Insights', href: '/#insights', id: 'insights' },
  { n: '06', label: 'Contact', href: '/#contact', id: 'contact' },
];

// Contact form delivery (Formspree or similar), set in .env:  VITE_FORM_ENDPOINT=https://formspree.io/f/xxxx
export const formEndpoint = import.meta.env.VITE_FORM_ENDPOINT || '';
