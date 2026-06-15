import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/admin-auth';
import { deleteVendor, listVendors, upsertVendor } from '@/lib/vendors-repo';
import { vendorSchema } from '@/lib/validators';

export async function GET(req: NextRequest) {
  try { await requireAdminApiAccess(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try { return NextResponse.json({ vendors: await listVendors() }); } catch { return NextResponse.json({ error: 'Failed to list vendors' }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
  try { await requireAdminApiAccess(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try {
    const parsed = vendorSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    await upsertVendor(parsed.data);
    return NextResponse.json({ ok: true, vendors: await listVendors() });
  } catch { return NextResponse.json({ error: 'Failed to save vendor' }, { status: 500 }); }
}
export async function DELETE(req: NextRequest) {
  try { await requireAdminApiAccess(req); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  try { await deleteVendor(id); return NextResponse.json({ ok: true }); } catch { return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 }); }
}
