import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { getCurrentUserWithRoles } from '@/lib/current-user';
import { recordProductEvents, type ProductEventCounts } from '@/lib/product-stats-repo';

// Receives batched product events from the shop (see lib/product-events.ts) and
// adds them to the monthly counts that drive product ordering.

export const dynamic = 'force-dynamic';

const MAX_EVENTS_PER_REQUEST = 100;
// Caps how much one request can move a single product, so a replayed or
// scripted request cannot push an item to the top on its own.
const MAX_COUNT_PER_PRODUCT_PER_REQUEST = 3;
const BOT_USER_AGENT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor/i;

const payloadSchema = z.object({
  events: z
    .array(
      z.object({
        type: z.enum(['impression', 'view', 'add_to_cart']),
        productId: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/)
      })
    )
    .max(MAX_EVENTS_PER_REQUEST)
});

const noContent = () => new NextResponse(null, { status: 204 });

async function isStaffVisitor() {
  const session = await auth();
  if (!session?.user?.id) return false;
  const current = await getCurrentUserWithRoles();
  return Boolean(current && current.roles.length > 0);
}

export async function POST(req: NextRequest) {
  if (BOT_USER_AGENT.test(req.headers.get('user-agent') || '')) return noContent();

  let parsed: z.infer<typeof payloadSchema>;
  try {
    // sendBeacon may arrive as text/plain, so parse the body by hand.
    parsed = payloadSchema.parse(JSON.parse(await req.text()));
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (parsed.events.length === 0) return noContent();

  try {
    // Admins and vendors browsing their own shop should not skew the order.
    if (await isStaffVisitor()) return noContent();
  } catch {
    // If the session check fails, count the visit rather than drop it.
  }

  const counts: ProductEventCounts = {};
  for (const event of parsed.events) {
    const current = (counts[event.productId] ??= { impressions: 0, views: 0, addsToCart: 0 });
    if (event.type === 'impression') current.impressions = Math.min(MAX_COUNT_PER_PRODUCT_PER_REQUEST, current.impressions + 1);
    if (event.type === 'view') current.views = Math.min(MAX_COUNT_PER_PRODUCT_PER_REQUEST, current.views + 1);
    if (event.type === 'add_to_cart') current.addsToCart = Math.min(MAX_COUNT_PER_PRODUCT_PER_REQUEST, current.addsToCart + 1);
  }

  try {
    await recordProductEvents(counts);
  } catch (error) {
    console.error('[api/track] failed to record product events', error);
    return NextResponse.json({ error: 'Could not record events' }, { status: 500 });
  }

  return noContent();
}
