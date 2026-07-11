import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { categoryPath, getSortedGiftCategories, normalizeCategorySlug } from '@/lib/categories';
import type { Metadata } from 'next';
import { listProducts } from '@/lib/products-repo';
import { buildSiteUrl } from '@/lib/site-url';
import { itemListJsonLd, JsonLd, STORE_DESCRIPTION, STORE_NAME, storeJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Sendagift UG | Send Gifts in Uganda',
  description: STORE_DESCRIPTION,
  alternates: { canonical: 'https://www.sendagift.ug' }
};

export default async function HomePage({
  searchParams
}: {
  searchParams: { q?: string; category?: string };
}) {
  const categories = getSortedGiftCategories();
  const activeCategory = searchParams.category ? normalizeCategorySlug(searchParams.category) : '';
  const q = searchParams.q || '';
  const products = await listProducts({ q: searchParams.q, category: searchParams.category });

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: STORE_NAME,
    url: buildSiteUrl('/'),
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://www.sendagift.ug/shop?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <JsonLd data={[storeJsonLd(), websiteJsonLd, itemListJsonLd(products)]} />

      <header className="mb-4 max-w-3xl">
        <h1 className="text-2xl font-semibold leading-tight text-ink md:text-3xl">
          Send Gifts in Uganda — Cakes, Flowers, Cupcakes and Hampers Delivered
        </h1>
        <p className="mt-2 text-gray-700">
          Order cakes, fresh flowers, cupcakes and gift hampers — delivered anywhere in Uganda.
        </p>
      </header>

      <section>
        <nav className="mb-4" aria-label="Gift categories">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            <Link
              href={q ? `/?q=${encodeURIComponent(q)}` : '/'}
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

        <h2 className={q ? 'mb-4 text-2xl font-semibold text-ink' : 'sr-only'}>
          {q ? `Gifts matching “${q}”` : 'Popular gifts to send today'}
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="mt-12 max-w-3xl border-t border-blush/80 pt-6">
        <h2 className="text-xl font-semibold text-ink">Gift delivery anywhere in Uganda</h2>
        <p className="mt-3 text-gray-700">
          Sendagift UG makes it easy to send a gift anywhere in Uganda. Order online and surprise someone with cakes,
          fresh flowers, cupcakes and gift hampers for birthdays, anniversaries, baby showers, congratulations and every
          special occasion.
        </p>
      </section>
    </div>
  );
}
