export const DEFAULT_PUBLIC_SITE_URL = 'https://www.sendagift.ug';

export function normalizeSiteUrl(value?: string) {
  const trimmedValue = value?.trim();
  return (trimmedValue || DEFAULT_PUBLIC_SITE_URL).replace(/\/+$/, '');
}

export function getPublicSiteUrl() {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}

export function buildSiteUrl(path = '/') {
  return new URL(path, `${getPublicSiteUrl()}/`).toString();
}
