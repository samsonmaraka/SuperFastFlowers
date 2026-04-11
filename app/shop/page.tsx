import { ProductCard } from '@/components/product-card';
import { listProducts } from '@/lib/products-repo';

export default async function ShopPage({
  searchParams
}: {
  searchParams: { q?: string; category?: string };
}) {
  const products = await listProducts({ q: searchParams.q, category: searchParams.category });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Shop gifts</h1>
      <form className="mb-6 grid gap-3 sm:grid-cols-3">
        <input name="q" defaultValue={searchParams.q} placeholder="Search gifts" className="rounded border p-2" />
        <input name="category" defaultValue={searchParams.category} placeholder="Category" className="rounded border p-2" />
        <button className="rounded bg-ink p-2 text-white">Filter</button>
      </form>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
