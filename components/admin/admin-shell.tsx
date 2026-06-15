import type { ReactNode } from 'react';
import type { AdminAccessContext } from '@/lib/vendor-permissions';
import { AdminHeader } from './admin-header';
import { AdminNav } from './admin-nav';
export function AdminShell({ access, children }: { access: AdminAccessContext; children: ReactNode }) {
  return <div className="min-h-screen bg-[#f8f5ef] text-ink"><div className="md:flex"><AdminNav mode={access.mode}/><div className="min-w-0 flex-1"><AdminHeader access={access}/><main className="p-4 md:p-6">{children}</main></div></div></div>;
}
