'use client';

import { signIn } from 'next-auth/react';

export function SignInButton() {
  return (
    <button type="button" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-700" onClick={() => signIn('google')}>
      Sign in with Google
    </button>
  );
}
