import Link from 'next/link';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { formatUgx } from '@/lib/format';
import { Product } from '@/lib/types';

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="overflow-hidden rounded-xl border border-blush bg-white shadow-sm">
      <img src={product.imageUrls[0]} alt={product.name} className="h-48 w-full object-cover" />
      <div className="space-y-2 p-4">
        <p className="text-xs uppercase tracking-wide text-pink-700">{product.category}</p>
        <h3 className="text-lg font-semibold">
          <Link href={`/shop/${product.slug}`} className="text-ink transition-colors hover:text-pink-700 hover:underline">
            {product.name}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-gray-600">{product.description}</p>
        {(product.tags ?? []).length ? (
          <div className="flex flex-wrap gap-1">
            {(product.tags ?? []).map((tag) => (
              <span key={tag} className="rounded-full bg-pink-50 px-2 py-0.5 text-xs text-pink-700">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold">UGX {formatUgx(product.price)}</span>
          <AddToCartButton product={product} />
        </div>
      </div>
    </article>
  );
}
