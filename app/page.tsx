import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { getSortedGiftCategories } from '@/lib/categories';
import type { Metadata } from 'next';
import { listProducts } from '@/lib/products-repo';
import { buildSiteUrl } from '@/lib/site-url';
import { itemListJsonLd, JsonLd, STORE_DESCRIPTION, STORE_LOGO_PATH, STORE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Sendagift UG | Send Gifts, Cakes, Flowers & Hampers in Uganda',
  description: STORE_DESCRIPTION,
  alternates: { canonical: 'https://www.sendagift.ug' }
};

export default async function HomePage({
  searchParams
}: {
  searchParams: { q?: string; category?: string };
}) {
  const categories = getSortedGiftCategories();
  const activeCategory = searchParams.category || '';
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
      <section>
        <div className="mb-6 max-w-3xl space-y-2">
          <h1 className="text-3xl font-semibold">Send gifts, cakes, flowers and hampers in Uganda</h1>
          <p className="text-gray-700">Order thoughtful gifts online for delivery in Uganda, including Kampala where available. Explore cakes, flowers, cupcakes, hampers and celebration gifts for birthdays, baby showers, get well wishes, sympathy, love and everyday celebrations.</p>
        </div>
        <nav className="mb-5">
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
              const href = q ? `/?category=${category.slug}&q=${encodeURIComponent(q)}` : `/?category=${category.slug}`;
              const isActive = activeCategory === category.slug;

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
      </section>
    </div>
  );
}
