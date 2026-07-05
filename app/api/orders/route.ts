import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/orders-repo';
import { orderSchema } from '@/lib/validators';
import { getProductByIdOrSlug, listProducts } from '@/lib/products-repo';
import { OrderItem, OrderStatus } from '@/lib/types';
import { getDateOnlyAtUtcMidnight, getGmtPlus3DateOnlyAtUtcMidnight, getMinimumDeliveryDate, getProductPreparationDays, getRequiredPreparationDays, isBeforeSameDayDeliveryCutoff } from '@/lib/preparation-days';

export async function POST(req: NextRequest) {
  console.info('[ORDER_API_START] POST /api/orders reached', {
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
    console.warn('[ORDER_API_VALIDATION_FAILED]', { issues: parsed.error.issues });
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const products = await listProducts();
  const requiredPreparationDays = getRequiredPreparationDays(parsed.data.items, products);
  const singleRequestedItem = parsed.data.items.length === 1 ? parsed.data.items[0] : null;
  const singleRequestedProduct = singleRequestedItem
    ? products.find((product) => product.id === singleRequestedItem.productId)
    : undefined;
  const isSameDayEligibleOrder =
    Boolean(singleRequestedItem) &&
    singleRequestedItem?.quantity === 1 &&
    getProductPreparationDays(singleRequestedProduct) === 1;
  const deliveryDate = getDateOnlyAtUtcMidnight(parsed.data.deliveryDate);
  const minimumDeliveryDate =
    isSameDayEligibleOrder && isBeforeSameDayDeliveryCutoff()
      ? getGmtPlus3DateOnlyAtUtcMidnight()
      : getMinimumDeliveryDate(requiredPreparationDays);

  if (!deliveryDate || deliveryDate < minimumDeliveryDate) {
    return NextResponse.json(
      { error: `Delivery date must be at least ${requiredPreparationDays} day(s) from today for the selected item(s).` },
      { status: 400 }
    );
  }

  const orderItems: OrderItem[] = [];
  for (const item of parsed.data.items) {
    const product = await getProductByIdOrSlug(item.productId);
    if (!product) {
      return NextResponse.json({ error: `Product ${item.productId} is no longer available.` }, { status: 400 });
    }

    const quantity = item.quantity;
    orderItems.push({
      productId: product.id,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
      quantity,
      name: product.name,
      unitPrice: product.price,
      lineTotal: product.price * quantity,
      vendorFulfillmentStatus: 'pending'
    });
  }

  // Delivery fees are now factored into product prices, so do not calculate or add a separate delivery charge.
  const subtotal = orderItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);

  const orderPayload = {
    ...parsed.data,
    items: orderItems,
    totalAmount: subtotal,
    deliveryFee: undefined,
    totalWithDelivery: subtotal,
    id: crypto.randomUUID(),
    status: (isJsonRequest ? 'PENDING_PAYMENT' : 'new') as OrderStatus,
    createdAt: new Date().toISOString()
  };

  console.info('[ORDER_SAVE_START]', { orderId: orderPayload.id });

  let order;
  try {
    order = await createOrder(orderPayload);
    console.info('[ORDER_SAVED]', { orderId: order.id });
  } catch (error) {
    console.error('[ORDER_SAVE_FAILED]', { orderId: orderPayload.id, error });
    return NextResponse.json({ error: 'Order creation failed', stage: 'save-order' }, { status: 500 });
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
