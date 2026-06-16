import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { getSortedGiftCategories } from '@/lib/categories';
import type { Metadata } from 'next';
import { listProducts } from '@/lib/products-repo';
import { itemListJsonLd, JsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Shop Gifts, Cakes, Flowers & Hampers in Uganda',
  description: 'Shop cakes, flowers, cupcakes, hampers and thoughtful gifts in Uganda for birthdays, baby showers, get well, sympathy and celebrations.',
  alternates: { canonical: '/shop' }
};

export default async function ShopPage({
  searchParams
}: {
  searchParams: { q?: string; category?: string };
}) {
  const products = await listProducts({ q: searchParams.q, category: searchParams.category });
  const categories = getSortedGiftCategories();
  const activeCategory = searchParams.category || '';
  const q = searchParams.q || '';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <JsonLd data={itemListJsonLd(products)} />
      <div className="mb-6 max-w-3xl space-y-2">
        <h1 className="text-3xl font-semibold">Shop gifts in Uganda</h1>
        <p className="text-gray-700">Find cakes, flowers, cupcakes, hampers and gift ideas for birthdays, baby showers, get well wishes, sympathy and celebrations, with Kampala delivery where available.</p>
      </div>

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
            const href = q ? `/shop?category=${category.slug}&q=${encodeURIComponent(q)}` : `/shop?category=${category.slug}`;
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
    </div>
  );
}
