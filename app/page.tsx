import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { categoryPath, getSortedGiftCategories, normalizeCategorySlug } from '@/lib/categories';
import type { Metadata } from 'next';
import { listProducts } from '@/lib/products-repo';
import { buildSiteUrl } from '@/lib/site-url';
import { itemListJsonLd, JsonLd, STORE_DESCRIPTION, STORE_LOGO_PATH, STORE_NAME } from '@/lib/seo';

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

  const storeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: STORE_NAME,
    url: buildSiteUrl('/'),
    logo: buildSiteUrl(STORE_LOGO_PATH),
    description: STORE_DESCRIPTION,
    areaServed: { '@type': 'Country', name: 'Uganda' }
  };
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <JsonLd data={[storeJsonLd, websiteJsonLd, itemListJsonLd(products)]} />

      <section className="mb-10 rounded-2xl border border-blush/80 bg-gradient-to-r from-rose via-blush to-white px-6 py-10 md:px-10 md:py-12">
        <h1 className="max-w-2xl text-3xl font-semibold leading-tight text-ink md:text-4xl">
          Send Gifts in Uganda — Cakes, Flowers, Cupcakes and Hampers Delivered
        </h1>
        <p className="mt-4 max-w-2xl text-gray-700">
          Sendagift UG makes it easy to send a gift anywhere in Uganda. Order online and surprise someone with cakes,
          fresh flowers, cupcakes and gift hampers for birthdays, anniversaries, baby showers, congratulations and every
          special occasion.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/shop" className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-pink-700">
            Browse all gifts
          </Link>
          {categories.slice(0, 2).map((category) => (
            <Link
              key={category.slug}
              href={categoryPath(category)}
              className="rounded-full border border-ink/20 bg-white/80 px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink/40 hover:text-pink-700"
            >
              {category.label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold text-ink">Shop gifts by occasion</h2>
        <nav className="mb-5" aria-label="Gift categories">
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

        <h2 className="mb-4 mt-8 text-2xl font-semibold text-ink">
          {q ? `Gifts matching “${q}”` : 'Popular gifts to send today'}
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
