import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd, STORE_DELIVERY_AREAS, STORE_EMAIL, STORE_PHONE, storeJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Contact Sendagift UG by phone or email for gift orders and delivery questions. We deliver cakes, flowers, cupcakes and hampers across Kampala and Entebbe in Uganda.',
  alternates: { canonical: '/contact' }
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <JsonLd data={storeJsonLd()} />

      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">Contact us</h1>
        <p className="text-gray-700">
          Need help choosing a gift, tracking an order, or planning a surprise delivery? We are happy to help — reach
          us any time by phone or email.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-blush bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">Call us</h2>
          <p className="mt-2 text-gray-700">
            <a href={`tel:${STORE_PHONE}`} className="text-pink-700 hover:underline">
              {STORE_PHONE}
            </a>
          </p>
          <p className="mt-1 text-sm text-gray-600">Fastest for same-day delivery questions and urgent orders.</p>
        </div>

        <div className="rounded-xl border border-blush bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">Email us</h2>
          <p className="mt-2 text-gray-700">
            <a href={`mailto:${STORE_EMAIL}`} className="text-pink-700 hover:underline">
              {STORE_EMAIL}
            </a>
          </p>
          <p className="mt-1 text-sm text-gray-600">Best for special requests, bulk orders and feedback.</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Delivery areas</h2>
        <p className="text-gray-700">
          We deliver gifts across the {STORE_DELIVERY_AREAS.join(' and ')} areas in Uganda. Order before 9:00 am
          (GMT+3) and most gifts can be delivered the same day.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Ready to send a gift?</h2>
        <p className="text-gray-700">
          Browse cakes, flowers, cupcakes and hampers for every occasion in our{' '}
          <Link href="/shop" className="text-pink-700 hover:underline">
            gift shop
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
