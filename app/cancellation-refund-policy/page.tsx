import type { Metadata } from 'next';
import Link from 'next/link';
import { STORE_EMAIL, STORE_PHONE } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Cancellation & Refund Policy',
  description:
    'How order cancellations, refunds, and delivery issues are handled at Sendagift UG. Read our policy for cakes, flowers, cupcakes, and gift hampers delivered in Uganda.',
  alternates: { canonical: '/cancellation-refund-policy' }
};

export default function CancellationRefundPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header className="space-y-4">
        <h1 className="text-3xl font-semibold">Cancellation &amp; Refund Policy</h1>
        <p className="text-gray-700">
          At Sendagift UG we prepare every order fresh, so cakes, flowers, cupcakes, and hampers go into production
          shortly after you order. This policy explains when an order can be cancelled, when a refund applies, and how
          refunds are paid. It applies to all orders placed on sendagift.ug.
        </p>
        <p className="text-sm text-gray-500">Last updated: 4 August 2026</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Cancelling an order</h2>
        <ul className="list-disc space-y-2 pl-5 text-gray-700">
          <li>
            <strong>More than 24 hours before the scheduled delivery date:</strong> you may cancel for a full refund of
            the amount paid, including delivery fees.
          </li>
          <li>
            <strong>Less than 24 hours before delivery, or same-day orders:</strong> your gift may already be in
            preparation. If preparation has not started, we will refund you in full. If it has started, we will refund
            the amount paid minus the cost of work already done, which we will confirm with you before processing.
          </li>
          <li>
            <strong>After the order has been dispatched or delivered:</strong> the order can no longer be cancelled.
          </li>
        </ul>
        <p className="text-gray-700">
          To cancel, call us on{' '}
          <a href={`tel:${STORE_PHONE}`} className="text-pink-700 hover:underline">
            {STORE_PHONE}
          </a>{' '}
          or email{' '}
          <a href={`mailto:${STORE_EMAIL}`} className="text-pink-700 hover:underline">
            {STORE_EMAIL}
          </a>{' '}
          with your order number as soon as possible. Cancellation takes effect from the time we receive your request.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Changes to an order</h2>
        <p className="text-gray-700">
          Want to change the delivery date, address, message card, or the gift itself? Contact us at least 24 hours
          before the scheduled delivery and we will do our best to accommodate the change at no extra cost (any price
          difference between products is payable or refundable). Changes requested on the delivery day depend on
          preparation status and courier availability.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Returns</h2>
        <p className="text-gray-700">
          Because our products are perishable and made to order, we are unable to accept returns of delivered items.
          Instead, if something is wrong with your order, we will make it right through a replacement or refund as
          described below.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. When you are entitled to a refund or replacement</h2>
        <p className="text-gray-700">We will offer a free replacement or a full refund (your choice) if:</p>
        <ul className="list-disc space-y-2 pl-5 text-gray-700">
          <li>the item delivered is materially different from what you ordered;</li>
          <li>the item arrives damaged, spoiled, or in poor condition;</li>
          <li>the order is not delivered at all due to our error or our vendor&apos;s error; or</li>
          <li>we cancel your order because an item is unavailable and no suitable substitute is agreed with you.</li>
        </ul>
        <p className="text-gray-700">
          Please report any problem within 24 hours of delivery, with photos where possible, so we can resolve it
          quickly. Perishable items deteriorate naturally, so we cannot assess complaints raised after this window.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Situations we cannot refund</h2>
        <ul className="list-disc space-y-2 pl-5 text-gray-700">
          <li>
            delivery failed because the recipient details provided were incorrect or incomplete, the recipient was
            unreachable, or the recipient refused the gift (we will attempt to contact you and can re-deliver for an
            additional delivery fee);
          </li>
          <li>minor variations in flower type, colour, or packaging where a substitution of equal or greater value was made because of seasonal availability;</li>
          <li>dissatisfaction with a product that was delivered as described and in good condition; or</li>
          <li>delays caused by events outside our reasonable control, such as extreme weather or road closures (we will always work with you to reschedule).</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. How refunds are paid</h2>
        <ul className="list-disc space-y-2 pl-5 text-gray-700">
          <li>Refunds are made to the original payment method used at checkout (mobile money or card, processed through our payment provider, Pesapal).</li>
          <li>Approved refunds are initiated within 3 business days of approval.</li>
          <li>
            Depending on your bank or mobile money provider, the funds typically reflect within 7–14 business days of
            being initiated. We will share confirmation once the refund has been processed on our side.
          </li>
          <li>Refunds are issued in Ugandan Shillings (UGX) for the amount originally paid.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">7. Failed or duplicate payments</h2>
        <p className="text-gray-700">
          If you were charged but did not receive an order confirmation, or you were charged more than once for the
          same order, contact us with your payment reference and we will verify the transaction with Pesapal and refund
          any amount charged in error in full.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">8. Contact us</h2>
        <p className="text-gray-700">
          For cancellations, refunds, or any questions about this policy, call{' '}
          <a href={`tel:${STORE_PHONE}`} className="text-pink-700 hover:underline">
            {STORE_PHONE}
          </a>
          , email{' '}
          <a href={`mailto:${STORE_EMAIL}`} className="text-pink-700 hover:underline">
            {STORE_EMAIL}
          </a>
          , or reach us through our{' '}
          <Link href="/contact" className="text-pink-700 hover:underline">
            contact page
          </Link>
          . Please include your order number so we can help you faster.
        </p>
      </section>
    </div>
  );
}
