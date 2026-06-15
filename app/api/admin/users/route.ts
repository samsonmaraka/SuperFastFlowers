import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/admin-auth';
import { getUserRoles } from '@/lib/roles-repo';
import { listUsers } from '@/lib/users-repo';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try { await requireSuperAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const users = await listUsers(req.nextUrl.searchParams.get('q') || undefined);
  const rows = await Promise.all(users.map(async (user) => ({ ...user, roles: await getUserRoles(user.userId) })));
  return NextResponse.json({ users: rows });
}
