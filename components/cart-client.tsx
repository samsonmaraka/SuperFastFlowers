'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { formatUgx } from '@/lib/format';
import { CartItem, readCart, writeCart } from '@/lib/cart-storage';
import { getFlavourLabel } from '@/lib/flavours';
import { DEFAULT_PREPARATION_DAYS, formatDeliveryDateLabel, getMinimumDeliveryDate } from '@/lib/preparation-days';

const TEMPLATE_PRODUCT_NAME = 'Celebration Bloom Vase';

export function CartClient() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const syncFromStorage = () => {
      const storedCart = readCart();
      const cleanCart = storedCart.filter((item) => item?.name !== TEMPLATE_PRODUCT_NAME);
      setItems(cleanCart);

      if (cleanCart.length !== storedCart.length) {
        writeCart(cleanCart);
      }
    };

    syncFromStorage();
    window.addEventListener('giftora-cart-updated', syncFromStorage);
    window.addEventListener('storage', syncFromStorage);

    return () => {
      window.removeEventListener('giftora-cart-updated', syncFromStorage);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );
  const maxPreparationDays = useMemo(
    () => Math.max(0, ...items.filter((item) => !item.isAddon).map((item) => item.preparationDays ?? DEFAULT_PREPARATION_DAYS)),
    [items]
  );
  const earliestDeliveryDateLabel = useMemo(
    () => formatDeliveryDateLabel(getMinimumDeliveryDate(maxPreparationDays)),
    [maxPreparationDays]
  );

  const updateQty = (lineId: string, quantity: number) => {
    const next = items.map((i) => (i.lineId === lineId ? { ...i, quantity: Math.max(1, quantity) } : i));
    setItems(next);
    writeCart(next);
    window.dispatchEvent(new Event('giftora-cart-updated'));
  };

  const removeItem = (lineId: string) => {
    const next = items.filter((i) => i.lineId !== lineId);
    setItems(next);
    writeCart(next);
    window.dispatchEvent(new Event('giftora-cart-updated'));
  };

  if (!items.length) return <p className="text-gray-600">Your cart is empty.</p>;

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.lineId} className="flex items-center justify-between rounded-lg border border-blush bg-white p-4">
          <div>
            <p className="font-medium">
              {item.name}
              {item.isAddon ? (
                <span className="ml-2 rounded-full bg-pink-100 px-2 py-0.5 text-xs font-semibold text-pink-700">Add-on</span>
              ) : null}
            </p>
            {item.flavour ? (
              <p className="text-sm font-semibold text-pink-700">{getFlavourLabel(item.flavour)}</p>
            ) : null}
            <p className="text-sm text-gray-600">UGX {formatUgx(item.price)} each</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={item.quantity}
              min={1}
              onChange={(e) => updateQty(item.lineId, Number(e.target.value))}
              className="w-16 rounded border p-1"
            />
            <button
              type="button"
              onClick={() => removeItem(item.lineId)}
              className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <div className="rounded-lg border border-dashed border-pink-200 bg-pink-50 p-4 text-sm text-gray-700">
        <div className="flex items-center justify-between gap-4">
          <span>Items subtotal</span>
          <span className="font-semibold text-ink">UGX {formatUgx(total)}</span>
        </div>
        {/* Delivery fees are now factored into product prices.
        <div className="mt-2 flex items-center justify-between gap-4">
          <span>Delivery fee</span>
          <span className="font-semibold text-ink">Calculated at checkout</span>
        </div>
        */}
        <p className="mt-2 text-xs text-gray-600">
          The earliest delivery date for this cart is {earliestDeliveryDateLabel}.
        </p>
      </div>
      <p className="text-lg font-semibold">Total: UGX {formatUgx(total)}</p>
      <Link href="/checkout" className="inline-block rounded bg-ink px-4 py-2 text-white">
        Continue to checkout
      </Link>
    </div>
  );
}
