'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
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

function HeaderSearch({ className = '' }: { className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = pathname === '/shop' ? searchParams.get('category') : null;

  return (
    <form action="/shop" className={`flex min-w-0 items-center gap-2 ${className}`} role="search">
      {activeCategory ? <input type="hidden" name="category" value={activeCategory} /> : null}
      <input
        name="q"
        type="search"
        defaultValue={searchParams.get('q') ?? ''}
        placeholder="Search gifts"
        className="min-w-0 flex-1 rounded-full border border-blush bg-white/90 px-4 py-2 text-sm text-ink placeholder:text-ink/50 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
      />
      <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-700">
        Search
      </button>
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
    <header className="sticky top-0 z-10 border-b border-blush bg-cream/95 backdrop-blur">
      <nav className="mx-auto max-w-6xl px-4 py-2.5">
        <div className="flex items-center gap-4">
          <Link href="/" className="shrink-0 text-xl font-semibold tracking-tight" onClick={() => setIsMobileOpen(false)}>
            Sendagift UG
          </Link>

          <HeaderSearch className="hidden flex-1 md:flex" />

          <ul className="ml-auto hidden shrink-0 items-center gap-4 text-sm font-medium md:flex">
            {customerLinks.map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="hover:text-pink-700">
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/cart" className="inline-flex items-center rounded-full border border-blush bg-white/70 px-3 py-2 hover:text-pink-700">
                Cart
                <CartBadge count={cartCount} />
              </Link>
            </li>
          </ul>

          <div className="ml-auto flex items-center gap-2 md:hidden">
            <Link href="/cart" className="inline-flex items-center rounded-full border border-blush bg-white/70 px-3 py-1.5 text-sm font-medium text-ink hover:text-pink-700" onClick={() => setIsMobileOpen(false)}>
              Cart
              <CartBadge count={cartCount} />
            </Link>
            <button
              type="button"
              className="rounded border border-blush bg-white/70 p-2 text-ink"
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

        <HeaderSearch className="mt-2 md:hidden" />

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
