import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@/lib/auth-types';
import { requireAdminApiAccess, requireSuperAdmin } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/audit-repo';
import { grantUserRole, getUserRoles, revokeUserRole } from '@/lib/roles-repo';
import { listUsers } from '@/lib/users-repo';

export const runtime = 'nodejs';
const validRoles: UserRole[] = ['USER', 'VENDOR_ADMIN', 'SUPER_ADMIN'];

async function audit(entry: Parameters<typeof writeAuditLog>[0]) { try { await writeAuditLog(entry); } catch (e) { console.error('[AUDIT_LOG_FAILED]', e); } }
async function activeSuperAdminCount() { const users = await listUsers(); const roles = await Promise.all(users.map((u) => getUserRoles(u.userId))); return roles.flat().filter((r) => r.role === 'SUPER_ADMIN' && r.status === 'active').length; }

export async function POST(req: NextRequest) {
  let current; try { current = (await requireSuperAdmin()).user; } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const body = await req.json() as { userId?: string; role?: UserRole };
  if (!body.userId || !body.role || !validRoles.includes(body.role)) return NextResponse.json({ error: 'Invalid userId or role' }, { status: 400 });
  const assignment = await grantUserRole(body.userId, body.role, current.userId);
  await audit({ auditId: crypto.randomUUID(), actorUserId: current.userId, actorEmail: current.email, action: `${body.role}_GRANTED`, targetType: 'USER_ROLE', targetId: body.userId, metadata: { role: body.role }, createdAt: new Date().toISOString() });
  return NextResponse.json({ ok: true, assignment });
}

export async function DELETE(req: NextRequest) {
  let access; try { access = await requireAdminApiAccess(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  if (access.mode !== 'super-admin' && access.mode !== 'admin-token') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const current = access.current?.user;
  const body = await req.json() as { userId?: string; role?: UserRole };
  if (!body.userId || !body.role || !validRoles.includes(body.role)) return NextResponse.json({ error: 'Invalid userId or role' }, { status: 400 });
  if (body.role === 'SUPER_ADMIN' && current?.userId === body.userId && await activeSuperAdminCount() <= 1 && access.mode !== 'admin-token') {
    return NextResponse.json({ error: 'Cannot remove your own last SUPER_ADMIN role while ADMIN_TOKEN fallback is not being used.' }, { status: 409 });
  }
  const assignment = await revokeUserRole(body.userId, body.role, current?.userId || 'admin-token');
  await audit({ auditId: crypto.randomUUID(), actorUserId: current?.userId, actorEmail: current?.email, action: 'USER_ROLE_REVOKED', targetType: 'USER_ROLE', targetId: body.userId, metadata: { role: body.role, accessMode: access.mode }, createdAt: new Date().toISOString() });
  return NextResponse.json({ ok: true, assignment });
}
