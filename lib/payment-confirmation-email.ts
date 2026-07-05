import { sendOrderSuccessEmail } from '@/lib/send-order-email';
import { OrderRequest, OrderStatus } from '@/lib/types';

export async function sendOrderSuccessEmailOnPaymentConfirmation(args: {
  orderBeforePayment: OrderRequest;
  updatedOrder: OrderRequest | null;
  confirmedStatus: OrderStatus;
  source: string;
}) {
  const { orderBeforePayment, updatedOrder, confirmedStatus, source } = args;

  if (confirmedStatus !== 'PAID') return;
  if (!updatedOrder) return;
  if (orderBeforePayment.status === 'PAID') {
    console.info('[PAYMENT_CONFIRMED_EMAIL_SKIPPED]', {
      orderId: orderBeforePayment.id,
      source,
      reason: 'order-already-paid'
    });
    return;
  }

  console.info('[PAYMENT_CONFIRMED_EMAIL_START]', {
    orderId: updatedOrder.id,
    source,
    recipientEmail: updatedOrder.email || null
  });

  try {
    await sendOrderSuccessEmail(updatedOrder);
    console.info('[PAYMENT_CONFIRMED_EMAIL_SUCCESS]', {
      orderId: updatedOrder.id,
      source,
      recipientEmail: updatedOrder.email || null
    });
  } catch (error) {
    const emailError = error as { name?: string; message?: string; $metadata?: unknown };
    console.error('[PAYMENT_CONFIRMED_EMAIL_FAILED]', {
      orderId: updatedOrder.id,
      source,
      recipientEmail: updatedOrder.email || null,
      errorName: emailError?.name || 'UnknownError',
      errorMessage: emailError?.message || 'Unknown error',
      errorMetadata: emailError?.$metadata || null
    });
  }
}
