import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/orders-repo';
import { orderSchema } from '@/lib/validators';
import { getProductByIdOrSlug, listProducts } from '@/lib/products-repo';
import { calculateVendorDeliveryFee } from '@/lib/delivery-fee';
import { getAddon } from '@/lib/addons-repo';
import { OrderItem, OrderStatus } from '@/lib/types';
import { getDateOnlyAtUtcMidnight, getGmtPlus3DateOnlyAtUtcMidnight, getMinimumDeliveryDate, getRequiredPreparationDays, isBeforeSameDayDeliveryCutoff, isSameDayEligible } from '@/lib/preparation-days';
import { getFlavour, resolveProductFlavours } from '@/lib/flavours';

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
    let parsedItems: Array<{ productId: string; quantity: number; name?: string; price?: number; unitPrice?: number; isAddon?: boolean; flavour?: string }> = [];
    try {
      const maybeItems = JSON.parse(itemsJson) as unknown;
      if (Array.isArray(maybeItems)) {
        parsedItems = maybeItems as Array<{ productId: string; quantity: number; name?: string; price?: number; unitPrice?: number; isAddon?: boolean; flavour?: string }>;
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
        lineTotal: unitPrice * quantity,
        isAddon: item.isAddon === true ? true : undefined,
        flavour: item.flavour || undefined
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
      customerPhone: String(form.get('customerPhone') || ''),
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
  // Add-ons ride along with the main gift, so they never extend preparation time or break same-day eligibility.
  const giftItems = parsed.data.items.filter((item) => !item.isAddon);
  const requiredPreparationDays = getRequiredPreparationDays(giftItems, products);
  // Counts boxes, not cart lines: splitting an order across flavours must not move eligibility.
  const isSameDayEligibleOrder = isSameDayEligible(giftItems.length, requiredPreparationDays);
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
    if (item.isAddon) {
      const addon = await getAddon(item.productId);
      if (!addon || (addon.status ?? 'active') !== 'active') {
        return NextResponse.json({ error: `Add-on ${item.name || item.productId} is no longer available.` }, { status: 400 });
      }

      orderItems.push({
        productId: addon.id,
        quantity: item.quantity,
        name: addon.name,
        unitPrice: addon.price,
        lineTotal: addon.price * item.quantity,
        isAddon: true,
        vendorFulfillmentStatus: 'pending'
      });
      continue;
    }

    const product = await getProductByIdOrSlug(item.productId);
    if (!product) {
      return NextResponse.json({ error: `Product ${item.productId} is no longer available.` }, { status: 400 });
    }

    // The client is never trusted for flavour any more than it is for price: the
    // product's own allow-list decides what is orderable, and the label is snapshotted.
    const allowedFlavours = resolveProductFlavours(product);
    const requestedFlavour = item.flavour;

    if (!allowedFlavours.length && requestedFlavour) {
      return NextResponse.json({ error: `${product.name} does not come in different flavours.` }, { status: 400 });
    }

    if (allowedFlavours.length && !requestedFlavour) {
      return NextResponse.json({ error: `Please choose a flavour for ${product.name}.` }, { status: 400 });
    }

    if (requestedFlavour && !allowedFlavours.some((flavour) => flavour.id === requestedFlavour)) {
      const label = getFlavour(requestedFlavour)?.label || requestedFlavour;
      return NextResponse.json({ error: `${label} is not available for ${product.name}. Please choose another flavour.` }, { status: 400 });
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
      ...(requestedFlavour
        ? { flavourId: requestedFlavour, flavourLabel: getFlavour(requestedFlavour)?.label || requestedFlavour }
        : {}),
      vendorFulfillmentStatus: 'pending'
    });
  }

  // Delivery is charged per distinct vendor fulfilling the order (UGX 5,000 each).
  const subtotal = orderItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  const deliveryFee = calculateVendorDeliveryFee(orderItems);
  const totalWithDelivery = subtotal + deliveryFee;

  const orderPayload = {
    ...parsed.data,
    items: orderItems,
    totalAmount: subtotal,
    deliveryFee,
    totalWithDelivery,
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
