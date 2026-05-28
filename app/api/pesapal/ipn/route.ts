import { NextRequest, NextResponse } from 'next/server';
import { getOrderByPesapalMerchantReference, updateOrderPayment } from '@/lib/orders-repo';
import { getPesapalTransactionStatus, mapPesapalTransactionToOrderStatus, pesapalStatusToPayment } from '@/lib/pesapal';

export const runtime = 'nodejs';

type PesapalIpnBody = {
  OrderTrackingId?: string;
  OrderMerchantReference?: string;
  OrderNotificationType?: string;
  orderTrackingId?: string;
  orderMerchantReference?: string;
  orderNotificationType?: string;
};

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    const body = contentType.includes('application/json')
      ? await req.json() as PesapalIpnBody
      : Object.fromEntries((await req.formData()).entries()) as PesapalIpnBody;
    const orderTrackingId = body.OrderTrackingId || body.orderTrackingId || '';
    const merchantReference = body.OrderMerchantReference || body.orderMerchantReference || '';
    const notificationType = body.OrderNotificationType || body.orderNotificationType || '';

    if (!orderTrackingId || !merchantReference) {
      return NextResponse.json({ orderNotificationType: notificationType, orderTrackingId, orderMerchantReference: merchantReference, status: 500, message: 'Missing Pesapal IPN identifiers.' }, { status: 500 });
    }

    const transactionStatus = await getPesapalTransactionStatus(orderTrackingId);
    const order = await getOrderByPesapalMerchantReference(merchantReference);
    if (!order) {
      return NextResponse.json({ orderNotificationType: notificationType, orderTrackingId, orderMerchantReference: merchantReference, status: 500, message: 'Order not found.' }, { status: 500 });
    }

    const orderStatus = mapPesapalTransactionToOrderStatus(transactionStatus);
    await updateOrderPayment(order.id, {
      ...pesapalStatusToPayment(transactionStatus),
      orderTrackingId,
      merchantReference
    }, orderStatus);

    return NextResponse.json({
      orderNotificationType: notificationType,
      orderTrackingId,
      orderMerchantReference: merchantReference,
      status: 200
    }, { status: 200 });
  } catch (error) {
    console.error('[PESAPAL_IPN_FAILED]', error);
    return NextResponse.json({ status: 500, message: 'Pesapal IPN processing failed.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed. Pesapal IPN uses POST.' }, { status: 405 });
}
