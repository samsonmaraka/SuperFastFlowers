'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { formatUgx } from '@/lib/format';
import { CartItem, readCart, writeCart } from '@/lib/cart-storage';

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
    () => Math.max(2, ...items.map((item) => item.preparationDays ?? 2)),
    [items]
  );

  const updateQty = (productId: string, quantity: number) => {
    const next = items.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, quantity) } : i));
    setItems(next);
    writeCart(next);
    window.dispatchEvent(new Event('giftora-cart-updated'));
  };

  const removeItem = (productId: string) => {
    const next = items.filter((i) => i.productId !== productId);
    setItems(next);
    writeCart(next);
    window.dispatchEvent(new Event('giftora-cart-updated'));
  };

  if (!items.length) return <p className="text-gray-600">Your cart is empty.</p>;

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.productId} className="flex items-center justify-between rounded-lg border border-blush bg-white p-4">
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-gray-600">UGX {formatUgx(item.price)} each</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={item.quantity}
              min={1}
              onChange={(e) => updateQty(item.productId, Number(e.target.value))}
              className="w-16 rounded border p-1"
            />
            <button
              type="button"
              onClick={() => removeItem(item.productId)}
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
        <div className="mt-2 flex items-center justify-between gap-4">
          <span>Delivery fee</span>
          <span className="font-semibold text-ink">Calculated at checkout</span>
        </div>
        <p className="mt-2 text-xs text-gray-600">
          Delivery is calculated after you choose your delivery pin because it depends on the distance from the vendor to the recipient. The earliest delivery date for this cart is D+{maxPreparationDays}.
        </p>
      </div>
      <p className="text-lg font-semibold">Total before delivery: UGX {formatUgx(total)}</p>
      <Link href="/checkout" className="inline-block rounded bg-ink px-4 py-2 text-white">
        Continue to checkout
      </Link>
    </div>
  );
}
