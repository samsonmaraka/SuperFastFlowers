import { redirect } from 'next/navigation';
import { requireDashboardAccess } from '@/lib/admin-auth';
export default async function AdminIndex(){ const access = await requireDashboardAccess(); redirect(access.mode === 'user-orders' ? '/admin/orders' : '/admin/dashboard'); }
