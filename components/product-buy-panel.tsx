'use client';

import { useEffect, useRef, useState } from 'react';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { FlavourPicker } from '@/components/flavour-picker';
import { SendThisGiftButton } from '@/components/send-this-gift-button';
import { resolveProductFlavours, type FlavourId } from '@/lib/flavours';
import type { Product } from '@/lib/types';

const HINT_ID = 'flavour-required-hint';

// Holds the flavour selection so the picker and both buy controls agree on which
// cart line they are acting on. Selecting a different flavour re-points the
// controls at that flavour's line, which is why the stepper resets to "Add to cart".
export function ProductBuyPanel({ product }: { product: Product }) {
  const flavourOptions = resolveProductFlavours(product);
  const requiresFlavour = flavourOptions.length > 0;
  const [flavour, setFlavour] = useState<FlavourId | null>(null);
  const [wasBlocked, setWasBlocked] = useState(false);
  const [isPickerHighlighted, setIsPickerHighlighted] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    },
    []
  );

  // Sending without a flavour is a recoverable slip, not an error worth a modal:
  // walk the person to the picker, focus it and flash a ring so the click has a
  // visible result instead of doing nothing.
  const onBlocked = () => {
    setWasBlocked(true);

    const picker = pickerRef.current;
    if (!picker) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // 'nearest' leaves the page alone when the picker is already on screen, which
    // it usually is, and scrolls the minimum when it is not.
    picker.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
    picker.querySelector<HTMLInputElement>('input[type="radio"]')?.focus({ preventScroll: true });

    setIsPickerHighlighted(true);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setIsPickerHighlighted(false), 2000);
  };

  const onChangeFlavour = (next: FlavourId) => {
    setFlavour(next);
    setWasBlocked(false);
  };

  return (
    <div className="space-y-4">
      {requiresFlavour ? (
        <div
          ref={pickerRef}
          className={`rounded-xl transition ${isPickerHighlighted ? 'ring-2 ring-pink-700 ring-offset-2' : ''}`}
        >
          <FlavourPicker options={flavourOptions} value={flavour} onChange={onChangeFlavour} />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <SendThisGiftButton
          product={product}
          flavour={flavour}
          requiresFlavour={requiresFlavour}
          onBlocked={onBlocked}
          describedBy={requiresFlavour && !flavour ? HINT_ID : undefined}
        />
        <div className="sm:pt-0.5">
          <AddToCartButton product={product} flavour={flavour} requiresFlavour={requiresFlavour} />
        </div>
      </div>

      {requiresFlavour && !flavour ? (
        <p
          id={HINT_ID}
          className={`text-sm ${wasBlocked ? 'font-medium text-pink-700' : 'text-gray-600'}`}
          role="status"
        >
          {wasBlocked
            ? 'Pick a flavour above first, then send your gift.'
            : 'Choose a flavour to add this gift to your cart.'}
        </p>
      ) : null}
    </div>
  );
}
