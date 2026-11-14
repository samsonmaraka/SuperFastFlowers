import 'server-only';
import {
  ABANDONED_CHECKOUT_LOOKBACK_HOURS,
  abandonedCheckoutReasonLabel,
  findAbandonedCheckouts
} from '@/lib/abandoned-checkout';
import {
  claimAbandonedCheckoutNotification,
  listOrdersCreatedSince,
  releaseAbandonedCheckoutNotification,
  updateOrderPayment
} from '@/lib/orders-repo';
import { getPesapalTransactionStatus, mapPesapalTransactionToOrderStatus, pesapalStatusToPayment } from '@/lib/pesapal';
import { sendOrderSuccessEmailOnPaymentConfirmation } from '@/lib/payment-confirmation-email';
import { sendAbandonedCheckoutEmail } from '@/lib/send-order-email';

export type AbandonedCheckoutRunResult = {
  checked: number;
  notified: string[];
  paidOnRecheck: string[];
  skipped: string[];
  failed: string[];
};

export async function runAbandonedCheckoutCheck(now: Date = new Date()): Promise<AbandonedCheckoutRunResult> {
  const since = new Date(now.getTime() - ABANDONED_CHECKOUT_LOOKBACK_HOURS * 3_600_000).toISOString();
  const orders = await listOrdersCreatedSince(since);
  const candidates = findAbandonedCheckouts(orders, now);
  const result: AbandonedCheckoutRunResult = { checked: orders.length, notified: [], paidOnRecheck: [], skipped: [], failed: [] };

  for (const candidate of candidates) {
    let { order } = candidate;

    // Pesapal's IPN can be missed. Ask Pesapal directly before alerting, so a
    // customer who actually paid is never reported as having given up.
    const trackingId = order.pesapal?.orderTrackingId;
    if (trackingId && !trackingId.startsWith('TEST-')) {
      try {
        const transactionStatus = await getPesapalTransactionStatus(trackingId);
        const latestStatus = mapPesapalTransactionToOrderStatus(transactionStatus);
        if (latestStatus !== order.status) {
          const updatedOrder = await updateOrderPayment(order.id, pesapalStatusToPayment(transactionStatus), latestStatus);
          if (latestStatus === 'PAID') {
            await sendOrderSuccessEmailOnPaymentConfirmation({ orderBeforePayment: order, updatedOrder, confirmedStatus: 'PAID', source: 'abandoned-checkout-recheck' });
            result.paidOnRecheck.push(order.id);
            continue;
          }
          if (latestStatus === 'PAYMENT_REVERSED') {
            result.skipped.push(order.id);
            continue;
          }
          if (updatedOrder) order = updatedOrder;
        }
      } catch (error) {
        console.warn('[ABANDONED_CHECKOUT_RECHECK_FAILED]', { orderId: order.id, errorMessage: error instanceof Error ? error.message : String(error) });
      }
    }

    const claimed = await claimAbandonedCheckoutNotification(order, now.toISOString());
    if (!claimed) {
      result.skipped.push(order.id);
      continue;
    }

    try {
      await sendAbandonedCheckoutEmail({ order, reasonLabel: abandonedCheckoutReasonLabel(candidate.reason), lastActivityAt: candidate.lastActivityAt });
      result.notified.push(order.id);
    } catch (error) {
      console.error('[ABANDONED_CHECKOUT_EMAIL_FAILED]', { orderId: order.id, errorMessage: error instanceof Error ? error.message : String(error) });
      await releaseAbandonedCheckoutNotification(order).catch((releaseError) => console.error('[ABANDONED_CHECKOUT_RELEASE_FAILED]', { orderId: order.id, releaseError }));
      result.failed.push(order.id);
    }
  }

  console.info('[ABANDONED_CHECKOUT_RUN]', result);
  return result;
}
