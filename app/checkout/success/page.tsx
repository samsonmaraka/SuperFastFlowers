import Link from 'next/link';

type SuccessPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const params = (await searchParams) || {};
  const rawOrderId = params.orderId;
  const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-3 text-3xl font-semibold">Order request sent successfully</h1>
      <p className="mb-4 text-gray-700">Thank you! Your order request has been received.</p>
      <div className="mb-6 rounded-xl border bg-white p-5">
        <p className="text-sm text-gray-700">Order reference:</p>
        <p className="text-lg font-semibold text-ink">{orderId || 'Not available'}</p>
      </div>
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
