import type { OrderRequest, OrderStatus } from './types';

// How long after the customer was sent to the Pesapal payment page we wait
// before treating the payment as abandoned. Mobile money prompts can take a few
// minutes to be approved, so this is deliberately generous.
export const ABANDONED_CHECKOUT_AFTER_MINUTES = 30;

// Only orders created this recently are considered. This stops the very first
// run from emailing about every old unpaid order already in the table.
export const ABANDONED_CHECKOUT_LOOKBACK_HOURS = 48;

// Statuses that mean "sent to Pesapal, but Pesapal never confirmed payment".
const UNFINISHED_PAYMENT_STATUSES = new Set<OrderStatus>([
  'PENDING_PAYMENT',
  'PAYMENT_PENDING',
  'PAYMENT_FAILED',
  'PAYMENT_INVALID'
]);

export type AbandonedCheckoutReason = 'payment-not-completed' | 'payment-failed' | 'payment-page-failed-to-load';

export type AbandonedCheckout = {
  order: OrderRequest;
  reason: AbandonedCheckoutReason;
  // When the customer was last seen in the payment flow.
  lastActivityAt: string;
};

export function abandonedCheckoutReasonLabel(reason: AbandonedCheckoutReason) {
  if (reason === 'payment-failed') return 'Pesapal reported the payment as failed/invalid and the customer did not retry successfully';
  if (reason === 'payment-page-failed-to-load') return 'The customer clicked Pay but the Pesapal payment page could not be started';
  return 'The customer opened the Pesapal payment page but never completed payment';
}

function lastActivityAt(order: OrderRequest) {
  return order.pesapal?.updatedAt || order.updatedAt || order.createdAt;
}

function reasonFor(order: OrderRequest): AbandonedCheckoutReason | null {
  if (order.status === 'PAYMENT_INIT_FAILED') return order.pesapal?.merchantReference ? 'payment-page-failed-to-load' : null;
  if (!UNFINISHED_PAYMENT_STATUSES.has(order.status)) return null;
  // A redirect URL is only stored once Pesapal handed back a payment page for
  // this order, i.e. the customer was actually sent to it. WhatsApp orders are
  // also saved as PENDING_PAYMENT but never get one, so they are excluded here.
  if (!order.pesapal?.redirectUrl) return null;
  return order.status === 'PAYMENT_FAILED' || order.status === 'PAYMENT_INVALID' ? 'payment-failed' : 'payment-not-completed';
}

function normalizeEmail(email: string | undefined) {
  return (email || '').trim().toLowerCase();
}

/**
 * Picks the orders the owner should be told about. `orders` should hold every
 * order from the lookback window (paid ones included), so a customer who gave
 * up on one attempt but paid on a later retry is not reported.
 */
export function findAbandonedCheckouts(orders: OrderRequest[], now: Date = new Date()): AbandonedCheckout[] {
  const nowMs = now.getTime();
  const waitMs = ABANDONED_CHECKOUT_AFTER_MINUTES * 60_000;
  const lookbackMs = ABANDONED_CHECKOUT_LOOKBACK_HOURS * 3_600_000;

  const paidAtByEmail = new Map<string, number[]>();
  for (const order of orders) {
    if (order.status !== 'PAID') continue;
    const email = normalizeEmail(order.email);
    if (!email) continue;
    const list = paidAtByEmail.get(email) || [];
    list.push(Date.parse(order.createdAt));
    paidAtByEmail.set(email, list);
  }

  const result: AbandonedCheckout[] = [];
  for (const order of orders) {
    if (order.abandonedCheckoutNotifiedAt) continue;

    const createdMs = Date.parse(order.createdAt);
    if (!Number.isFinite(createdMs) || nowMs - createdMs > lookbackMs) continue;

    const reason = reasonFor(order);
    if (!reason) continue;

    const activityAt = lastActivityAt(order);
    const activityMs = Date.parse(activityAt);
    if (!Number.isFinite(activityMs) || nowMs - activityMs < waitMs) continue;

    const paidLater = (paidAtByEmail.get(normalizeEmail(order.email)) || []).some((paidCreatedMs) => paidCreatedMs >= createdMs);
    if (paidLater) continue;

    result.push({ order, reason, lastActivityAt: activityAt });
  }

  return result.sort((a, b) => a.order.createdAt.localeCompare(b.order.createdAt));
}
