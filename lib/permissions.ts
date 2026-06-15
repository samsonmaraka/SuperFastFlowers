import { UserRole } from '@/lib/auth-types';
import { getUserRoles, getVendorAssignmentsForUser } from '@/lib/roles-repo';

export async function hasRole(userId: string, role: UserRole) {
  const roles = await getUserRoles(userId);
  return roles.some((assignment) => assignment.role === role && assignment.status === 'active');
}

export async function isSuperAdmin(userId: string) {
  return hasRole(userId, 'SUPER_ADMIN');
}

export async function isVendorAdminForVendor(userId: string, vendorId: string) {
  if (await isSuperAdmin(userId)) return true;
  const assignments = await getVendorAssignmentsForUser(userId);
  return assignments.some((assignment) => assignment.vendorId === vendorId && assignment.status === 'active');
}
