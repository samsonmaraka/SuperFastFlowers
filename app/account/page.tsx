import Image from 'next/image';
import { auth } from '@/auth';
import { SignInButton } from '@/components/sign-in-button';
import { SignOutButton } from '@/components/sign-out-button';

export const metadata = {
  title: 'Account'
};

export default async function AccountPage() {
  const session = await auth();
  const user = session?.user;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-3xl border border-blush bg-white p-6 shadow-sm md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-pink-700">Your account</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Sendagift profile</h1>

        {!user ? (
          <div className="mt-6 space-y-4 text-gray-700">
            <p>Sign in with Google to create your Sendagift profile. You can still browse, cart, and checkout as a guest without signing in.</p>
            <SignInButton />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl bg-cream p-5 sm:flex-row sm:items-center">
              {user.image ? <Image src={user.image} alt="" width={72} height={72} className="rounded-full" /> : null}
              <div>
                <p className="text-xl font-semibold text-ink">{user.name || 'Sendagift customer'}</p>
                <p className="text-gray-700">{user.email}</p>
              </div>
            </div>
            <p className="text-gray-700">Order history and admin permissions will come in a later phase. Role-based admin access is not active yet.</p>
            <SignOutButton />
          </div>
        )}
      </div>
    </section>
  );
}
