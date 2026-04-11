'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type CartItem = { productId: string; name: string; price: number; quantity: number };

export function CartClient() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('giftora-cart');
    if (raw) setItems(JSON.parse(raw));
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const updateQty = (productId: string, quantity: number) => {
    const next = items.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, quantity) } : i));
    setItems(next);
    localStorage.setItem('giftora-cart', JSON.stringify(next));
  };

  if (!items.length) return <p className="text-gray-600">Your cart is empty.</p>;

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.productId} className="flex items-center justify-between rounded-lg border border-blush bg-white p-4">
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-gray-600">${item.price} each</p>
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
      <p className="text-lg font-semibold">Total: ${total.toFixed(2)}</p>
      <Link href="/checkout" className="inline-block rounded bg-ink px-4 py-2 text-white">
        Continue to checkout
      </Link>
    </div>
  );
}
