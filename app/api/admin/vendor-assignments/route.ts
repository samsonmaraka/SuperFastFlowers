import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/audit-repo';
import { assignVendorToUser, getUserRoles, listVendorAssignments, removeVendorAssignment } from '@/lib/roles-repo';
import { getUserById, listUsers } from '@/lib/users-repo';
import { getVendor, listVendors } from '@/lib/vendors-repo';

export const runtime = 'nodejs';
async function audit(entry: Parameters<typeof writeAuditLog>[0]) { try { await writeAuditLog(entry); } catch (e) { console.error('[AUDIT_LOG_FAILED]', e); } }
async function requireSuper(req: NextRequest) { const access = await requireAdminApiAccess(req); if (access.mode !== 'super-admin' && access.mode !== 'admin-token') throw new Error('SUPER_ADMIN_REQUIRED'); return access; }

export async function GET(req: NextRequest) {
  let access; try { access = await requireSuper(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const userId = req.nextUrl.searchParams.get('userId') || undefined;
  const vendorId = req.nextUrl.searchParams.get('vendorId') || undefined;
  const [assignments, users, vendors] = await Promise.all([listVendorAssignments({ userId, vendorId }), listUsers(), listVendors()]);
  const userRows = await Promise.all(users.map(async (user) => ({ ...user, roles: await getUserRoles(user.userId) })));
  return NextResponse.json({ assignments, users: userRows, vendors, accessMode: access.mode });
}

export async function POST(req: NextRequest) {
  let access; try { access = await requireSuper(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const body = await req.json() as { userId?: string; vendorId?: string };
  if (!body.userId || !body.vendorId) return NextResponse.json({ error: 'userId and vendorId are required' }, { status: 400 });
  const [user, vendor, roles] = await Promise.all([getUserById(body.userId), getVendor(body.vendorId), getUserRoles(body.userId)]);
  if (!user) return NextResponse.json({ error: 'Target user was not found.' }, { status: 404 });
  if (!vendor) return NextResponse.json({ error: 'Target vendor was not found.' }, { status: 404 });
  if (!roles.some((r) => r.role === 'VENDOR_ADMIN' && r.status === 'active')) return NextResponse.json({ error: 'Grant the VENDOR_ADMIN role to this user before assigning a vendor.' }, { status: 409 });
  const assignment = await assignVendorToUser(body.userId, body.vendorId, ['VIEW_ORDERS', 'MANAGE_ORDERS', 'MANAGE_PRODUCTS'], access.current?.user.userId || 'admin-token');
  await audit({ auditId: crypto.randomUUID(), actorUserId: access.current?.user.userId, actorEmail: access.current?.user.email, action: 'VENDOR_ASSIGNED_TO_USER', targetType: 'VENDOR_ADMIN_ASSIGNMENT', targetId: body.userId, vendorId: body.vendorId, metadata: { accessMode: access.mode }, createdAt: new Date().toISOString() });
  return NextResponse.json({ ok: true, assignment });
}

export async function DELETE(req: NextRequest) {
  let access; try { access = await requireSuper(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const body = await req.json() as { userId?: string; vendorId?: string };
  if (!body.userId || !body.vendorId) return NextResponse.json({ error: 'userId and vendorId are required' }, { status: 400 });
  await removeVendorAssignment(body.userId, body.vendorId);
  await audit({ auditId: crypto.randomUUID(), actorUserId: access.current?.user.userId, actorEmail: access.current?.user.email, action: 'VENDOR_ASSIGNMENT_REMOVED', targetType: 'VENDOR_ADMIN_ASSIGNMENT', targetId: body.userId, vendorId: body.vendorId, metadata: { accessMode: access.mode }, createdAt: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
