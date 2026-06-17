export function slugifyProductName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || 'product';
}

export function buildProductSlug(name: string, uniqueSuffix?: string | number) {
  const base = slugifyProductName(name);
  const suffix = uniqueSuffix === undefined || uniqueSuffix === null ? '' : String(uniqueSuffix).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  return suffix ? `${base}-${suffix}` : base;
}

export function slugMatchesProductName(slug: string, name: string) {
  return slug === slugifyProductName(name);
}
