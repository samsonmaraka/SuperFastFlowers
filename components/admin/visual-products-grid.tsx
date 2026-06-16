import Image from 'next/image';
import Link from 'next/link';
import { formatUgx } from '@/lib/format';
import { getPrimaryProductImage } from '@/lib/product-images';
import type { Product } from '@/lib/types';
import { ProductStatusBadge } from './status-badges';

function categoryLabel(product: Product) {
  const categories = product.categories?.filter(Boolean) || [];
  return categories.length > 0 ? categories.join(', ') : product.category || 'Uncategorized';
}

function vendorLabel(product: Product) {
  return product.vendorName || product.vendorContactPerson || 'No vendor assigned';
}

export function VisualProductsGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-white p-8 text-center text-gray-600">
        No products are available for this visual editing view.
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <article key={product.id} className="overflow-hidden rounded-xl border border-blush bg-white shadow-sm transition-shadow hover:shadow-md">
          <div className="relative">
            <Image src={getPrimaryProductImage(product)} alt={product.name} width={640} height={416} unoptimized className="h-52 w-full object-cover" />
            <div className="absolute left-3 top-3">
              <ProductStatusBadge status={product.status} />
            </div>
          </div>
          <div className="space-y-3 p-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-pink-700">{categoryLabel(product)}</p>
              <h3 className="text-lg font-semibold text-ink">{product.name}</h3>
              <p className="line-clamp-2 text-sm text-gray-600">{product.description}</p>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">UGX {formatUgx(product.price)}</p>
                <p className="text-xs text-gray-500">{vendorLabel(product)}</p>
              </div>
              <Link href={`/admin/products?edit=${encodeURIComponent(product.id)}`} className="shrink-0 rounded bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-pink-700">
                Edit
              </Link>
            </div>
            <Link href={`/shop/${product.slug}`} className="inline-flex text-sm font-semibold text-blue-700 hover:text-blue-900">
              View public page
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
