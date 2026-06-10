import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { getSortedGiftCategories } from '@/lib/categories';
import { listProducts } from '@/lib/products-repo';

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

      <form className="mb-6">
        {activeCategory ? <input type="hidden" name="category" value={activeCategory} /> : null}
        <div className="flex gap-3">
          <input name="q" defaultValue={searchParams.q} placeholder="Search gifts" className="w-full rounded border p-2" />
          <button className="rounded bg-ink px-4 py-2 text-white">Search</button>
        </div>
      </form>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
