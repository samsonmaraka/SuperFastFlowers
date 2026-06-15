import 'server-only';

import type { AppUser } from '@/lib/auth-types';
import { writeAuditLog } from '@/lib/audit-repo';
import { grantUserRole, getUserRoles } from '@/lib/roles-repo';
import { normalizeEmail } from '@/lib/users-repo';

function bootstrapEmails() {
  return new Set((process.env.BOOTSTRAP_SUPER_ADMIN_EMAILS || '').split(',').map((email) => normalizeEmail(email)).filter(Boolean));
}

async function auditSafely(entry: Parameters<typeof writeAuditLog>[0]) {
  try { await writeAuditLog(entry); } catch (error) { console.error('[AUDIT_LOG_FAILED]', error); }
}

export async function ensureBootstrapSuperAdmin(user: AppUser) {
  if (!bootstrapEmails().has(normalizeEmail(user.emailNormalized || user.email))) return false;
  const roles = await getUserRoles(user.userId);
  if (roles.some((role) => role.role === 'SUPER_ADMIN' && role.status === 'active')) return false;
  await grantUserRole(user.userId, 'SUPER_ADMIN', 'bootstrap');
  await auditSafely({
    auditId: crypto.randomUUID(),
    actorUserId: 'bootstrap',
    actorEmail: 'BOOTSTRAP_SUPER_ADMIN_EMAILS',
    action: 'BOOTSTRAP_SUPER_ADMIN_GRANTED',
    targetType: 'USER_ROLE',
    targetId: user.userId,
    metadata: { role: 'SUPER_ADMIN', emailNormalized: normalizeEmail(user.emailNormalized || user.email) },
    createdAt: new Date().toISOString()
  });
  return true;
}
