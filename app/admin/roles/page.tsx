import { requireSuperAdmin } from '@/lib/admin-auth';
import { listUsers } from '@/lib/users-repo';
import { getUserRoles } from '@/lib/roles-repo';
import { UsersRolesClient } from '@/components/admin/users-roles-client';
export default async function RolesPage(){await requireSuperAdmin();const users=await listUsers();const rows=await Promise.all(users.map(async u=>({...u,roles:await getUserRoles(u.userId)})));return <UsersRolesClient initialUsers={rows} mode="roles"/>}
