import { signOut } from '@/auth';
import type { AdminAccessContext } from '@/lib/vendor-permissions';

export function AdminHeader({ access }: { access: AdminAccessContext }) {
  const user = access.current?.user;
  const role = access.mode === 'vendor-admin' ? 'VENDOR_ADMIN' : 'SUPER_ADMIN';
  return <header className="border-b bg-white px-4 py-4 md:px-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div><p className="text-sm text-gray-500">Signed in as</p><h2 className="font-semibold text-ink">{user?.name || user?.email || 'Emergency admin token'}</h2><p className="text-xs text-gray-500">{user?.email || 'ADMIN_TOKEN fallback'}</p></div>
      <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{role}</span>{access.mode === 'vendor-admin' && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">{access.assignedVendorIds.length} assigned vendor{access.assignedVendorIds.length===1?'':'s'}</span>}<a href="/" className="rounded border px-3 py-2 text-sm font-semibold">Storefront</a><form action={async()=>{'use server'; await signOut({ redirectTo: '/' });}}><button className="rounded border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Sign out</button></form></div>
    </div>
  </header>;
}
