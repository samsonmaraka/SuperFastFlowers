'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { formatUgx } from '@/lib/format';

type CartItem = { productId: string; name: string; price: number; quantity: number };
const CART_KEY = 'giftora-cart';

function readCart(): CartItem[] {
  const raw = localStorage.getItem(CART_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartClient() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const syncFromStorage = () => setItems(readCart());

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

  const updateQty = (productId: string, quantity: number) => {
    const next = items.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, quantity) } : i));
    setItems(next);
    localStorage.setItem(CART_KEY, JSON.stringify(next));
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
          <input
            type="number"
            value={item.quantity}
            min={1}
            onChange={(e) => updateQty(item.productId, Number(e.target.value))}
            className="w-16 rounded border p-1"
          />
        </div>
      ))}
      <p className="text-lg font-semibold">Total: UGX {formatUgx(total)}</p>
      <Link href="/checkout" className="inline-block rounded bg-ink px-4 py-2 text-white">
        Continue to checkout
      </Link>
    </div>
  );
}
