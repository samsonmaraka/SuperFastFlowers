import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/shop', '/shop/*'],
      disallow: ['/admin', '/admin/*', '/cart', '/checkout', '/account', '/api/*']
    },
    sitemap: 'https://sendagift.ug/sitemap.xml'
  };
}
