import Link from 'next/link';
import { Product } from '@/lib/types';

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="overflow-hidden rounded-xl border border-blush bg-white shadow-sm">
      <img src={product.imageUrls[0]} alt={product.name} className="h-48 w-full object-cover" />
      <div className="space-y-2 p-4">
        <p className="text-xs uppercase tracking-wide text-pink-700">{product.category}</p>
        <h3 className="text-lg font-semibold">
          <Link href={`/shop/${product.slug}`} className="text-blue-600 hover:underline">
            {product.name}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-gray-600">{product.description}</p>
        <div className="flex items-center justify-between">
          <span className="font-semibold">${product.price}</span>
        </div>
      </div>
    </article>
  );
}
