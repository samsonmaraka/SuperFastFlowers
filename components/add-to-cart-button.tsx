'use client';

import { Product } from '@/lib/types';

export function AddToCartButton({ product }: { product: Product }) {
  const onAdd = () => {
    alert(`${product.name} will be available to add soon.`);
  };

  return (
    <button
      onClick={onAdd}
      className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-black"
      type="button"
    >
      Add to cart
    </button>
  );
}
