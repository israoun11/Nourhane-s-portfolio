// Layout settings that belong to the design (not editable content).

// Home grid layout for projects 2, 3, 4… (project 1 is featured). Repeats if there are more.
export const homeGridLayout = [
  { flex: '1 1 340px', ratio: '4 / 5', offset: '0px' },
  { flex: '1.4 1 440px', ratio: '16 / 11', offset: 'clamp(0px, 5vw, 80px)' },
  { flex: '1.4 1 440px', ratio: '16 / 11', offset: '0px' },
  { flex: '1 1 340px', ratio: '4 / 5', offset: 'clamp(0px, 4vw, 64px)' },
  { flex: '1 1 100%', ratio: '21 / 8', offset: '0px' },
];

export const filters = [
  { id: 'all', label: 'All' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'branding', label: 'Branding' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'content', label: 'Content' },
  { id: 'ux', label: 'UX/UI' },
];

export const defaultGallery = [
  { label: 'Key visual', hint: 'the strongest image of the project', src: '' },
  { label: 'Detail', hint: 'a close-up or supporting visual', src: '' },
  { label: 'Process', hint: 'sketches, boards or strategy', src: '' },
  { label: 'Application', hint: 'the work in context', src: '' },
  { label: 'Variation', hint: 'another format or touchpoint', src: '' },
  { label: 'Outcome', hint: 'results, before/after or launch', src: '' },
];
