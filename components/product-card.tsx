import Link from 'next/link';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { formatUgx } from '@/lib/format';
import { getPrimaryProductImage } from '@/lib/product-images';
import { ProductImage } from '@/components/product-image';
import { getExpectedProductSlug } from '@/lib/slug';
import { productRequiresFlavour } from '@/lib/flavours';
import { Product } from '@/lib/types';

export function ProductCard({ product }: { product: Product }) {
  const expectedSlug = getExpectedProductSlug(product);
  // A flavoured product cannot be added from the grid, because the grid has no
  // room to ask which flavour. Send the customer to the picker instead.
  const requiresFlavour = productRequiresFlavour(product);

  return (
    <article className="relative overflow-hidden rounded-xl border border-blush bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative h-48 w-full">
        <ProductImage
          src={getPrimaryProductImage(product)}
          alt={product.name}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="space-y-2 p-4">
        <h3 className="text-lg font-semibold text-ink">{product.name}</h3>
        <p className="line-clamp-2 text-sm text-gray-600">{product.description}</p>
        <div className="flex items-start justify-between gap-3">
          <span className="font-semibold">UGX {formatUgx(product.price)}</span>
          <div className="relative z-20 shrink-0">
            {requiresFlavour ? (
              <Link
                href={`/shop/${expectedSlug}`}
                className="inline-flex items-center gap-1 rounded-md border border-pink-700 px-3 py-2 text-sm font-semibold text-pink-700 transition hover:bg-pink-700 hover:text-white"
                aria-label={`Choose a flavour for ${product.name}`}
              >
                Choose flavour ›
              </Link>
            ) : (
              <AddToCartButton product={product} showCheckoutShortcut checkoutShortcutLabel="Send gift now" />
            )}
          </div>
        </div>
      </div>
      <Link href={`/shop/${expectedSlug}`} className="absolute inset-0 z-10 focus:outline-none focus:ring-2 focus:ring-pink-700 focus:ring-offset-2" aria-label={`View ${product.name}`} />
    </article>
  );
}
