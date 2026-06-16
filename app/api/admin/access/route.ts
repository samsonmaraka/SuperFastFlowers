import { NextResponse } from 'next/server';
import { requireAnyAdminAccess } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const access = await requireAnyAdminAccess();
    return NextResponse.json({ canAccessAdmin: true, mode: access.mode });
  } catch {
    return NextResponse.json({ canAccessAdmin: false }, { status: 401 });
  }
}
