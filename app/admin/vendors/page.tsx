import { requireAnyAdminAccess } from '@/lib/admin-auth';
import { listVendors } from '@/lib/vendors-repo';
import { filterVendorsForAdmin } from '@/lib/vendor-permissions';
import { VendorsClient } from '@/components/admin/vendors-client';
export default async function VendorsPage(){const access=await requireAnyAdminAccess();const vendors=filterVendorsForAdmin(access,await listVendors());return <VendorsClient initialVendors={vendors} mode={access.mode}/>}
