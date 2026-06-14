'use client';

import { useEffect, useState } from 'react';
import { readCart, writeCart } from '@/lib/cart-storage';
import { Product } from '@/lib/types';

function getProductQuantity(productId: string) {
  return readCart().find((item) => item.productId === productId)?.quantity ?? 0;
}

function dispatchCartUpdate() {
  window.dispatchEvent(new Event('giftora-cart-updated'));
}

export function AddToCartButton({ product }: { product: Product }) {
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

  const updateQuantity = (nextQuantity: number) => {
    const cart = readCart();
    const existingItem = cart.find((item) => item.productId === product.id);

    const nextCart = existingItem
      ? nextQuantity > 0
        ? cart.map((item) =>
            item.productId === product.id ? { ...item, quantity: nextQuantity } : item
          )
        : cart.filter((item) => item.productId !== product.id)
      : nextQuantity > 0
        ? [
            ...cart,
            {
              productId: product.id,
              name: product.name,
              price: product.price,
              quantity: nextQuantity,
              preparationDays: product.preparationDays
            }
          ]
        : cart;

    writeCart(nextCart);
    setQuantityInCart(nextQuantity);
    dispatchCartUpdate();
  };

  const onAdd = () => updateQuantity(quantityInCart + 1);
  const onRemove = () => updateQuantity(Math.max(0, quantityInCart - 1));

  if (quantityInCart > 0) {
    return (
      <div
        className="inline-flex items-center gap-4 text-sm font-medium text-ink"
        role="group"
        aria-label={`${product.name} quantity in cart`}
      >
        <button
          onClick={onRemove}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-ink text-lg leading-none text-white shadow-lg shadow-ink/20 transition hover:-translate-y-0.5 hover:bg-pink-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-pink-700/40 focus:ring-offset-2"
          type="button"
          aria-label={`Remove one ${product.name} from cart`}
        >
          −
        </button>
        <span className="min-w-4 text-center" aria-live="polite" aria-atomic="true">
          {quantityInCart}
        </span>
        <button
          onClick={onAdd}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-ink text-lg leading-none text-white shadow-lg shadow-ink/20 transition hover:-translate-y-0.5 hover:bg-pink-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-pink-700/40 focus:ring-offset-2"
          type="button"
          aria-label={`Add one more ${product.name} to cart`}
        >
          +
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onAdd}
      className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-black"
      type="button"
      aria-label={`Add ${product.name} to cart`}
    >
      Add to cart
    </button>
  );
}
