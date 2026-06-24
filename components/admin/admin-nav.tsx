'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const superLinks = [
  ['Dashboard','/admin/dashboard'],['Orders','/admin/orders'],['Products','/admin/products'],['Visual products','/admin/products/visual'],['Vendors','/admin/vendors'],['Users','/admin/users'],['Roles','/admin/roles'],['Vendor assignments','/admin/vendor-assignments'],['Settings','/admin/settings']
] as const;
const vendorLinks = [['Dashboard','/admin/dashboard'],['Orders','/admin/orders'],['Products','/admin/products'],['Visual products','/admin/products/visual'],['Vendor profile','/admin/vendors']] as const;
const userLinks = [['Orders','/admin/orders']] as const;
export function AdminNav({ mode }: { mode: 'super-admin'|'admin-token'|'vendor-admin'|'user-orders' }) {
  const pathname = usePathname(); const links = mode === 'user-orders' ? userLinks : mode === 'vendor-admin' ? vendorLinks : superLinks;
  return <nav className="border-b bg-cream/70 p-3 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
    <div className="mb-4 hidden px-3 text-lg font-bold md:block">Super Fast Flowers</div>
    <div className="flex gap-2 overflow-x-auto md:flex-col">{links.map(([label,href])=><Link key={href} href={href} className={`whitespace-nowrap rounded px-3 py-2 text-sm font-semibold ${pathname===href || (href==='/admin/dashboard'&&pathname==='/admin') || (href==='/admin/products'&&pathname.startsWith('/admin/products/')&&pathname!=='/admin/products/visual')?'bg-ink text-white':'hover:bg-white'}`}>{label}</Link>)}</div>
  </nav>;
}
