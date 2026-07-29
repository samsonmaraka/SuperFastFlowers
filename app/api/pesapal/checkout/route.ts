import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, updateOrderPayment } from '@/lib/orders-repo';
import { buildPesapalMerchantReference, getPesapalSafeDiagnostics, PesapalError, submitPesapalOrder } from '@/lib/pesapal';

export const runtime = 'nodejs';

function extractPesapalProviderError(source: unknown): string | undefined {
  if (!source || typeof source !== 'object') return undefined;
  const candidate = (source as { error?: unknown }).error ?? source;
  if (!candidate || typeof candidate !== 'object') return undefined;
  const { code, message } = candidate as { code?: unknown; message?: unknown };
  const messageText = typeof message === 'string' ? message.trim() : '';
  const codeText = typeof code === 'string' ? code.trim() : '';
  if (!messageText && !codeText) return undefined;
  return [messageText, codeText ? `(${codeText})` : ''].filter(Boolean).join(' ');
}

export async function POST(req: NextRequest) {
  let orderId = '';
  let merchantReference = '';

  console.info('[PESAPAL_CHECKOUT_START]', getPesapalSafeDiagnostics({ debugCode: 'PESAPAL_CHECKOUT_START' }));

  try {
    const body = await req.json() as { orderId?: string };
    orderId = body.orderId || '';
    console.info('[PESAPAL_CHECKOUT_ORDER_ID]', { orderId });
    if (!orderId) return NextResponse.json({ error: 'Missing orderId.' }, { status: 400 });

    const order = await getOrderById(orderId);
    console.info('[PESAPAL_CHECKOUT_ORDER_LOOKUP]', { orderId, orderFound: Boolean(order) });
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

    merchantReference = buildPesapalMerchantReference(order.id);
    const amount = order.totalWithDelivery ?? order.totalAmount ?? 0;
    if (amount <= 0) return NextResponse.json({ error: 'Order total must be greater than zero.' }, { status: 400 });

    console.info('[PESAPAL_CHECKOUT_PAYMENT_DETAILS]', {
      orderId,
      orderFound: true,
      totalAmount: amount,
      currency: 'UGX',
      merchantReference,
      callback_url: `${getPesapalSafeDiagnostics().siteUrl}/payment/callback`,
      cancellation_url: `${getPesapalSafeDiagnostics().siteUrl}/checkout`,
      safeDiagnostics: getPesapalSafeDiagnostics({ debugCode: 'PESAPAL_CHECKOUT_PAYMENT_DETAILS' })
    });

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
    console.error('[PESAPAL_CHECKOUT_FAILED]', {
      orderId,
      merchantReference,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      pesapalDetails: error instanceof PesapalError ? error.details : undefined,
      safeDiagnostics: error instanceof PesapalError ? error.safeDiagnostics : getPesapalSafeDiagnostics({ debugCode: 'PESAPAL_CHECKOUT_EXCEPTION' })
    });
    if (orderId) {
      await updateOrderPayment(orderId, {
        merchantReference,
        status: 'PAYMENT_INIT_FAILED',
        rawResponse: error instanceof PesapalError ? error.details : { message: error instanceof Error ? error.message : 'Unknown error' }
      }, 'PAYMENT_INIT_FAILED');
    }

    const pesapalError = error instanceof PesapalError ? error : null;
    const safeDiagnostics = pesapalError?.safeDiagnostics || getPesapalSafeDiagnostics({ debugCode: 'PESAPAL_CHECKOUT_EXCEPTION' });
    const fallbackMessage = error instanceof Error ? error.message : 'Payment could not be initialized.';

    const providerError = extractPesapalProviderError(pesapalError?.details) || extractPesapalProviderError(safeDiagnostics.pesapalError);

    return NextResponse.json({
      error: pesapalError?.message === 'PESAPAL_IPN_ID is missing. Register IPN and configure the returned ipn_id.'
        ? pesapalError.message
        : providerError
          ? `Payment provider declined the transaction: ${providerError}`
          : 'Pesapal order submission failed.',
      debugCode: pesapalError?.debugCode || safeDiagnostics.debugCode || 'PESAPAL_CHECKOUT_EXCEPTION',
      pesapalStatus: safeDiagnostics.pesapalStatus,
      pesapalMessage: safeDiagnostics.pesapalMessage || fallbackMessage,
      safeDiagnostics
    }, { status: pesapalError?.status || 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed. Use POST /api/pesapal/checkout.' }, { status: 405 });
}
