'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, ReactElement, ReactNode, cloneElement, isValidElement, useEffect, useMemo, useState } from 'react';
import { CartItem, readCart } from '@/lib/cart-storage';
import { formatUgx } from '@/lib/format';
import { DEFAULT_PREPARATION_DAYS, formatDeliveryDateLabel, getDateInputValue, getMinimumDeliveryDate } from '@/lib/preparation-days';

type CheckoutResponse = {
  redirect_url?: string;
  error?: string;
};

export function CheckoutClient({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<'pesapal' | 'test' | null>(null);
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    const syncCart = () => setItems(readCart());
    syncCart();

    window.addEventListener('giftora-cart-updated', syncCart);
    window.addEventListener('storage', syncCart);
    return () => {
      window.removeEventListener('giftora-cart-updated', syncCart);
      window.removeEventListener('storage', syncCart);
    };
  }, []);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const maxPreparationDays = useMemo(
    () => Math.max(0, ...items.map((item) => item.preparationDays ?? DEFAULT_PREPARATION_DAYS)),
    [items]
  );
  const minDeliveryDate = useMemo(
    () => getDateInputValue(getMinimumDeliveryDate(maxPreparationDays)),
    [maxPreparationDays]
  );
  const minDeliveryDateLabel = useMemo(() => formatDeliveryDateLabel(minDeliveryDate), [minDeliveryDate]);
  const serializedItems = useMemo(
    () =>
      items.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        lineTotal: item.price * item.quantity
      })),
    [items]
  );

  useEffect(() => {
    const deliveryDateInput = document.querySelector<HTMLInputElement>('input[name="deliveryDate"]');
    if (!deliveryDateInput) return;

    deliveryDateInput.min = minDeliveryDate;
    if (deliveryDateInput.value && deliveryDateInput.value < minDeliveryDate) {
      deliveryDateInput.value = '';
    }
  }, [minDeliveryDate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const requestedMode = submitter?.value === 'test' ? 'test' : 'pesapal';

    setCheckoutError('');
    setIsSubmitting(true);
    setSubmitMode(requestedMode);

    try {
      const formData = new FormData(event.currentTarget);
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: String(formData.get('recipientName') || ''),
          recipientPhone: String(formData.get('recipientPhone') || ''),
          deliveryDate: String(formData.get('deliveryDate') || ''),
          region: String(formData.get('region') || ''),
          cityId: String(formData.get('cityId') || ''),
          deliveryLatitude: formData.get('deliveryLatitude') || undefined,
          deliveryLongitude: formData.get('deliveryLongitude') || undefined,
          deliveryPinUrl: String(formData.get('deliveryPinUrl') || ''),
          email: String(formData.get('email') || ''),
          note: String(formData.get('note') || ''),
          items: serializedItems,
          totalAmount: subtotal
        })
      });
      const orderJson = await orderResponse.json();
      if (!orderResponse.ok || !orderJson.order?.id) {
        throw new Error(orderJson.error ? 'Please check your checkout details and try again.' : 'Order creation failed. Please try again.');
      }

      const paymentEndpoint = requestedMode === 'test' ? '/api/pesapal/test-success' : '/api/pesapal/checkout';
      const checkoutResponse = await fetch(paymentEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderJson.order.id })
      });
      const checkoutJson = (await checkoutResponse.json()) as CheckoutResponse;
      if (!checkoutResponse.ok || !checkoutJson.redirect_url) {
        throw new Error(checkoutJson.error || 'Payment could not be started. Please try again.');
      }

      window.location.href = checkoutJson.redirect_url;
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Payment could not be started. Please try again.');
      setIsSubmitting(false);
      setSubmitMode(null);
    }
  }

  const enhancedChildren = isValidElement(children)
    ? cloneElement(children as ReactElement, { onSubmit: handleSubmit },
        <>
          {(children as ReactElement).props.children}
          <input type="hidden" name="itemsJson" value={JSON.stringify(serializedItems)} />
          <input type="hidden" name="totalAmount" value={String(subtotal)} />
          <p className="rounded border border-pink-100 bg-pink-50 p-3 text-sm text-gray-700">
            Earliest delivery for these items is {minDeliveryDateLabel}.
          </p>
          {checkoutError ? <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{checkoutError}</p> : null}
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex flex-col gap-2">
              <button
                type="submit"
                name="paymentMode"
                value="pesapal"
                disabled={isSubmitting}
                className="inline-flex flex-wrap items-center justify-center gap-2 rounded bg-ink px-4 py-2 text-white transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{submitMode === 'pesapal' ? 'Starting secure payment…' : 'Pay with MTN momo, Airtelmoney or card'}</span>
                <span className="flex items-center gap-1.5" aria-hidden="true">
                  <Image src="/momo.png" alt="" width={447} height={447} className="h-7 w-auto rounded bg-white/90 p-0.5 object-contain" />
                  <Image src="/Airtelmoney.png" alt="" width={554} height={554} className="h-7 w-auto rounded bg-white/90 p-0.5 object-contain" />
                  <Image src="/card.png" alt="" width={628} height={488} className="h-7 w-auto rounded bg-white/90 p-0.5 object-contain" />
                </span>
              </button>
              <span className="text-xs text-gray-600">Secure payment opens after your order details are saved.</span>
            </div>
            {/* Test successful payment button disabled for production checkout.
            <button
              type="submit"
              name="paymentMode"
              value="test"
              disabled={isSubmitting}
              className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitMode === 'test' ? 'Registering test payment…' : 'Test successful payment'}
            </button>
            */}
          </div>
        </>
      )
    : children;

  if (!items.length) {
    return (
      <section className="mb-6 rounded-xl border border-blush bg-white p-5">
        <h2 className="text-xl font-semibold text-ink">Your cart is empty</h2>
        <p className="mt-2 text-sm text-gray-600">Add a few gifts to your cart before submitting an order request.</p>
        <Link href="/shop" className="mt-4 inline-block rounded bg-ink px-4 py-2 text-white">
          Continue shopping
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="mb-6 rounded-xl border border-blush bg-white p-5">
        <h2 className="mb-3 text-xl font-semibold text-ink">Order summary</h2>
        <div className="space-y-2">
          {items.map((item) => {
            const lineTotal = item.price * item.quantity;
            return (
              <div key={item.productId} className="flex items-start justify-between gap-4 border-b border-blush/70 pb-2 text-sm last:border-0">
                <div>
                  <p className="font-medium text-ink">{item.name}</p>
                  <p className="text-gray-600">Qty: {item.quantity}</p>
                  <p className="text-gray-600">Unit price: UGX {formatUgx(item.price)}</p>
                </div>
                <p className="font-semibold text-ink">UGX {formatUgx(lineTotal)}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 space-y-2 border-t border-blush pt-3 text-sm text-ink">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>UGX {formatUgx(subtotal)}</span>
          </div>
          {/* Delivery fees are now factored into product prices.
          <div className="flex items-center justify-between">
            <span>Delivery fee</span>
            <span>Calculated after delivery pin</span>
          </div>
          */}
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total</span>
            <span>UGX {formatUgx(subtotal)}</span>
          </div>
        </div>
      </section>
      {enhancedChildren}
    </>
  );
}
