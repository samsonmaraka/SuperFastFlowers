import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { categoryPath, getGiftCategoryBySlug, getSortedGiftCategories, normalizeCategorySlug } from '@/lib/categories';
import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { listProducts } from '@/lib/products-repo';
import { itemListJsonLd, JsonLd } from '@/lib/seo';

const shopTitle = 'Shop Gifts, Cakes, Flowers & Hampers in Uganda';
const shopDescription = 'Shop cakes, flowers, cupcakes, hampers and thoughtful gifts in Uganda for birthdays, baby showers, get well, sympathy and celebrations.';
const shopCanonicalUrl = '/shop';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export function generateMetadata({ searchParams }: { searchParams: { q?: string; category?: string } }): Metadata {
  const hasSearchQuery = Boolean(searchParams.q);

  return {
    title: shopTitle,
    description: shopDescription,
    alternates: { canonical: shopCanonicalUrl },
    robots: hasSearchQuery ? { index: false, follow: true } : undefined,
    openGraph: {
      title: shopTitle,
      description: shopDescription,
      url: shopCanonicalUrl,
      siteName: 'Sendagift UG',
      type: 'website'
    },
    twitter: {
      card: 'summary',
      title: shopTitle,
      description: shopDescription
    }
  };
}

export default async function ShopPage({
  searchParams
}: {
  searchParams: { q?: string; category?: string };
}) {
  const requestedCategory = searchParams.category ? getGiftCategoryBySlug(searchParams.category) : null;

  if (requestedCategory && !searchParams.q) {
    permanentRedirect(categoryPath(requestedCategory));
  }

  const products = await listProducts({ q: searchParams.q, category: searchParams.category });
  const categories = getSortedGiftCategories();
  const activeCategory = searchParams.category ? normalizeCategorySlug(searchParams.category) : '';
  const q = searchParams.q || '';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <JsonLd data={itemListJsonLd(products)} />
      <nav className="mb-5">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          <Link
            href={q ? `/shop?q=${encodeURIComponent(q)}` : '/shop'}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${
              activeCategory === '' ? 'border-ink bg-ink text-white' : 'border-gray-300 bg-white text-ink hover:border-ink/40'
            }`}
          >
            All gifts
          </Link>
          {categories.map((category) => {
            const href = categoryPath(category);
            const isActive = activeCategory === normalizeCategorySlug(category.slug);

            return (
              <Link
                key={category.slug}
                href={href}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${
                  isActive ? 'border-ink bg-ink text-white' : 'border-gray-300 bg-white text-ink hover:border-ink/40'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {category.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
