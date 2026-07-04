import type { MetadataRoute } from 'next';
import { categoryPath, getSortedGiftCategories } from '@/lib/categories';
import { listProducts } from '@/lib/products-repo';
import { buildSiteUrl } from '@/lib/site-url';
import { productPath } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const products = await listProducts();
  const categories = getSortedGiftCategories();

  return [
    {
      url: buildSiteUrl('/'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1
    },
    {
      url: buildSiteUrl('/shop'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9
    },
    ...categories.map((category) => ({
      url: buildSiteUrl(categoryPath(category)),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8
    })),
    ...products.map((product) => ({
      url: buildSiteUrl(productPath(product)),
      lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.7
    })),
    {
      url: buildSiteUrl('/about'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4
    },
    {
      url: buildSiteUrl('/contact'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4
    }
  ];
}
