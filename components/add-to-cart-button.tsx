'use client';

import { useState } from 'react';
import { readCart, writeCart } from '@/lib/cart-storage';
import { Product } from '@/lib/types';

export function AddToCartButton({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);

  const onAdd = () => {
    const cart = readCart();
    const existingItem = cart.find((item) => item.productId === product.id);

    const nextCart = existingItem
      ? cart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      : [...cart, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];

    writeCart(nextCart);
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
