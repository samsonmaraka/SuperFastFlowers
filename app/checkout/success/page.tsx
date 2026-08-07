import Link from 'next/link';
import { ClearCartOnSuccess } from '@/components/clear-cart-on-success';
import { DownloadOrderPdfButton } from '@/components/download-order-pdf-button';
import { deliveryAreas } from '@/lib/delivery-areas';
import { formatUgx } from '@/lib/format';
import { getOrderById } from '@/lib/orders-repo';

export const metadata = {
  title: 'Order success',
  robots: { index: false, follow: false }
};
type SuccessPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const params = (await searchParams) || {};
  const rawOrderId = params.orderId;
  const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;
  console.info('[checkout-success] orderId received', { hasOrderId: Boolean(orderId), orderId: orderId || null });

  const order = orderId ? await getOrderById(orderId) : null;
  console.info('[checkout-success] lookup result', {
    orderFound: Boolean(order),
    hasItems: Boolean(order?.items?.length),
    hasTotalAmount: typeof order?.totalAmount === 'number',
    orderFieldNames: order ? Object.keys(order).sort() : []
  });

  const orderItems =
    order?.items?.map((item) => {
      const unitPrice = item.unitPrice || 0;
      return {
        ...item,
        name: item.name || item.productId || 'Item',
        unitPrice,
        lineTotal: unitPrice * item.quantity
      };
    }) || [];

  const subtotal = typeof order?.totalAmount === 'number' ? order.totalAmount : orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = typeof order?.deliveryFee === 'number' ? order.deliveryFee : 0;
  const totalBill = typeof order?.totalWithDelivery === 'number' ? order.totalWithDelivery : subtotal + deliveryFee;
  const areaLabel = order?.cityId && order.cityId !== 'delivery-pin' ? deliveryAreas.find((area) => area.value === order.cityId)?.label : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <ClearCartOnSuccess />
      <h1 className="mb-3 text-3xl font-semibold">Order request sent successfully</h1>
      <p className="mb-4 text-gray-700">Thank you! Your order request has been received.</p>
      <div className="mb-6 rounded-xl border bg-white p-5">
        <p className="text-sm text-gray-700">Order reference:</p>
        <p className="text-lg font-semibold text-ink">{orderId || 'Not available'}</p>
      </div>

      {order ? (
        <div className="mb-6 space-y-4 rounded-xl border bg-white p-5">
          <div>
            <p className="text-sm text-gray-700">Delivery address:</p>
            <p className="font-semibold text-ink">
              {order.region}
              {areaLabel ? `, ${areaLabel}` : ''}
            </p>
            <p className="mt-1 text-sm text-gray-700">Recipient: {order.recipientName}</p>
          </div>

          <div>
            <p className="mb-2 text-sm text-gray-700">Order details:</p>
            <div className="space-y-2">
              {orderItems.map((item) => (
                <div
                  key={`${item.productId}-${item.flavourId ?? ''}`}
                  className="flex items-start justify-between gap-4 border-b border-blush/70 pb-2 text-sm last:border-0"
                >
                  <div>
                    <p className="font-medium text-ink">{item.name}</p>
                    {item.flavourLabel ? <p className="font-semibold text-pink-700">{item.flavourLabel}</p> : null}
                    <p className="text-gray-600">Qty: {item.quantity}</p>
                    <p className="text-gray-600">Unit price: UGX {formatUgx(item.unitPrice)}</p>
                  </div>
                  <p className="font-semibold text-ink">UGX {formatUgx(item.lineTotal)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-blush pt-3 text-sm text-ink">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>UGX {formatUgx(subtotal)}</span>
            </div>
            {deliveryFee > 0 ? (
              <div className="flex items-center justify-between">
                <span>Delivery fee</span>
                <span>UGX {formatUgx(deliveryFee)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between pt-1 text-base font-semibold">
              <span>Total</span>
              <span>UGX {formatUgx(totalBill)}</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 print:hidden">
        {order ? <DownloadOrderPdfButton /> : null}
        <Link href="/" className="rounded bg-ink px-4 py-2 text-white">
          Continue shopping
        </Link>
        <Link href="/contact" className="rounded border px-4 py-2">
          Contact support
        </Link>
      </div>
    </div>
  );
}
