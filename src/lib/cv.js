/**
 * The CV visitors get — the same everywhere (footer, portfolio page): the PDF uploaded in the
 * dashboard (Files → CV), or else the older CV link. Returns the link attributes, or null.
 */
export function cvLink(site = {}) {
  const href = site.cvFile || site.cv || '';
  if (!href) return null;
  return { href, target: '_blank', rel: 'noreferrer', ...(site.cvFile ? { download: '' } : {}) };
}
