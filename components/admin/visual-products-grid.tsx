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
            {product.referenceImageUrls?.[0] ? (
              <a
                href={product.referenceImageUrls[0]}
                target="_blank"
                rel="noopener noreferrer"
                title="Open reference image (internal only)"
                className="absolute bottom-3 right-3 block overflow-hidden rounded-lg border-2 border-white bg-white shadow-md"
              >
                <Image src={product.referenceImageUrls[0]} alt={`Reference image for ${product.name}`} width={96} height={96} unoptimized className="h-20 w-20 object-cover" />
                <span className="block bg-amber-200 px-1 text-center text-[10px] font-semibold uppercase tracking-wide text-amber-900">Reference</span>
              </a>
            ) : null}
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
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
              <Link href={`/shop/${product.slug}`} className="text-blue-700 hover:text-blue-900">
                View public page
              </Link>
              {product.referenceImageUrls?.length ? (
                product.referenceImageUrls.map((src, index) => (
                  <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:text-amber-900">
                    Reference image{product.referenceImageUrls!.length > 1 ? ` ${index + 1}` : ''}
                  </a>
                ))
              ) : (
                <span className="font-normal text-gray-400">No reference image</span>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
