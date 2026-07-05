import Link from 'next/link';
import { CheckoutClient } from '@/components/checkout-client';
import { DeliveryPinMap } from '@/components/delivery-pin-map';
import { getDateInputValue, getMinimumDeliveryDate } from '@/lib/preparation-days';

export const metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false }
};
function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export default function CheckoutPage() {
  const today = new Date();
  const minDeliveryDate = getDateInputValue(getMinimumDeliveryDate(0, today));
  const maxDeliveryDate = getDateInputValue(addDays(today, 14));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-3 text-3xl font-semibold">Checkout</h1>
      <p className="mb-5 text-gray-700">
        Enter the delivery details, then pay securely with Pesapal to confirm your Sendagift UG order.
      </p>
      <CheckoutClient>
        <form action="/api/orders" method="post" className="space-y-4">
          <section className="space-y-3 rounded-xl border bg-white p-6">
            <h2 className="text-xl font-semibold text-ink">Recipient Details</h2>
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
              <span id="same-day-delivery-warning" className="block" />
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
            <p className="text-center text-lg font-bold text-ink">
              We only deliver to Kampala Region and Entebbe area for now
            </p>
            <input type="hidden" name="region" value="Kampala Region" />
            <input type="hidden" name="cityId" value="delivery-pin" />
            <DeliveryPinMap />
            <textarea
              name="note"
              placeholder="Type a note for your loved one that will be delivered with the gift"
              className="w-full rounded border p-2"
              rows={5}
            />
          </section>

          <section className="space-y-3 rounded-xl border bg-white p-6">
            <h2 className="text-xl font-semibold text-ink">Your email (Notifications will be sent here)</h2>
            <input name="email" type="email" required placeholder="Email" className="w-full rounded border p-2" />
          </section>
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
