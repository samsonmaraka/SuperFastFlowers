'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { readCart } from '@/lib/cart-storage';

const customerLinks = [
  ['Shop', '/shop'],
  ['About', '/about'],
  ['Contact', '/contact']
] as const;

function CartBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-pink-700 px-1.5 py-0.5 text-xs font-semibold leading-none text-white">
      {count}
    </span>
  );
}

export function Navbar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const syncCartCount = () => {
      const totalQuantity = readCart().reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(totalQuantity);
    };

    syncCartCount();
    window.addEventListener('giftora-cart-updated', syncCartCount);
    window.addEventListener('storage', syncCartCount);

    return () => {
      window.removeEventListener('giftora-cart-updated', syncCartCount);
      window.removeEventListener('storage', syncCartCount);
    };
  }, []);

  return (
    <header className="sticky top-0 z-10 border-b border-blush bg-cream/95 backdrop-blur">
      <nav className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight" onClick={() => setIsMobileOpen(false)}>
            Sendagift UG
          </Link>

          <ul className="hidden items-center gap-4 text-sm font-medium md:flex">
            {customerLinks.map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="hover:text-pink-700">
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/cart" className="inline-flex items-center hover:text-pink-700">
                Cart
                <CartBadge count={cartCount} />
              </Link>
            </li>
          </ul>

          <div className="flex items-center gap-2 md:hidden">
            <Link href="/cart" className="inline-flex items-center rounded border border-blush px-2 py-1 text-sm font-medium text-ink hover:text-pink-700" onClick={() => setIsMobileOpen(false)}>
              Cart
              <CartBadge count={cartCount} />
            </Link>
            <button
            type="button"
            className="rounded border border-blush p-2 text-ink"
            aria-label="Toggle menu"
            aria-expanded={isMobileOpen}
            onClick={() => setIsMobileOpen((open) => !open)}
          >
              <span className="block h-0.5 w-5 bg-current" />
              <span className="mt-1 block h-0.5 w-5 bg-current" />
              <span className="mt-1 block h-0.5 w-5 bg-current" />
            </button>
          </div>
        </div>

        {isMobileOpen ? (
          <ul className="mt-3 space-y-2 border-t border-blush pt-3 text-sm font-medium md:hidden">
            {customerLinks.map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="block rounded px-2 py-1 hover:bg-pink-50" onClick={() => setIsMobileOpen(false)}>
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/cart" className="inline-flex items-center rounded px-2 py-1 hover:bg-pink-50" onClick={() => setIsMobileOpen(false)}>
                Cart
                <CartBadge count={cartCount} />
              </Link>
            </li>
          </ul>
        ) : null}
      </nav>
    </header>
  );
}
