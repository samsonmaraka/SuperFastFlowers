import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { getOrderById, updateOrderPayment } from '@/lib/orders-repo';
import { sendOrderSuccessEmailOnPaymentConfirmation } from '@/lib/payment-confirmation-email';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json() as { orderId?: string };
  const orderId = body.orderId || '';

  if (!orderId) return NextResponse.json({ error: 'Missing orderId.' }, { status: 400 });

  const order = await getOrderById(orderId);
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

  const merchantReference = order.pesapal?.merchantReference || `GIFTORA-${order.id}`;
  const orderTrackingId = order.pesapal?.orderTrackingId || `TEST-${crypto.randomUUID()}`;
  const amount = order.totalWithDelivery ?? order.totalAmount ?? 0;

  const updatedOrder = await updateOrderPayment(order.id, {
    orderTrackingId,
    merchantReference,
    status: 'COMPLETED',
    statusCode: 1,
    paymentMethod: 'Test successful payment',
    confirmationCode: `TEST-${Date.now()}`,
    paymentAccount: order.email,
    amount,
    currency: 'UGX',
    rawResponse: {
      source: 'test-successful-payment-button',
      payment_status_description: 'COMPLETED',
      status_code: 1,
      payment_method: 'Test successful payment',
      amount,
      currency: 'UGX'
    }
  }, 'PAID');

  await sendOrderSuccessEmailOnPaymentConfirmation({
    orderBeforePayment: order,
    updatedOrder,
    confirmedStatus: 'PAID',
    source: 'pesapal-test-success'
  });

  const { siteUrl } = getEnv();
  if (!siteUrl) {
    console.warn('[pesapal-test-success] Missing public site URL for redirect.', {
      hasSiteUrl: false,
      requestOrigin: req.nextUrl.origin
    });
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SITE_URL.' }, { status: 500 });
  }

  const redirectUrl = new URL('/payment/callback', siteUrl);
  console.info('[pesapal-test-success] Built test success redirect URL.', {
    hasSiteUrl: Boolean(siteUrl),
    redirectOrigin: redirectUrl.origin,
    requestOrigin: req.nextUrl.origin
  });
  redirectUrl.searchParams.set('OrderTrackingId', orderTrackingId);
  redirectUrl.searchParams.set('OrderMerchantReference', merchantReference);
  redirectUrl.searchParams.set('TestPayment', 'success');

  return NextResponse.json({
    ok: true,
    redirect_url: redirectUrl.toString(),
    order_tracking_id: orderTrackingId,
    merchant_reference: merchantReference
  });
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed. Use POST /api/pesapal/test-success.' }, { status: 405 });
}
