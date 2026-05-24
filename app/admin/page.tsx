import { AdminProductsClient } from '@/components/admin-products-client';
import { listProducts } from '@/lib/products-repo';

export default async function AdminPage() {
  const products = await listProducts();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Admin portal</h1>
      <AdminProductsClient initial={products} />
    </div>
  );
}
