import { NextRequest, NextResponse } from 'next/server';
import { getPesapalEnvPresence } from '@/lib/pesapal';

export const runtime = 'nodejs';

type EnvCheckResponse = ReturnType<typeof getPesapalEnvPresence> & {
  ADMIN_TOKEN: boolean;
};

function isAuthorized(req: NextRequest) {
  const adminToken = process.env.ADMIN_TOKEN || '';
  return Boolean(adminToken) && req.headers.get('x-admin-token') === adminToken;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const response: EnvCheckResponse = {
    ...getPesapalEnvPresence(),
    ADMIN_TOKEN: Boolean(process.env.ADMIN_TOKEN)
  };

  return NextResponse.json(response);
}
