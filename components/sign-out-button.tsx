'use client';

import { signOut } from 'next-auth/react';

export function SignOutButton() {
  return (
    <button type="button" className="rounded-full border border-blush px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-pink-700 hover:text-pink-700" onClick={() => signOut()}>
      Sign out
    </button>
  );
}
