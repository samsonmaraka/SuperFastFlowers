import assert from 'node:assert/strict';
import { findAbandonedCheckouts } from '../lib/abandoned-checkout';
import type { OrderRequest } from '../lib/types';

const now = new Date('2026-11-14T12:00:00.000Z');
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();

function order(overrides: Partial<OrderRequest> & { id: string }): OrderRequest {
  return {
    recipientName: 'R', recipientPhone: '0700000000', deliveryDate: '2026-11-15', region: 'Kampala Region', cityId: 'delivery-pin',
    email: `${overrides.id}@example.com`, status: 'PENDING_PAYMENT', createdAt: minutesAgo(45),
    pesapal: { merchantReference: `GIFTORA-${overrides.id}`, redirectUrl: 'https://pay.pesapal.com/x', updatedAt: minutesAgo(45) },
    ...overrides
  } as OrderRequest;
}

const ids = (orders: OrderRequest[]) => findAbandonedCheckouts(orders, now).map((entry) => entry.order.id);

// Opened Pesapal 45 minutes ago and never paid: reported.
assert.deepEqual(ids([order({ id: 'a' })]), ['a']);

// Still within the 30 minute grace period: not yet.
assert.deepEqual(ids([order({ id: 'b', createdAt: minutesAgo(10), pesapal: { merchantReference: 'x', redirectUrl: 'u', updatedAt: minutesAgo(10) } })]), []);

// Paid, or already reported: never.
assert.deepEqual(ids([order({ id: 'c', status: 'PAID' }), order({ id: 'd', abandonedCheckoutNotifiedAt: minutesAgo(5) })]), []);

// WhatsApp orders are saved as PENDING_PAYMENT but never reach Pesapal.
assert.deepEqual(ids([order({ id: 'e', pesapal: undefined })]), []);

// Older than the 48 hour lookback (avoids a flood on first deploy).
assert.deepEqual(ids([order({ id: 'f', createdAt: minutesAgo(49 * 60), pesapal: { redirectUrl: 'u', updatedAt: minutesAgo(49 * 60) } })]), []);

// Gave up on one attempt but paid on a later retry with the same email: not reported.
assert.deepEqual(ids([
  order({ id: 'g1', email: 'Same@Example.com', createdAt: minutesAgo(60) }),
  order({ id: 'g2', email: 'same@example.com', status: 'PAID', createdAt: minutesAgo(50) })
]), []);

// Failed payments and payment pages that could not be started are reported with their reason.
const reasons = findAbandonedCheckouts([
  order({ id: 'h', status: 'PAYMENT_FAILED' }),
  order({ id: 'i', status: 'PAYMENT_INIT_FAILED', pesapal: { merchantReference: 'GIFTORA-i', updatedAt: minutesAgo(40) } })
], now).map((entry) => [entry.order.id, entry.reason]);
assert.deepEqual(reasons, [['h', 'payment-failed'], ['i', 'payment-page-failed-to-load']]);

console.log('abandoned-checkout tests passed');
