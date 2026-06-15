import { requireAnyAdminAccess } from '@/lib/admin-auth';
import { listUsers } from '@/lib/users-repo';
import { getUserRoles, listVendorAssignments } from '@/lib/roles-repo';
import { listVendors } from '@/lib/vendors-repo';
import { VendorAssignmentManager } from '@/components/admin/vendor-assignment-manager';
export default async function AssignmentsPage(){const access=await requireAnyAdminAccess(); if(access.mode==='vendor-admin') throw new Error('SUPER_ADMIN_REQUIRED'); const [users,vendors,assignments]=await Promise.all([listUsers(),listVendors(),listVendorAssignments({})]);const rows=await Promise.all(users.map(async u=>({...u,roles:await getUserRoles(u.userId)})));return <VendorAssignmentManager initialUsers={rows} initialVendors={vendors} initialAssignments={assignments}/>}
