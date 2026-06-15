import Link from 'next/link';
import { signIn } from '@/auth';
import { AdminProductsClient } from '@/components/admin-products-client';
import { requireAnyAdminAccess } from '@/lib/admin-auth';
import { getCurrentUserWithRoles } from '@/lib/current-user';
import { listProducts } from '@/lib/products-repo';
import { filterProductsForAdmin } from '@/lib/vendor-permissions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminPage() {
  const current = await getCurrentUserWithRoles();

  if (!current) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-3 text-3xl font-semibold">Admin sign-in required</h1>
        <p className="mb-6 text-ink/70">Sign in with a Google account that has been granted SUPER_ADMIN or VENDOR_ADMIN access.</p>
        <form action={async () => { 'use server'; await signIn('google', { redirectTo: '/admin' }); }}>
          <button className="rounded bg-ink px-4 py-2 font-semibold text-white">Sign in with Google</button>
        </form>
      </div>
    );
  }

  let access;
  try { access = await requireAnyAdminAccess(); } catch { return <Unauthorized />; }

  const products = filterProductsForAdmin(access, await listProducts({ includeInactive: true }));
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Admin portal</h1>
      {access.mode === 'vendor-admin' && access.assignedVendorIds.length === 0 && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">You have vendor admin access but no vendor has been assigned to your account yet.</div>
      )}
      <AdminProductsClient initial={products} accessMode={access.mode} assignedVendorIds={access.assignedVendorIds} />
    </div>
  );
}

function Unauthorized() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-3 text-3xl font-semibold">Unauthorized</h1>
      <p className="mb-6 text-ink/70">Your account is signed in, but it does not have the SUPER_ADMIN or VENDOR_ADMIN role required for admin access.</p>
      <Link href="/" className="rounded bg-ink px-4 py-2 font-semibold text-white">Return to shop</Link>
    </div>
  );
}
