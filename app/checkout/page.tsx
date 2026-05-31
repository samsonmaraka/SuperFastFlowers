import Link from 'next/link';
import { CheckoutClient } from '@/components/checkout-client';
import { DeliveryPinMap } from '@/components/delivery-pin-map';

function toDateInputValue(date: Date) {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export default function CheckoutPage() {
  const today = new Date();
  const minDeliveryDate = toDateInputValue(addDays(today, 2));
  const maxDeliveryDate = toDateInputValue(addDays(today, 14));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-3 text-3xl font-semibold">Checkout</h1>
      <p className="mb-5 text-gray-700">
        Enter the delivery details, then pay securely with Pesapal to confirm your Giftora order.
      </p>
      <CheckoutClient>
      <form action="/api/orders" method="post" className="space-y-3 rounded-xl border bg-white p-6">
        <input
          name="recipientName"
          required
          placeholder="Name of recipient"
          className="w-full rounded border p-2"
        />
        <input
          name="recipientPhone"
          type="tel"
          required
          placeholder="Phone number of recipient"
          className="w-full rounded border p-2"
        />
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-800">Choose day of delivery</span>
          <input
            name="deliveryDate"
            type="date"
            required
            min={minDeliveryDate}
            max={maxDeliveryDate}
            className="w-full rounded border p-2"
          />
          <span className="text-xs text-gray-600">Delivery date must be within 14 days. Items that need more preparation automatically move the earliest available date.</span>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-800">Region</span>
          <select name="region" required className="w-full rounded border p-2" defaultValue="">
            <option value="" disabled>
              Please select
            </option>
            <option value="Kampala Region">Kampala Region</option>
            <option value="Entebbe area">Entebbe area</option>
          </select>
          <span className="text-xs text-gray-600">We only deliver to Kampala Region and Entebbe area for now.</span>
        </label>
        <input type="hidden" name="cityId" value="delivery-pin" />
        <DeliveryPinMap />
        <input name="email" type="email" required placeholder="Email" className="w-full rounded border p-2" />
        <textarea name="note" placeholder="Gift note / preferences" className="w-full rounded border p-2" rows={5} />
      </form>
      </CheckoutClient>
      <p className="mt-6 text-sm text-gray-600">
        Need bulk orders?{' '}
        <Link href="/contact" className="text-pink-700">
          Contact us here.
        </Link>
      </p>
    </div>
  );
}
