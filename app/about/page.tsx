import type { Metadata } from 'next';
import Link from 'next/link';
import { categoryPath, getSortedGiftCategories } from '@/lib/categories';
import { JsonLd, STORE_DELIVERY_AREAS, STORE_PHONE, storeJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Sendagift UG is an online gift shop that delivers cakes, flowers, cupcakes and hampers across Kampala and Entebbe in Uganda. Learn how we make gifting easy.',
  alternates: { canonical: '/about' }
};

export default function AboutPage() {
  const categories = getSortedGiftCategories();

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <JsonLd data={storeJsonLd()} />

      <header className="space-y-4">
        <h1 className="text-3xl font-semibold">About Sendagift UG</h1>
        <p className="text-gray-700">
          Sendagift UG is an online gift shop built to make meaningful gifting in Uganda easy, elegant, and reliable.
          Whether you live in Uganda or are sending love from abroad, we help you surprise the people who matter with
          cakes, fresh flowers, cupcakes, gift hampers and thoughtful presents — delivered to their door.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What we do</h2>
        <p className="text-gray-700">
          We focus on curated products, thoughtful packaging, and a delightful customer experience. Every order is
          prepared with care by trusted local vendors, so your gift arrives fresh and beautifully presented. You choose
          the gift and the delivery date; we handle the rest.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Where we deliver</h2>
        <p className="text-gray-700">
          We currently deliver across the {STORE_DELIVERY_AREAS.join(' and ')} areas in Uganda. Order before 9:00 am
          (GMT+3) and most gifts can be delivered the same day — perfect for last-minute birthdays and surprises.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Gifts for every occasion</h2>
        <p className="text-gray-700">
          From birthdays and anniversaries to baby showers, congratulations and festive seasons, there is a gift for
          every moment worth celebrating:
        </p>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={categoryPath(category)}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-ink transition hover:border-ink/40 hover:text-pink-700"
            >
              {category.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Get in touch</h2>
        <p className="text-gray-700">
          Questions about an order or a special request? Call us on{' '}
          <a href={`tel:${STORE_PHONE}`} className="text-pink-700 hover:underline">
            {STORE_PHONE}
          </a>{' '}
          or visit our{' '}
          <Link href="/contact" className="text-pink-700 hover:underline">
            contact page
          </Link>
          . We would love to help you plan the perfect surprise.
        </p>
      </section>
    </div>
  );
}
