import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/orders-repo';
import { orderSchema } from '@/lib/validators';

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  let body: unknown;

  if (contentType.includes('application/json')) {
    body = await req.json();
  } else {
    const form = await req.formData();
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
      items: [{ productId: 'manual-order', quantity: 1 }]
    };
  }

  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const order = await createOrder({
    ...parsed.data,
    id: crypto.randomUUID(),
    status: 'new',
    createdAt: new Date().toISOString()
  });

  return NextResponse.json({ ok: true, order });
}
