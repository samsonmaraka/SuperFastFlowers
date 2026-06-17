import Link from 'next/link';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { formatUgx } from '@/lib/format';
import { getPrimaryProductImage } from '@/lib/product-images';
import { getExpectedProductSlug } from '@/lib/slug';
import { Product } from '@/lib/types';

export function ProductCard({ product }: { product: Product }) {
  const expectedSlug = getExpectedProductSlug(product);

  return (
    <article className="relative overflow-hidden rounded-xl border border-blush bg-white shadow-sm transition-shadow hover:shadow-md">
      <img src={getPrimaryProductImage(product)} alt={product.name} className="h-48 w-full object-cover" />
      <div className="space-y-2 p-4">
        <h3 className="text-lg font-semibold text-ink">{product.name}</h3>
        <p className="line-clamp-2 text-sm text-gray-600">{product.description}</p>
        <div className="flex items-start justify-between gap-3">
          <span className="font-semibold">UGX {formatUgx(product.price)}</span>
          <div className="relative z-20 shrink-0">
            <AddToCartButton product={product} showCheckoutShortcut checkoutShortcutLabel="Send gift now" />
          </div>
        </div>
      </div>
      <Link href={`/shop/${expectedSlug}`} className="absolute inset-0 z-10 focus:outline-none focus:ring-2 focus:ring-pink-700 focus:ring-offset-2" aria-label={`View ${product.name}`} />
    </article>
  );
}
