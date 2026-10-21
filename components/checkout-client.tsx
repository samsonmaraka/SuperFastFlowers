'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, ReactElement, ReactNode, cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CartItem, readCart } from '@/lib/cart-storage';
import { calculateVendorDeliveryFee } from '@/lib/delivery-fee';
import { formatUgx } from '@/lib/format';
import { DEFAULT_PREPARATION_DAYS, formatDeliveryDateLabel, getDateInputValue, getGmtPlus3DateOnlyAtUtcMidnight, getMaximumDeliveryDate, getMinimumDeliveryDate, isBeforeSameDayDeliveryCutoff, isSameDayEligible } from '@/lib/preparation-days';
import { getFlavourLabel } from '@/lib/flavours';
import { buildWhatsAppOrderUrl } from '@/lib/whatsapp-order';
import { cartItemToGaItem, trackEcommerce } from '@/lib/analytics';

type CheckoutResponse = {
  redirect_url?: string;
  error?: string;
};

export function CheckoutClient({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<'pesapal' | 'test' | 'whatsapp' | null>(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [sameDayWarningTarget, setSameDayWarningTarget] = useState<HTMLElement | null>(null);
  const [now, setNow] = useState(() => new Date());

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

  useEffect(() => {
    setSameDayWarningTarget(document.getElementById('same-day-delivery-warning'));

    const timer = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Fire once per checkout visit, as soon as the cart has been read from storage.
  const hasTrackedBeginCheckout = useRef(false);
  useEffect(() => {
    if (hasTrackedBeginCheckout.current || items.length === 0) return;
    hasTrackedBeginCheckout.current = true;
    trackEcommerce('begin_checkout', { items: items.map(cartItemToGaItem) });
  }, [items]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const deliveryFee = useMemo(() => calculateVendorDeliveryFee(items), [items]);
  const totalWithDelivery = useMemo(() => subtotal + deliveryFee, [subtotal, deliveryFee]);
  // Add-ons ride along with the main gift, so they don't affect preparation time or same-day eligibility.
  const giftItems = useMemo(() => items.filter((item) => !item.isAddon), [items]);
  const maxPreparationDays = useMemo(
    () => Math.max(0, ...giftItems.map((item) => item.preparationDays ?? DEFAULT_PREPARATION_DAYS)),
    [giftItems]
  );
  const isSameDayEligibleCart = useMemo(
    () => isSameDayEligible(giftItems.length, maxPreparationDays),
    [giftItems.length, maxPreparationDays]
  );
  const isBeforeCutoff = useMemo(() => isBeforeSameDayDeliveryCutoff(now), [now]);
  const minDeliveryDate = useMemo(
    () =>
      getDateInputValue(
        isSameDayEligibleCart && isBeforeCutoff
          ? getGmtPlus3DateOnlyAtUtcMidnight(now)
          : getMinimumDeliveryDate(maxPreparationDays, now)
      ),
    [isSameDayEligibleCart, isBeforeCutoff, maxPreparationDays, now]
  );
  const minDeliveryDateLabel = useMemo(() => formatDeliveryDateLabel(minDeliveryDate), [minDeliveryDate]);
  const maxDeliveryDate = useMemo(() => getDateInputValue(getMaximumDeliveryDate(now)), [now]);
  const sameDayDeliveryWarning = isSameDayEligibleCart
    ? isBeforeCutoff
      ? 'Order before 9:00 am (GMT+3) to have your items delivered same day.'
      : 'Earliest date is tomorrow, order by 9:00 am (GMT+3) to have this item delivered same day.'
    : '';

  const serializedItems = useMemo(
    () =>
      items.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        lineTotal: item.price * item.quantity,
        isAddon: item.isAddon || undefined,
        message: item.isAddon ? item.message || undefined : undefined,
        customizations: item.isAddon ? undefined : item.customizations,
        flavour: item.flavour || undefined
      })),
    [items]
  );

  useEffect(() => {
    const deliveryDateInput = document.querySelector<HTMLInputElement>('input[name="deliveryDate"]');
    if (!deliveryDateInput) return;

    deliveryDateInput.min = minDeliveryDate;
    deliveryDateInput.max = maxDeliveryDate;
    if (
      deliveryDateInput.value &&
      (deliveryDateInput.value < minDeliveryDate || deliveryDateInput.value > maxDeliveryDate)
    ) {
      deliveryDateInput.value = '';
    }
  }, [maxDeliveryDate, minDeliveryDate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const requestedMode = submitter?.value === 'test' ? 'test' : submitter?.value === 'whatsapp' ? 'whatsapp' : 'pesapal';

    setCheckoutError('');
    setIsSubmitting(true);
    setSubmitMode(requestedMode);

    const formData = new FormData(event.currentTarget);

    try {
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
          customerPhone: String(formData.get('customerPhone') || ''),
          note: String(formData.get('note') || ''),
          items: serializedItems,
          totalAmount: subtotal
        })
      });
      const orderJson = await orderResponse.json();
      if (requestedMode === 'whatsapp') {
        // Saving first gives staff an order reference to match the chat against, but
        // a failed save must not cost us the customer: WhatsApp opens either way.
        const orderId = orderResponse.ok ? orderJson.order?.id : undefined;
        window.location.href = buildWhatsAppOrderUrl({ orderId, items, subtotal, deliveryFee, form: formData });
        setIsSubmitting(false);
        setSubmitMode(null);
        return;
      }

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
      if (requestedMode === 'whatsapp') {
        window.location.href = buildWhatsAppOrderUrl({ items, subtotal, deliveryFee, form: formData });
        setIsSubmitting(false);
        setSubmitMode(null);
        return;
      }
      setCheckoutError(error instanceof Error ? error.message : 'Payment could not be started. Please try again.');
      setIsSubmitting(false);
      setSubmitMode(null);
    }
  }

  const sameDayDeliveryWarningElement =
    sameDayDeliveryWarning && sameDayWarningTarget
      ? createPortal(
          <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
            {sameDayDeliveryWarning}
          </p>,
          sameDayWarningTarget
        )
      : null;

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
              {deliveryFee > 0 ? (
                <span className="text-sm font-medium text-gray-700">
                  Delivery fees of UGX {formatUgx(deliveryFee)} will be added to this order.
                </span>
              ) : null}
            </div>
            <div className="inline-flex flex-col gap-2">
              <button
                type="submit"
                name="paymentMode"
                value="whatsapp"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded bg-[#25D366] px-4 py-2 font-medium text-white transition hover:bg-[#1da851] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                  <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.42 9.42 0 0 1-1.44-5.03c0-5.2 4.24-9.44 9.45-9.44 2.52 0 4.9.99 6.68 2.77a9.37 9.37 0 0 1 2.76 6.68c0 5.21-4.24 9.44-9.46 9.44zm8.04-17.48A11.3 11.3 0 0 0 12.05.7C5.78.7.68 5.8.68 12.06c0 2 .52 3.96 1.52 5.68L.58 23.3l5.7-1.5a11.33 11.33 0 0 0 5.77 1.47h.01c6.26 0 11.36-5.1 11.36-11.36 0-3.04-1.18-5.89-3.33-8.04z" />
                </svg>
                <span>{submitMode === 'whatsapp' ? 'Opening WhatsApp…' : 'Order on WhatsApp'}</span>
              </button>
              <span className="text-xs text-gray-600">Sends your order details to us on WhatsApp to confirm and pay.</span>
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
              <div key={item.lineId} className="flex items-start justify-between gap-4 border-b border-blush/70 pb-2 text-sm last:border-0">
                <div>
                  <p className="font-medium text-ink">
                    {item.name}
                    {item.isAddon ? (
                      <span className="ml-2 rounded-full bg-pink-100 px-2 py-0.5 text-xs font-semibold text-pink-700">Add-on</span>
                    ) : null}
                  </p>
                  {item.flavour ? <p className="font-semibold text-pink-700">{getFlavourLabel(item.flavour)}</p> : null}
                  {(item.customizations || []).map((entry) => (
                    <p key={entry.name} className="text-pink-700">
                      {entry.name}: “{entry.value}”
                    </p>
                  ))}
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
          {deliveryFee > 0 ? (
            <div className="flex items-center justify-between">
              <span>Delivery fee</span>
              <span>UGX {formatUgx(deliveryFee)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total</span>
            <span>UGX {formatUgx(totalWithDelivery)}</span>
          </div>
        </div>
      </section>
      {sameDayDeliveryWarningElement}
      {enhancedChildren}
    </>
  );
}
