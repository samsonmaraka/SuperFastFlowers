import Link from 'next/link';
import { signIn } from '@/auth';
import { AdminProductsClient } from '@/components/admin-products-client';
import { requireSuperAdmin } from '@/lib/admin-auth';
import { getCurrentUserWithRoles } from '@/lib/current-user';
import { listProducts } from '@/lib/products-repo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminPage() {
  const current = await getCurrentUserWithRoles();

  if (!current) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-3 text-3xl font-semibold">Admin sign-in required</h1>
        <p className="mb-6 text-ink/70">Sign in with the Google account that has been granted SUPER_ADMIN access.</p>
        <form action={async () => { 'use server'; await signIn('google', { redirectTo: '/admin' }); }}>
          <button className="rounded bg-ink px-4 py-2 font-semibold text-white">Sign in with Google</button>
        </form>
      </div>
    );
  }

  try { await requireSuperAdmin(); } catch { return <Unauthorized />; }

  const products = await listProducts({ includeInactive: true });
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Admin portal</h1>
      <AdminProductsClient initial={products} />
    </div>
  );
}

function Unauthorized() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-3 text-3xl font-semibold">Unauthorized</h1>
      <p className="mb-6 text-ink/70">Your account is signed in, but it does not have the SUPER_ADMIN role required for admin access.</p>
      <Link href="/" className="rounded bg-ink px-4 py-2 font-semibold text-white">Return to shop</Link>
    </div>
  );
}
