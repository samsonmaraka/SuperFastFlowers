'use client';

import { Product } from '@/lib/types';

export function AddToCartButton({ product }: { product: Product }) {
  const onAdd = () => {
    const raw = localStorage.getItem('giftora-cart');
    const cart = raw ? JSON.parse(raw) : [];
    const existing = cart.find((item: { productId: string }) => item.productId === product.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ productId: product.id, name: product.name, price: product.price, quantity: 1 });
    }

    localStorage.setItem('giftora-cart', JSON.stringify(cart));
    alert('Added to cart');
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
