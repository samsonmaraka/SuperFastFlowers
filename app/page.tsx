import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { listProducts } from '@/lib/products-repo';

export default async function HomePage() {
  const featured = await listProducts({ featured: true });

  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-10">
      <section className="rounded-2xl bg-gradient-to-r from-rose to-white p-10">
        <p className="text-sm uppercase tracking-[0.2em] text-pink-700">Giftora Curated Collection</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight">Thoughtful gifts for life&apos;s most meaningful moments.</h1>
        <p className="mt-3 max-w-2xl text-gray-700">Browse premium gift sets designed for birthdays, thank-yous, milestones, and celebrations.</p>
        <div className="mt-6 flex gap-3">
          <Link href="/shop" className="rounded bg-ink px-5 py-3 text-sm font-medium text-white">Shop now</Link>
          <Link href="/contact" className="rounded border border-ink px-5 py-3 text-sm font-medium">Custom request</Link>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Featured gifts</h2>
          <Link href="/shop" className="text-sm text-pink-700">View all</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
