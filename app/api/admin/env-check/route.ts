import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/admin-auth';
import { getPesapalEnvPresence } from '@/lib/pesapal';

export const runtime = 'nodejs';

type EnvCheckResponse = ReturnType<typeof getPesapalEnvPresence> & {
  ADMIN_TOKEN: boolean;
};


export async function GET(req: NextRequest) {
  try { const access = await requireAdminApiAccess(req); if (access.mode === 'vendor-admin') throw new Error('SUPER_ADMIN_REQUIRED'); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const response: EnvCheckResponse = {
    ...getPesapalEnvPresence(),
    ADMIN_TOKEN: Boolean(process.env.ADMIN_TOKEN)
  };

  return NextResponse.json(response);
}
