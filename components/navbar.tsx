'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { readCart } from '@/lib/cart-storage';
import { AccountMenu } from '@/components/account-menu';

const customerLinks = [
  ['Shop', '/shop'],
  ['About', '/about'],
  ['Contact', '/contact'],
  ['Account', '/account']
] as const;

function CartBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-pink-700 px-1.5 py-0.5 text-xs font-semibold leading-none text-white">
      {count}
    </span>
  );
}

function HeaderSearch() {
  return (
    <form action="/shop" className="w-full" role="search">
      <label htmlFor="site-search" className="sr-only">
        Search gifts
      </label>
      <div className="flex rounded-full border border-white/70 bg-white/90 p-1 shadow-sm ring-1 ring-pink-100 transition focus-within:ring-2 focus-within:ring-pink-700/30">
        <input
          id="site-search"
          name="q"
          type="search"
          placeholder="I am looking for......"
          className="min-w-0 flex-1 rounded-full bg-transparent px-4 py-2 text-sm text-ink outline-none placeholder:text-gray-500"
        />
        <button type="submit" className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white transition hover:bg-pink-700">
          Search
        </button>
      </div>
    </form>
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
    <header className="bg-cream/90 px-4 py-3">
      <div className="mx-auto max-w-6xl rounded-2xl border border-blush/80 bg-gradient-to-r from-rose via-blush to-white p-4 shadow-sm md:p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)] md:items-start">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="group" onClick={() => setIsMobileOpen(false)}>
              <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-pink-700">Sendagift UG</span>
              <span className="mt-1 block text-2xl font-semibold leading-tight tracking-tight text-ink md:text-3xl">
                Thoughtful gifts for life&apos;s meaningful moments.
              </span>
            </Link>

            <div className="flex shrink-0 items-center gap-2 md:hidden">
              <Link
                href="/cart"
                className="inline-flex items-center rounded-full border border-white/70 bg-white/80 px-3 py-2 text-sm font-semibold text-ink shadow-sm hover:text-pink-700"
                onClick={() => setIsMobileOpen(false)}
              >
                Cart
                <CartBadge count={cartCount} />
              </Link>
              <button
                type="button"
                className="rounded-full border border-white/70 bg-white/80 p-2.5 text-ink shadow-sm"
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

          <div className="flex flex-col gap-3 md:items-end">
            <ul className="hidden items-center gap-2 text-sm font-semibold md:flex">
              {customerLinks.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="rounded-full px-3 py-2 text-ink transition hover:bg-white/70 hover:text-pink-700">
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/cart" className="inline-flex items-center rounded-full px-3 py-2 text-ink transition hover:bg-white/70 hover:text-pink-700">
                  Cart
                  <CartBadge count={cartCount} />
                </Link>
              </li>
              <li>
                <AccountMenu />
              </li>
            </ul>

            <div className="w-full md:max-w-xl">
              <HeaderSearch />
            </div>
          </div>
        </div>

        {isMobileOpen ? (
          <ul className="mt-4 grid gap-2 border-t border-white/70 pt-4 text-sm font-semibold md:hidden">
            {customerLinks.map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="block rounded-xl bg-white/70 px-3 py-2 text-ink hover:text-pink-700" onClick={() => setIsMobileOpen(false)}>
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/cart" className="inline-flex w-full items-center rounded-xl bg-white/70 px-3 py-2 text-ink hover:text-pink-700" onClick={() => setIsMobileOpen(false)}>
                Cart
                <CartBadge count={cartCount} />
              </Link>
            </li>
            <li className="rounded-xl bg-white/70 px-3 py-2">
              <AccountMenu onNavigate={() => setIsMobileOpen(false)} />
            </li>
          </ul>
        ) : null}
      </div>
    </header>
  );
}
