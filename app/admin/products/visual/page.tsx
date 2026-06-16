import Link from 'next/link';
import { VisualProductsGrid } from '@/components/admin/visual-products-grid';
import { requireAnyAdminAccess } from '@/lib/admin-auth';
import { listProducts } from '@/lib/products-repo';
import { filterProductsForAdmin } from '@/lib/vendor-permissions';

export default async function VisualProductsPage() {
  const access = await requireAnyAdminAccess();
  const products = filterProductsForAdmin(access, await listProducts({ includeInactive: true }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-pink-700">Visual product editing</p>
          <h1 className="text-2xl font-semibold text-ink">Storefront-style product grid</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-600">
            Browse products the way shoppers see them, then use each card&apos;s edit action to update the item in the admin product form.
          </p>
        </div>
        <Link href="/admin/products" className="rounded border px-4 py-2 text-sm font-semibold text-ink hover:bg-cream">
          Table editor
        </Link>
      </div>

      <VisualProductsGrid products={products} />
    </div>
  );
}
