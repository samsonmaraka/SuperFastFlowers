import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/admin-auth';
import { listOrders, updateOrderStatus } from '@/lib/orders-repo';
import { orderStatusSchema } from '@/lib/validators';

const active = new Set(['new', 'reviewed', 'processing']);

export async function GET(req: NextRequest) {
  try { await requireAdminApiAccess(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try {
    const statusGroup = req.nextUrl.searchParams.get('statusGroup');
    let orders = await listOrders();
    if (statusGroup === 'active') orders = orders.filter((o) => active.has(o.status));
    if (statusGroup === 'closed') orders = orders.filter((o) => !active.has(o.status));
    return NextResponse.json({ orders });
  } catch { return NextResponse.json({ error: 'Failed to list orders' }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  try { await requireAdminApiAccess(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try {
    const body = await req.json() as { id?: string; status?: string };
    if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const parsed = orderStatusSchema.safeParse(body.status);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    const order = await updateOrderStatus(body.id, parsed.data);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json({ ok: true, order });
  } catch { return NextResponse.json({ error: 'Failed to update order' }, { status: 500 }); }
}
