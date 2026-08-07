import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess, requireDashboardAccess } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/audit-repo';
import { getOrderById, listOrders, updateOrderItemVendorFulfillmentStatus, updateOrderStatus } from '@/lib/orders-repo';
import { filterOrdersForAdmin, isSuperAdminContext } from '@/lib/vendor-permissions';
import { orderStatusSchema } from '@/lib/validators';
import type { VendorFulfillmentStatus } from '@/lib/types';

const active = new Set(['new', 'reviewed', 'processing']);
const vendorStatuses = new Set(['new', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'fulfilled', 'cancelled']);
async function auditFulfillment(access: Awaited<ReturnType<typeof requireAdminApiAccess>>, orderId: string, vendorId?: string, productId?: string, status?: string) { if (access.mode !== 'vendor-admin') return; try { await writeAuditLog({ auditId: crypto.randomUUID(), actorUserId: access.current.user.userId, actorEmail: access.current.user.email, action: 'VENDOR_ADMIN_FULFILLMENT_STATUS_UPDATED', targetType: 'ORDER_ITEM', targetId: `${orderId}:${productId}`, vendorId, metadata: { status }, createdAt: new Date().toISOString() }); } catch (e) { console.error('[AUDIT_LOG_FAILED]', e); } }

export async function GET(req: NextRequest) {
  let access; try { access = await requireDashboardAccess(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try {
    const statusGroup = req.nextUrl.searchParams.get('statusGroup');
    let orders = filterOrdersForAdmin(access, await listOrders());
    if (statusGroup === 'active') orders = orders.filter((o) => active.has(o.status));
    if (statusGroup === 'closed') orders = orders.filter((o) => !active.has(o.status));
    return NextResponse.json({ orders, accessMode: access.mode });
  } catch { return NextResponse.json({ error: 'Failed to list orders' }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  let access; try { access = await requireDashboardAccess(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try {
    if (access.mode === 'user-orders') return NextResponse.json({ error: 'Order updates are not available for customer accounts.' }, { status: 403 });
    const body = await req.json() as { id?: string; status?: string; productId?: string; vendorId?: string; vendorFulfillmentStatus?: string; flavourId?: string };
    if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    if (isSuperAdminContext(access)) {
      const parsed = orderStatusSchema.safeParse(body.status);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
      const order = await updateOrderStatus(body.id, parsed.data);
      if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      return NextResponse.json({ ok: true, order });
    }
    if (!body.productId || !body.vendorId || !body.vendorFulfillmentStatus) return NextResponse.json({ error: 'Vendor fulfillment updates require productId, vendorId, and vendorFulfillmentStatus.' }, { status: 400 });
    if (!vendorStatuses.has(body.vendorFulfillmentStatus)) return NextResponse.json({ error: 'Invalid vendor fulfillment status.' }, { status: 400 });
    if (!access.assignedVendorIds.includes(body.vendorId)) return NextResponse.json({ error: 'Forbidden for this vendor.' }, { status: 403 });
    const existing = await getOrderById(body.id);
    if (!existing?.items?.some((item) => item.productId === body.productId && item.vendorId === body.vendorId && (item.flavourId || undefined) === (body.flavourId || undefined))) return NextResponse.json({ error: 'Order item not found for assigned vendor.' }, { status: 404 });
    const order = await updateOrderItemVendorFulfillmentStatus(body.id, body.productId, body.vendorId, body.vendorFulfillmentStatus as VendorFulfillmentStatus, body.flavourId);
    if (!order) return NextResponse.json({ error: 'Order item not found' }, { status: 404 });
    await auditFulfillment(access, body.id, body.vendorId, body.productId, body.vendorFulfillmentStatus);
    return NextResponse.json({ ok: true, order: filterOrdersForAdmin(access, [order])[0] });
  } catch { return NextResponse.json({ error: 'Failed to update order' }, { status: 500 }); }
}
