'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';

function PersonIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function AccountMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [canAdmin, setCanAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const user = session?.user;
  const displayName = user?.name || user?.email || 'Your account';

  useEffect(() => {
    if (!user) { setCanAdmin(false); return; }
    let cancelled = false;
    fetch('/api/admin/users', { cache: 'no-store' }).then((res) => { if (!cancelled) setCanAdmin(res.ok); }).catch(() => { if (!cancelled) setCanAdmin(false); });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const closeAndNavigate = () => {
    setIsOpen(false);
    onNavigate?.();
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        className="inline-flex w-full items-center justify-between gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink transition hover:bg-white/70 hover:text-pink-700 md:w-auto"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="inline-flex items-center gap-2">
          <PersonIcon />
          <span>Account</span>
        </span>
        <svg className={`h-3 w-3 transition ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-blush/80 bg-white p-3 text-sm shadow-xl md:right-0" role="menu">
          {status === 'loading' ? (
            <p className="px-2 py-1.5 font-semibold text-ink/70">Loading account...</p>
          ) : !user ? (
            <button
              type="button"
              className="w-full rounded-xl bg-ink px-4 py-2.5 text-left font-semibold text-white transition hover:bg-pink-700"
              onClick={() => {
                setIsOpen(false);
                signIn('google');
              }}
              role="menuitem"
            >
              Sign in with Google
            </button>
          ) : (
            <div className="grid gap-2">
              <div className="flex items-center gap-3 rounded-xl bg-cream px-3 py-2">
                {user.image ? <Image src={user.image} alt="" width={36} height={36} className="rounded-full" /> : <PersonIcon className="h-9 w-9 rounded-full bg-white p-2 text-pink-700" />}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{displayName}</p>
                  {user.email ? <p className="truncate text-xs text-ink/60">{user.email}</p> : null}
                </div>
              </div>
              {canAdmin ? <Link href="/admin" className="rounded-xl px-3 py-2 font-semibold text-ink transition hover:bg-cream hover:text-pink-700" onClick={closeAndNavigate} role="menuitem">Admin</Link> : null}
              <Link href="/account" className="rounded-xl px-3 py-2 font-semibold text-ink transition hover:bg-cream hover:text-pink-700" onClick={closeAndNavigate} role="menuitem">
                Account options
              </Link>
              <button
                type="button"
                className="rounded-xl px-3 py-2 text-left font-semibold text-ink transition hover:bg-cream hover:text-pink-700"
                onClick={() => {
                  setIsOpen(false);
                  signOut();
                }}
                role="menuitem"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
