import Link from 'next/link';

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-3 text-3xl font-semibold">Checkout / Order request</h1>
      <p className="mb-5 text-gray-700">
        Payments are modular and can be enabled later. For MVP, submit your request and our team confirms availability.
      </p>
      <form action="/api/orders" method="post" className="space-y-3 rounded-xl border bg-white p-6">
        <input name="customerName" required placeholder="Full name" className="w-full rounded border p-2" />
        <input name="email" type="email" required placeholder="Email" className="w-full rounded border p-2" />
        <textarea name="note" placeholder="Gift note / preferences" className="w-full rounded border p-2" rows={5} />
        <button className="rounded bg-ink px-4 py-2 text-white">Send request</button>
      </form>
      <p className="mt-6 text-sm text-gray-600">
        Need bulk orders? <Link href="/contact" className="text-pink-700">Contact us here.</Link>
      </p>
    </div>
  );
}
