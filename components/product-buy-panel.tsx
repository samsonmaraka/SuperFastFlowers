'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { CustomFieldsForm, customFieldInputId } from '@/components/custom-fields-form';
import { FlavourPicker } from '@/components/flavour-picker';
import { SendThisGiftButton } from '@/components/send-this-gift-button';
import { resolveProductFlavours, type FlavourId } from '@/lib/flavours';
import { buildCustomizationValues, findMissingRequiredField, resolveProductCustomFields } from '@/lib/customization';
import type { Product } from '@/lib/types';

const HINT_ID = 'flavour-required-hint';

// Holds the flavour selection and personalised messages so the inputs and both
// buy controls agree on which cart line they are acting on. Changing either
// re-points the controls at a different line, which is why the stepper resets
// to "Add to cart".
export function ProductBuyPanel({ product }: { product: Product }) {
  const flavourOptions = resolveProductFlavours(product);
  const requiresFlavour = flavourOptions.length > 0;
  const customFields = useMemo(() => resolveProductCustomFields(product), [product]);
  const [flavour, setFlavour] = useState<FlavourId | null>(null);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [wasBlocked, setWasBlocked] = useState(false);
  const [highlighted, setHighlighted] = useState<'flavour' | 'custom' | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const customRef = useRef<HTMLDivElement | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    },
    []
  );

  const customizations = useMemo(() => buildCustomizationValues(customFields, customValues), [customFields, customValues]);
  const missingField = findMissingRequiredField(customFields, customValues);
  const isMissingFlavour = requiresFlavour && !flavour;
  const blockedReason = isMissingFlavour ? 'Choose a flavour' : missingField ? `Fill in "${missingField.name}"` : null;

  // Sending with a choice missing is a recoverable slip, not an error worth a
  // modal: walk the person to what is missing, focus it and flash a ring so the
  // click has a visible result instead of doing nothing.
  const onBlocked = () => {
    setWasBlocked(true);

    const target = isMissingFlavour ? 'flavour' : 'custom';
    const container = target === 'flavour' ? pickerRef.current : customRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // 'nearest' leaves the page alone when the target is already on screen, and
    // scrolls the minimum when it is not.
    container.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
    const focusTarget =
      target === 'flavour'
        ? container.querySelector<HTMLInputElement>('input[type="radio"]')
        : missingField
          ? document.getElementById(customFieldInputId(customFields.indexOf(missingField)))
          : null;
    focusTarget?.focus({ preventScroll: true });

    setHighlighted(target);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlighted(null), 2000);
  };

  const onChangeFlavour = (next: FlavourId) => {
    setFlavour(next);
    setWasBlocked(false);
  };

  const onChangeCustomValue = (name: string, value: string) => {
    setCustomValues((prev) => ({ ...prev, [name]: value }));
    setWasBlocked(false);
  };

  return (
    <div className="space-y-4">
      {requiresFlavour ? (
        <div
          ref={pickerRef}
          className={`rounded-xl transition ${highlighted === 'flavour' ? 'ring-2 ring-pink-700 ring-offset-2' : ''}`}
        >
          <FlavourPicker options={flavourOptions} value={flavour} onChange={onChangeFlavour} />
        </div>
      ) : null}

      {customFields.length ? (
        <div
          ref={customRef}
          className={`rounded-xl transition ${highlighted === 'custom' ? 'ring-2 ring-pink-700 ring-offset-2' : ''}`}
        >
          <CustomFieldsForm fields={customFields} values={customValues} onChange={onChangeCustomValue} />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <SendThisGiftButton
          product={product}
          flavour={flavour}
          customizations={customizations}
          blockedReason={blockedReason}
          onBlocked={onBlocked}
          describedBy={blockedReason ? HINT_ID : undefined}
        />
        <div className="sm:pt-0.5">
          <AddToCartButton product={product} flavour={flavour} customizations={customizations} blockedReason={blockedReason} />
        </div>
      </div>

      {blockedReason ? (
        <p
          id={HINT_ID}
          className={`text-sm ${wasBlocked ? 'font-medium text-pink-700' : 'text-gray-600'}`}
          role="status"
        >
          {isMissingFlavour
            ? wasBlocked
              ? 'Pick a flavour above first, then send your gift.'
              : 'Choose a flavour to add this gift to your cart.'
            : wasBlocked
              ? `Fill in "${missingField?.name}" above first, then send your gift.`
              : 'Fill in the required messages to add this gift to your cart.'}
        </p>
      ) : null}
    </div>
  );
}
