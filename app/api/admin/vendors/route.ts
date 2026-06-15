import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/audit-repo';
import { canManageVendor, filterVendorsForAdmin, isSuperAdminContext } from '@/lib/vendor-permissions';
import { deleteVendor, getVendor, listVendors, upsertVendor } from '@/lib/vendors-repo';
import { vendorSchema } from '@/lib/validators';
import type { Vendor } from '@/lib/types';

const safeVendorFields: (keyof Vendor)[] = ['contactPerson', 'phone', 'email', 'location', 'vendorLatitude', 'vendorLongitude', 'notes'];
async function auditVendor(access: Awaited<ReturnType<typeof requireAdminApiAccess>>, vendorId: string) { if (access.mode !== 'vendor-admin') return; try { await writeAuditLog({ auditId: crypto.randomUUID(), actorUserId: access.current.user.userId, actorEmail: access.current.user.email, action: 'VENDOR_ADMIN_VENDOR_PROFILE_UPDATED', targetType: 'VENDOR', targetId: vendorId, vendorId, createdAt: new Date().toISOString() }); } catch (e) { console.error('[AUDIT_LOG_FAILED]', e); } }

export async function GET(req: NextRequest) {
  let access; try { access = await requireAdminApiAccess(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try { return NextResponse.json({ vendors: filterVendorsForAdmin(access, await listVendors()), accessMode: access.mode, assignedVendorIds: access.assignedVendorIds }); } catch { return NextResponse.json({ error: 'Failed to list vendors' }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
  let access; try { access = await requireAdminApiAccess(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try {
    const parsed = vendorSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    if (isSuperAdminContext(access)) {
      await upsertVendor(parsed.data);
      return NextResponse.json({ ok: true, vendors: filterVendorsForAdmin(access, await listVendors()) });
    }
    const existing = await getVendor(parsed.data.id);
    if (!existing) return NextResponse.json({ error: 'Vendor admins cannot create vendors.' }, { status: 403 });
    if (!canManageVendor(access, existing.id)) return NextResponse.json({ error: 'Forbidden for this vendor.' }, { status: 403 });
    const next = { ...existing, updatedAt: new Date().toISOString() } as Vendor;
    for (const field of safeVendorFields) (next as Record<string, unknown>)[field] = (parsed.data as Record<string, unknown>)[field];
    await upsertVendor(next);
    await auditVendor(access, next.id);
    return NextResponse.json({ ok: true, vendors: filterVendorsForAdmin(access, await listVendors()) });
  } catch { return NextResponse.json({ error: 'Failed to save vendor' }, { status: 500 }); }
}
export async function DELETE(req: NextRequest) {
  let access; try { access = await requireAdminApiAccess(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  if (!isSuperAdminContext(access)) return NextResponse.json({ error: 'Vendor admins cannot delete vendors.' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  try { await deleteVendor(id); return NextResponse.json({ ok: true }); } catch { return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 }); }
}
