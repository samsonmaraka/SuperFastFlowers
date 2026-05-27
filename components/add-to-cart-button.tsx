'use client';

import { useEffect, useState } from 'react';
import { readCart, writeCart } from '@/lib/cart-storage';
import { Product } from '@/lib/types';

function getProductQuantity(productId: string) {
  return readCart().find((item) => item.productId === productId)?.quantity ?? 0;
}

export function AddToCartButton({ product }: { product: Product }) {
  const [justAdded, setJustAdded] = useState(false);
  const [quantityInCart, setQuantityInCart] = useState(0);

  useEffect(() => {
    const syncQuantity = () => setQuantityInCart(getProductQuantity(product.id));

    syncQuantity();
    window.addEventListener('giftora-cart-updated', syncQuantity);
    window.addEventListener('storage', syncQuantity);

    return () => {
      window.removeEventListener('giftora-cart-updated', syncQuantity);
      window.removeEventListener('storage', syncQuantity);
    };
  }, [product.id]);

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
    setJustAdded(true);
    setQuantityInCart(nextCart.find((item) => item.productId === product.id)?.quantity ?? 0);
    window.dispatchEvent(new Event('giftora-cart-updated'));
    window.setTimeout(() => setJustAdded(false), 1400);
  };

  const buttonLabel = justAdded
    ? 'Added ✓'
    : quantityInCart > 0
      ? quantityInCart > 1
        ? `In cart (${quantityInCart})`
        : 'In cart'
      : 'Add to cart';

  return (
    <button
      onClick={onAdd}
      className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-black"
      type="button"
      aria-label={`${product.name} ${buttonLabel}`}
    >
      {buttonLabel}
    </button>
  );
}
