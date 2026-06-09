import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { registerPesapalIpn } from '@/lib/pesapal';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const response = await registerPesapalIpn();
    return NextResponse.json({
      ok: true,
      ipn: response,
      nextStep: `Set PESAPAL_IPN_ID to ${response.ipn_id}. Do not set it to the URL.`
    });
  } catch (error) {
    console.error('[PESAPAL_REGISTER_IPN_FAILED]', error);
    const message = error instanceof Error ? error.message : 'Pesapal IPN registration failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed. Use POST /api/pesapal/register-ipn.' }, { status: 405 });
}
