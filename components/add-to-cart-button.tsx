'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { buildCartLineId, readCart, writeCart } from '@/lib/cart-storage';
import type { FlavourId } from '@/lib/flavours';
import { Product } from '@/lib/types';

function getLineQuantity(lineId: string) {
  return readCart().find((item) => item.lineId === lineId)?.quantity ?? 0;
}

function dispatchCartUpdate() {
  window.dispatchEvent(new Event('giftora-cart-updated'));
}

type AddToCartButtonProps = {
  product: Product;
  showCheckoutShortcut?: boolean;
  checkoutShortcutLabel?: string;
  flavour?: FlavourId | null;
  requiresFlavour?: boolean;
};

export function AddToCartButton({
  product,
  showCheckoutShortcut = false,
  checkoutShortcutLabel = 'Send gift now',
  flavour = null,
  requiresFlavour = false
}: AddToCartButtonProps) {
  const [quantityInCart, setQuantityInCart] = useState(0);
  const isBlockedOnFlavour = requiresFlavour && !flavour;
  const lineId = buildCartLineId(product.id, flavour);
  const lineLabel = flavour ? `${product.name} (${flavour})` : product.name;

  useEffect(() => {
    const syncQuantity = () => setQuantityInCart(getLineQuantity(lineId));

    syncQuantity();
    window.addEventListener('giftora-cart-updated', syncQuantity);
    window.addEventListener('storage', syncQuantity);

    return () => {
      window.removeEventListener('giftora-cart-updated', syncQuantity);
      window.removeEventListener('storage', syncQuantity);
    };
  }, [lineId]);

  const updateQuantity = (nextQuantity: number) => {
    if (isBlockedOnFlavour) return;

    const cart = readCart();
    const existingItem = cart.find((item) => item.lineId === lineId);

    const nextCart = existingItem
      ? nextQuantity > 0
        ? cart.map((item) => (item.lineId === lineId ? { ...item, quantity: nextQuantity } : item))
        : cart.filter((item) => item.lineId !== lineId)
      : nextQuantity > 0
        ? [
            ...cart,
            {
              lineId,
              productId: product.id,
              ...(flavour ? { flavour } : {}),
              name: product.name,
              price: product.price,
              quantity: nextQuantity,
              preparationDays: product.preparationDays,
              vendorId: product.vendorId
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
      <div className="flex flex-col items-stretch gap-2 text-sm font-medium text-ink">
        <div
          className="inline-flex items-center justify-center gap-4"
          role="group"
          aria-label={`${lineLabel} quantity in cart`}
        >
          <button
            onClick={onRemove}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-ink text-lg leading-none text-white shadow-lg shadow-ink/20 transition hover:-translate-y-0.5 hover:bg-pink-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-pink-700/40 focus:ring-offset-2"
            type="button"
            aria-label={`Remove one ${lineLabel} from cart`}
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
            aria-label={`Add one more ${lineLabel} to cart`}
          >
            +
          </button>
        </div>
        {showCheckoutShortcut ? (
          <Link
            href="/checkout"
            className="inline-flex items-center justify-center rounded-md border border-ink/15 bg-white px-3 py-2 text-center text-sm font-medium text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-pink-700 hover:text-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-700/40 focus:ring-offset-2"
            aria-label={`${checkoutShortcutLabel} for ${product.name}`}
          >
            {checkoutShortcutLabel}
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <button
      onClick={onAdd}
      disabled={isBlockedOnFlavour}
      className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-400"
      type="button"
      aria-label={isBlockedOnFlavour ? `Choose a flavour before adding ${product.name} to cart` : `Add ${lineLabel} to cart`}
      title={isBlockedOnFlavour ? 'Choose a flavour first' : undefined}
    >
      Add to cart
    </button>
  );
}
