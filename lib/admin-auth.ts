import 'server-only';

import { NextRequest } from 'next/server';
import { getCurrentUserWithRoles } from '@/lib/current-user';
import { getEnv } from '@/lib/env';
import { writeAuditLog } from '@/lib/audit-repo';

async function auditSafely(entry: Parameters<typeof writeAuditLog>[0]) {
  try { await writeAuditLog(entry); } catch (error) { console.error('[AUDIT_LOG_FAILED]', error); }
}

export async function requireSuperAdmin() {
  const current = await getCurrentUserWithRoles();
  if (!current || !current.roles.some((role) => role.role === 'SUPER_ADMIN' && role.status === 'active')) {
    throw new Error('SUPER_ADMIN_REQUIRED');
  }
  return current;
}

export async function requireAdminApiAccess(req: NextRequest) {
  const current = await getCurrentUserWithRoles();
  if (current?.roles.some((role) => role.role === 'SUPER_ADMIN' && role.status === 'active')) {
    return { mode: 'super-admin' as const, current };
  }

  const adminToken = getEnv().adminToken;
  const requestToken = req.headers.get('x-admin-token');
  // TEMPORARY Phase 3 emergency fallback. Remove once Google SUPER_ADMIN access is proven stable.
  if (Boolean(adminToken) && requestToken === adminToken) {
    await auditSafely({
      auditId: crypto.randomUUID(),
      action: 'ADMIN_TOKEN_FALLBACK_ACCESS',
      targetType: 'ADMIN_API',
      targetId: req.nextUrl.pathname,
      metadata: { method: req.method },
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      createdAt: new Date().toISOString()
    });
    return { mode: 'admin-token' as const, current: null };
  }

  await auditSafely({
    auditId: crypto.randomUUID(),
    actorUserId: current?.user.userId,
    actorEmail: current?.user.email,
    action: 'UNAUTHORIZED_ADMIN_API_ACCESS',
    targetType: 'ADMIN_API',
    targetId: req.nextUrl.pathname,
    metadata: { method: req.method },
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
    createdAt: new Date().toISOString()
  });
  throw new Error('ADMIN_API_ACCESS_REQUIRED');
}

export async function isAdminAuthorized(req: NextRequest) {
  try { await requireAdminApiAccess(req); return true; } catch { return false; }
}
