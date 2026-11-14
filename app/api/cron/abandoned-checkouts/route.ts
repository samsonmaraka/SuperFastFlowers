import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { runAbandonedCheckoutCheck } from '@/lib/abandoned-checkout-job';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET || '';
  if (!secret) return false;
  const provided = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Called on a schedule (see .github/workflows/abandoned-checkouts.yml) to email
// the owner about customers who reached the Pesapal payment page but never paid.
async function handle(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 });
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const result = await runAbandonedCheckoutCheck();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[ABANDONED_CHECKOUT_RUN_FAILED]', error);
    return NextResponse.json({ error: 'Abandoned checkout check failed.' }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
