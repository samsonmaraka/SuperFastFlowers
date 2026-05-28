import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, updateOrderPayment } from '@/lib/orders-repo';
import { PesapalError, submitPesapalOrder } from '@/lib/pesapal';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let orderId = '';
  let merchantReference = '';

  try {
    const body = await req.json() as { orderId?: string };
    orderId = body.orderId || '';
    if (!orderId) return NextResponse.json({ error: 'Missing orderId.' }, { status: 400 });

    const order = await getOrderById(orderId);
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

    merchantReference = `GIFTORA-${order.id}`;
    const amount = order.totalWithDelivery ?? order.totalAmount ?? 0;
    if (amount <= 0) return NextResponse.json({ error: 'Order total must be greater than zero.' }, { status: 400 });

    await updateOrderPayment(order.id, {
      merchantReference,
      status: 'PENDING_PAYMENT',
      currency: 'UGX',
      amount
    }, 'PENDING_PAYMENT');

    const pesapalOrder = await submitPesapalOrder({ order, merchantReference, amount });

    await updateOrderPayment(order.id, {
      orderTrackingId: pesapalOrder.order_tracking_id,
      merchantReference: pesapalOrder.merchant_reference || merchantReference,
      redirectUrl: pesapalOrder.redirect_url,
      status: 'PENDING_PAYMENT',
      currency: 'UGX',
      amount,
      rawResponse: pesapalOrder
    }, 'PENDING_PAYMENT');

    return NextResponse.json({
      ok: true,
      redirect_url: pesapalOrder.redirect_url,
      order_tracking_id: pesapalOrder.order_tracking_id,
      merchant_reference: pesapalOrder.merchant_reference || merchantReference
    });
  } catch (error) {
    console.error('[PESAPAL_CHECKOUT_FAILED]', { orderId, merchantReference, error });
    if (orderId) {
      await updateOrderPayment(orderId, {
        merchantReference,
        status: 'PAYMENT_INIT_FAILED',
        rawResponse: error instanceof PesapalError ? error.details : { message: error instanceof Error ? error.message : 'Unknown error' }
      }, 'PAYMENT_INIT_FAILED');
    }

    const message = error instanceof Error ? error.message : 'Payment could not be initialized.';
    const safeDiagnostics = error instanceof PesapalError ? error.safeDiagnostics : undefined;
    return NextResponse.json({
      error: message,
      ...(safeDiagnostics ? { diagnostics: safeDiagnostics } : {})
    }, { status: error instanceof PesapalError && error.status ? error.status : 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed. Use POST /api/pesapal/checkout.' }, { status: 405 });
}
