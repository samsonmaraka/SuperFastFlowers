'use client';

import { useState } from 'react';
import { Product } from '@/lib/types';

type CartItem = { productId: string; name: string; price: number; quantity: number };

const CART_KEY = 'giftora-cart';

function getStoredCart(): CartItem[] {
  const raw = localStorage.getItem(CART_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function AddToCartButton({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);

  const onAdd = () => {
    const cart = getStoredCart();
    const existingItem = cart.find((item) => item.productId === product.id);

    const nextCart = existingItem
      ? cart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      : [...cart, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];

    localStorage.setItem(CART_KEY, JSON.stringify(nextCart));
    setAdded(true);
    window.dispatchEvent(new Event('giftora-cart-updated'));
    window.setTimeout(() => setAdded(false), 1400);
  };

  return (
    <button
      onClick={onAdd}
      className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-black"
      type="button"
    >
      {added ? 'Added!' : 'Add to cart'}
    </button>
  );
}
