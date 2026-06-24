import { NextResponse } from 'next/server';
import { requireDashboardAccess } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const access = await requireDashboardAccess();
    return NextResponse.json({ canAccessDashboard: true, canAccessAdmin: access.mode !== 'user-orders', mode: access.mode });
  } catch {
    return NextResponse.json({ canAccessDashboard: false, canAccessAdmin: false }, { status: 401 });
  }
}
