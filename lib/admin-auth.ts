import 'server-only';

import { NextRequest } from 'next/server';
import { getCurrentUserWithRoles } from '@/lib/current-user';
import { getEnv } from '@/lib/env';
import { writeAuditLog } from '@/lib/audit-repo';
import { getAssignedVendorIdsForUser, hasActiveRole, type AdminAccessContext } from '@/lib/vendor-permissions';

async function auditSafely(entry: Parameters<typeof writeAuditLog>[0]) {
  try { await writeAuditLog(entry); } catch (error) { console.error('[AUDIT_LOG_FAILED]', error); }
}

export async function requireSuperAdmin() {
  const current = await getCurrentUserWithRoles();
  if (!hasActiveRole(current, 'SUPER_ADMIN')) throw new Error('SUPER_ADMIN_REQUIRED');
  return current!;
}

export async function getAdminAccessContext(req?: NextRequest): Promise<AdminAccessContext> {
  const current = await getCurrentUserWithRoles();
  if (hasActiveRole(current, 'SUPER_ADMIN')) return { mode: 'super-admin', current, assignedVendorIds: [] };

  const adminToken = getEnv().adminToken;
  const requestToken = req?.headers.get('x-admin-token');
  // TEMPORARY Phase 4 emergency fallback: a valid ADMIN_TOKEN intentionally behaves as SUPER_ADMIN.
  if (req && Boolean(adminToken) && requestToken === adminToken) {
    await auditSafely({ auditId: crypto.randomUUID(), action: 'ADMIN_TOKEN_FALLBACK_ACCESS', targetType: 'ADMIN_API', targetId: req.nextUrl.pathname, metadata: { method: req.method }, ipAddress: req.headers.get('x-forwarded-for') || undefined, userAgent: req.headers.get('user-agent') || undefined, createdAt: new Date().toISOString() });
    return { mode: 'admin-token', current: null, assignedVendorIds: [] };
  }

  if (hasActiveRole(current, 'VENDOR_ADMIN')) {
    return { mode: 'vendor-admin', current: current!, assignedVendorIds: await getAssignedVendorIdsForUser(current!.user.userId) };
  }

  if (req) await auditSafely({ auditId: crypto.randomUUID(), actorUserId: current?.user.userId, actorEmail: current?.user.email, action: 'UNAUTHORIZED_ADMIN_API_ACCESS', targetType: 'ADMIN_API', targetId: req.nextUrl.pathname, metadata: { method: req.method }, ipAddress: req.headers.get('x-forwarded-for') || undefined, userAgent: req.headers.get('user-agent') || undefined, createdAt: new Date().toISOString() });
  throw new Error('ADMIN_API_ACCESS_REQUIRED');
}

export async function requireAnyAdminAccess(req?: NextRequest) { return getAdminAccessContext(req); }

export async function requireVendorAdminAccess(req?: NextRequest) {
  const access = await getAdminAccessContext(req);
  if (access.mode !== 'vendor-admin') throw new Error('VENDOR_ADMIN_REQUIRED');
  return access;
}

export async function requireAdminApiAccess(req: NextRequest) { return getAdminAccessContext(req); }
export async function isAdminAuthorized(req: NextRequest) { try { await requireAdminApiAccess(req); return true; } catch { return false; } }
