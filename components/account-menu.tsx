'use client';

import Image from 'next/image';
import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';

export function AccountMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { data: session, status } = useSession();
  const user = session?.user;
  const displayName = user?.name || user?.email || 'Your account';

  if (status === 'loading') {
    return <span className="rounded-full px-3 py-2 text-sm font-semibold text-ink/70">Account</span>;
  }

  if (!user) {
    return (
      <button
        type="button"
        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-700"
        onClick={() => signIn('google')}
      >
        Sign in with Google
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/account"
        className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink transition hover:bg-white/70 hover:text-pink-700"
        onClick={onNavigate}
      >
        {user.image ? <Image src={user.image} alt="" width={24} height={24} className="rounded-full" /> : null}
        <span className="max-w-36 truncate">{displayName}</span>
      </Link>
      <button
        type="button"
        className="rounded-full border border-white/80 bg-white/80 px-3 py-2 text-sm font-semibold text-ink transition hover:text-pink-700"
        onClick={() => signOut()}
      >
        Sign out
      </button>
    </div>
  );
}
