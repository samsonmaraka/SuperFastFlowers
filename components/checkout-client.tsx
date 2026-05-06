'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { CartItem, readCart } from '@/lib/cart-storage';
import { formatUgx } from '@/lib/format';

export function CheckoutClient({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const syncCart = () => setItems(readCart());
    syncCart();

    window.addEventListener('giftora-cart-updated', syncCart);
    window.addEventListener('storage', syncCart);
    return () => {
      window.removeEventListener('giftora-cart-updated', syncCart);
      window.removeEventListener('storage', syncCart);
    };
  }, []);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);

  if (!items.length) {
    return (
      <section className="mb-6 rounded-xl border border-blush bg-white p-5">
        <h2 className="text-xl font-semibold text-ink">Your cart is empty</h2>
        <p className="mt-2 text-sm text-gray-600">Add a few gifts to your cart before submitting an order request.</p>
        <Link href="/shop" className="mt-4 inline-block rounded bg-ink px-4 py-2 text-white">
          Continue shopping
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="mb-6 rounded-xl border border-blush bg-white p-5">
        <h2 className="mb-3 text-xl font-semibold text-ink">Order summary</h2>
        <div className="space-y-2">
          {items.map((item) => {
            const lineTotal = item.price * item.quantity;
            return (
              <div key={item.productId} className="flex items-start justify-between gap-4 border-b border-blush/70 pb-2 text-sm last:border-0">
                <div>
                  <p className="font-medium text-ink">{item.name}</p>
                  <p className="text-gray-600">Qty: {item.quantity}</p>
                  <p className="text-gray-600">Unit price: UGX {formatUgx(item.price)}</p>
                </div>
                <p className="font-semibold text-ink">UGX {formatUgx(lineTotal)}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-blush pt-3 text-base font-semibold text-ink">
          <span>Subtotal / Total</span>
          <span>UGX {formatUgx(subtotal)}</span>
        </div>
      </section>
      {children}
    </>
  );
}
