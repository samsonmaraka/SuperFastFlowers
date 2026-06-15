import 'server-only';

import { auth } from '@/auth';
import type { AppUser, UserRoleAssignment } from '@/lib/auth-types';
import { ensureBootstrapSuperAdmin } from '@/lib/bootstrap-super-admin';
import { getUserRoles } from '@/lib/roles-repo';
import { getUserById } from '@/lib/users-repo';

export type CurrentUserWithRoles = { user: AppUser; roles: UserRoleAssignment[] };

export async function getCurrentUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return getUserById(userId);
}

export async function getCurrentUserWithRoles(): Promise<CurrentUserWithRoles | null> {
  const user = await getCurrentUser();
  if (!user || user.status !== 'active') return null;
  await ensureBootstrapSuperAdmin(user);
  return { user, roles: await getUserRoles(user.userId) };
}

export async function requireSignedInUser() {
  const current = await getCurrentUserWithRoles();
  if (!current) throw new Error('SIGNED_IN_USER_REQUIRED');
  return current;
}
