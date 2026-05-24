import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { deleteVendor, listVendors, upsertVendor } from '@/lib/vendors-repo';
import { vendorSchema } from '@/lib/validators';

const isAuthorized = (req: NextRequest) => req.headers.get('x-admin-token') === getEnv().adminToken;

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { return NextResponse.json({ vendors: await listVendors() }); } catch { return NextResponse.json({ error: 'Failed to list vendors' }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const parsed = vendorSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    await upsertVendor(parsed.data);
    return NextResponse.json({ ok: true, vendors: await listVendors() });
  } catch { return NextResponse.json({ error: 'Failed to save vendor' }, { status: 500 }); }
}
export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  try { await deleteVendor(id); return NextResponse.json({ ok: true }); } catch { return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 }); }
}
