import Link from 'next/link';
import { ClearCartOnSuccess } from '@/components/clear-cart-on-success';
import { deliveryAreas } from '@/lib/delivery-areas';
import { formatUgx } from '@/lib/format';
import { getOrderById } from '@/lib/orders-repo';
import { listProducts } from '@/lib/products-repo';

type SuccessPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const params = (await searchParams) || {};
  const rawOrderId = params.orderId;
  const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;

  const order = orderId ? await getOrderById(orderId) : null;
  const products = await listProducts();
  const productMap = new Map(products.map((product) => [product.id, product]));

  const orderItems =
    order?.items.map((item) => {
      const product = productMap.get(item.productId);
      const unitPrice = product?.price || 0;
      return {
        ...item,
        name: product?.name || 'Item',
        unitPrice,
        lineTotal: unitPrice * item.quantity
      };
    }) || [];

  const totalBill = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const areaLabel = deliveryAreas.find((area) => area.value === order?.cityId)?.label;

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
          </div>

          <div>
            <p className="mb-2 text-sm text-gray-700">Order details:</p>
            <div className="space-y-2">
              {orderItems.map((item) => (
                <div key={item.productId} className="flex items-start justify-between gap-4 border-b border-blush/70 pb-2 text-sm last:border-0">
                  <div>
                    <p className="font-medium text-ink">{item.name}</p>
                    <p className="text-gray-600">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-ink">UGX {formatUgx(item.lineTotal)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-blush pt-3 text-base font-semibold text-ink">
            <span>Total bill</span>
            <span>UGX {formatUgx(totalBill)}</span>
          </div>
        </div>
      ) : null}

      <div className="flex gap-3">
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
