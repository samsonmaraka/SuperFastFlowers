import Link from 'next/link';
import { getOrderByPesapalMerchantReference, updateOrderPayment } from '@/lib/orders-repo';
import { getPesapalTransactionStatus, mapPesapalTransactionToOrderStatus, pesapalStatusToPayment } from '@/lib/pesapal';

export const dynamic = 'force-dynamic';

type PaymentCallbackPageProps = {
  searchParams?: {
    OrderTrackingId?: string;
    OrderMerchantReference?: string;
    TestPayment?: string;
  };
};

const statusCopy = {
  PAID: {
    title: 'Payment received',
    message: 'Thank you — Pesapal has confirmed your payment. Our team will continue preparing your Sendagift UG order.'
  },
  PAYMENT_PENDING: {
    title: 'Payment is still pending',
    message: 'Pesapal has not confirmed this payment yet. If you completed payment, please wait a moment for confirmation.'
  },
  PAYMENT_FAILED: {
    title: 'Payment failed',
    message: 'Pesapal reported that this payment failed. You can return to checkout and try again.'
  },
  PAYMENT_REVERSED: {
    title: 'Payment reversed',
    message: 'Pesapal reported that this payment was reversed. Please contact Sendagift UG if you need help.'
  },
  PAYMENT_INVALID: {
    title: 'Payment invalid',
    message: 'Pesapal could not validate this payment. Please contact Sendagift UG before retrying.'
  }
};

export default async function PaymentCallbackPage({ searchParams }: PaymentCallbackPageProps) {
  const orderTrackingId = searchParams?.OrderTrackingId || '';
  const merchantReference = searchParams?.OrderMerchantReference || '';
  const isTestPayment = searchParams?.TestPayment === 'success';

  let title = 'Payment status unavailable';
  let message = 'We could not verify this payment because the callback was missing Pesapal payment identifiers.';
  let displayStatus = 'Missing payment details';
  let paidOrderId = '';

  if (orderTrackingId && merchantReference) {
    try {
      if (isTestPayment) {
        const order = await getOrderByPesapalMerchantReference(merchantReference);

        if (order?.status === 'PAID' && order.pesapal?.orderTrackingId === orderTrackingId) {
          paidOrderId = order.id;
          title = statusCopy.PAID.title;
          message = `${statusCopy.PAID.message} This was registered by the test successful payment button.`;
          displayStatus = order.pesapal.status || 'COMPLETED';
        } else {
          title = 'Test payment unavailable';
          message = 'The test payment link could not be matched to a paid test order.';
          displayStatus = 'Test payment not found';
        }
      } else {
        const transactionStatus = await getPesapalTransactionStatus(orderTrackingId);
        const orderStatus = mapPesapalTransactionToOrderStatus(transactionStatus);
        const order = await getOrderByPesapalMerchantReference(merchantReference);

        if (order) {
          paidOrderId = order.id;
          await updateOrderPayment(order.id, {
            ...pesapalStatusToPayment(transactionStatus),
            orderTrackingId,
            merchantReference
          }, orderStatus);
        }

        const copy = statusCopy[orderStatus as keyof typeof statusCopy] || statusCopy.PAYMENT_PENDING;
        title = copy.title;
        message = copy.message;
        displayStatus = String(transactionStatus.payment_status_description || orderStatus);
      }
    } catch (error) {
      console.error('[PESAPAL_CALLBACK_VERIFY_FAILED]', error);
      title = 'Payment verification failed';
      message = 'We could not verify the payment with Pesapal right now. Please contact Sendagift UG if your payment was deducted.';
      displayStatus = 'Verification failed';
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <section className="rounded-xl border border-blush bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-pink-700">Pesapal payment</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">{title}</h1>
        <p className="mt-3 text-gray-700">{message}</p>
        <dl className="mt-6 space-y-2 rounded-lg bg-cream p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="font-medium text-gray-700">Status</dt>
            <dd className="text-right text-ink">{displayStatus}</dd>
          </div>
          {merchantReference ? (
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-gray-700">Order reference</dt>
              <dd className="text-right text-ink">{merchantReference}</dd>
            </div>
          ) : null}
          {orderTrackingId ? (
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-gray-700">Pesapal tracking ID</dt>
              <dd className="break-all text-right text-ink">{orderTrackingId}</dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          {paidOrderId ? (
            <Link href={`/checkout/success?orderId=${encodeURIComponent(paidOrderId)}`} className="rounded bg-ink px-4 py-2 text-white">
              View order success details
            </Link>
          ) : (
            <Link href="/shop" className="rounded bg-ink px-4 py-2 text-white">Continue shopping</Link>
          )}
          <Link href="/contact" className="rounded border border-ink px-4 py-2 text-ink">Contact Sendagift UG</Link>
        </div>
      </section>
    </main>
  );
}
