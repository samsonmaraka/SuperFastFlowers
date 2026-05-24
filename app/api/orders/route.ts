import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/orders-repo';
import { orderSchema } from '@/lib/validators';
import { sendOrderSuccessEmail } from '@/lib/send-order-email';

export async function POST(req: NextRequest) {
  console.info('[orders] POST /api/orders reached', {
    method: req.method,
    contentType: req.headers.get('content-type') || ''
  });

  const contentType = req.headers.get('content-type') || '';
  let body: unknown;
  const isJsonRequest = contentType.includes('application/json');

  if (isJsonRequest) {
    body = await req.json();
  } else {
    const form = await req.formData();
    const itemsJson = String(form.get('itemsJson') || '[]');
    let parsedItems: Array<{ productId: string; quantity: number; name?: string; price?: number; unitPrice?: number }> = [];
    try {
      const maybeItems = JSON.parse(itemsJson) as unknown;
      if (Array.isArray(maybeItems)) {
        parsedItems = maybeItems as Array<{ productId: string; quantity: number; name?: string; price?: number; unitPrice?: number }>;
      }
    } catch {
      parsedItems = [];
    }

    const normalizedItems = parsedItems.map((item) => {
      const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : Number(item.price || 0);
      const quantity = Number(item.quantity || 0);
      return {
        productId: String(item.productId || ''),
        quantity,
        name: item.name,
        unitPrice,
        lineTotal: unitPrice * quantity
      };
    });

    const computedTotal = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);

    body = {
      recipientName: String(form.get('recipientName') || ''),
      recipientPhone: String(form.get('recipientPhone') || ''),
      deliveryDate: String(form.get('deliveryDate') || ''),
      region: String(form.get('region') || ''),
      cityId: String(form.get('cityId') || ''),
      deliveryLatitude: form.get('deliveryLatitude'),
      deliveryLongitude: form.get('deliveryLongitude'),
      deliveryPinUrl: String(form.get('deliveryPinUrl') || ''),
      email: String(form.get('email') || ''),
      note: String(form.get('note') || ''),
      items: normalizedItems,
      totalAmount: computedTotal
    };
  }

  const bodyForLog = body as Record<string, unknown>;
  console.info('[orders] Request body received', {
    hasRecipientName: Boolean(bodyForLog?.recipientName),
    hasRecipientPhone: Boolean(bodyForLog?.recipientPhone),
    hasDeliveryDate: Boolean(bodyForLog?.deliveryDate),
    hasRegion: Boolean(bodyForLog?.region),
    hasCityId: Boolean(bodyForLog?.cityId),
    hasEmail: Boolean(bodyForLog?.email),
    hasItems: Array.isArray(bodyForLog?.items)
  });

  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    console.warn('[orders] Validation failed', { issues: parsed.error.issues });
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const orderPayload = {
    ...parsed.data,
    id: crypto.randomUUID(),
    status: 'new' as const,
    createdAt: new Date().toISOString()
  };

  console.info('[orders] DynamoDB save starting', { orderId: orderPayload.id });

  let order;
  try {
    order = await createOrder(orderPayload);
    console.info('[orders] DynamoDB save succeeded', { orderId: order.id });
  } catch (error) {
    console.error('[orders] DynamoDB save failed', { orderId: orderPayload.id, error });
    return NextResponse.json({ error: 'Order creation failed', stage: 'save-order' }, { status: 500 });
  }


  if (order.email) {
    console.info('[orders] Order confirmation email send starting', { orderId: order.id });
    try {
      await sendOrderSuccessEmail(order);
      console.info('[orders] Order confirmation email send succeeded', { orderId: order.id });
    } catch (error) {
      console.error('[orders] Order confirmation email send failed', {
        orderId: order.id,
        error
      });
    }
  }

  if (!isJsonRequest) {
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const forwardedHost = req.headers.get('x-forwarded-host');
    const origin = forwardedProto && forwardedHost ? `${forwardedProto}://${forwardedHost}` : req.nextUrl.origin;
    const redirectUrl = new URL(`/checkout/success?orderId=${encodeURIComponent(order.id)}`, origin);
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  return NextResponse.json({ ok: true, order });
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed. Use POST /api/orders.' }, { status: 405 });
}
