import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { getSortedGiftCategories } from '@/lib/categories';
import { listProducts } from '@/lib/products-repo';

export default async function HomePage({
  searchParams
}: {
  searchParams: { q?: string; category?: string };
}) {
  const categories = getSortedGiftCategories();
  const activeCategory = searchParams.category || '';
  const q = searchParams.q || '';
  const products = await listProducts({ q: searchParams.q, category: searchParams.category });

  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-10">
      <section className="rounded-2xl bg-gradient-to-r from-rose to-white p-10">
        <p className="text-sm uppercase tracking-[0.2em] text-pink-700">Sendagift UG Curated Collection</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight">Thoughtful gifts for life&apos;s most meaningful moments.</h1>
        <p className="mt-3 max-w-2xl text-gray-700">Browse premium gift sets designed for birthdays, thank-yous, milestones, and celebrations.</p>
      </section>


      <section>
        <h2 className="mb-6 text-3xl font-semibold">Shop gifts</h2>

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
      </section>
    </div>
  );
}
