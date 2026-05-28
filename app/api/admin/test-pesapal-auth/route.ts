import { NextRequest, NextResponse } from 'next/server';
import { getPesapalEnvPresence, getPesapalTokenResponse, PesapalError } from '@/lib/pesapal';

export const runtime = 'nodejs';

function isAuthorized(req: NextRequest) {
  const adminToken = process.env.ADMIN_TOKEN || '';
  return Boolean(adminToken) && req.headers.get('x-admin-token') === adminToken;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const response = await getPesapalTokenResponse();
    return NextResponse.json({
      ok: true,
      hasToken: Boolean(response.token),
      expiryDate: response.expiryDate,
      message: 'Pesapal authentication works'
    });
  } catch (error) {
    console.error('[PESAPAL_ADMIN_AUTH_TEST_FAILED]', error instanceof PesapalError ? error.safeDiagnostics : error);

    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Pesapal authentication failed.',
      env: getPesapalEnvPresence(),
      diagnostics: error instanceof PesapalError ? error.safeDiagnostics : undefined
    }, { status: error instanceof PesapalError && error.status ? error.status : 500 });
  }
}
