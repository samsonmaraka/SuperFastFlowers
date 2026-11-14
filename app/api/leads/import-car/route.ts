import { NextRequest, NextResponse } from 'next/server';
import { importLeadSchema, isAllowedImportLeadOrigin } from '@/lib/import-lead';
import { sendImportLeadEmail } from '@/lib/send-import-lead-email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Called by the "Need help importing a car?" form on www.drivecar.ug.
function corsHeaders(origin: string | null): Record<string, string> {
  if (!isAllowedImportLeadOrigin(origin)) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': String(origin),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);

  if (!isAllowedImportLeadOrigin(origin)) {
    return NextResponse.json({ error: 'Origin not allowed.' }, { status: 403, headers });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400, headers });
  }

  const parsed = importLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid request.' }, { status: 400, headers });
  }

  // Bots that fill the hidden honeypot get a normal-looking reply and no email.
  if (parsed.data.website) {
    return NextResponse.json({ ok: true }, { headers });
  }

  try {
    await sendImportLeadEmail(parsed.data);
    return NextResponse.json({ ok: true }, { headers });
  } catch (error) {
    console.error('[IMPORT_LEAD_EMAIL_FAILED]', error);
    return NextResponse.json({ error: 'Could not send your request right now.' }, { status: 502, headers });
  }
}
