import { requireAnyAdminAccess } from '@/lib/admin-auth';
import { listAddons } from '@/lib/addons-repo';
import { AddonsClient } from '@/components/admin/addons-client';

export default async function AddonsPage() {
  const access = await requireAnyAdminAccess();
  if (access.mode === 'vendor-admin') throw new Error('SUPER_ADMIN_REQUIRED');
  const addons = await listAddons({ includeInactive: true });
  return <AddonsClient initialAddons={addons} />;
}
