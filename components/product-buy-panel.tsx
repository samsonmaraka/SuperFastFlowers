'use client';

import { useEffect, useRef, useState } from 'react';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { FlavourPicker } from '@/components/flavour-picker';
import { FlavourRequiredDialog } from '@/components/flavour-required-dialog';
import { SendThisGiftButton } from '@/components/send-this-gift-button';
import { resolveProductFlavours, type FlavourId } from '@/lib/flavours';
import type { Product } from '@/lib/types';

// Holds the flavour selection so the picker and both buy controls agree on which
// cart line they are acting on. Selecting a different flavour re-points the
// controls at that flavour's line, which is why the stepper resets to "Add to cart".
export function ProductBuyPanel({ product }: { product: Product }) {
  const flavourOptions = resolveProductFlavours(product);
  const requiresFlavour = flavourOptions.length > 0;
  const [flavour, setFlavour] = useState<FlavourId | null>(null);
  const [isFlavourDialogOpen, setIsFlavourDialogOpen] = useState(false);
  const [isPickerHighlighted, setIsPickerHighlighted] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
  }, []);

  // Closing the dialog is only useful if it leaves the person next to the control
  // it was pointing at, so scroll it into view, focus it and flash a ring.
  const closeFlavourDialog = () => {
    setIsFlavourDialogOpen(false);

    const picker = pickerRef.current;
    if (!picker) return;

    picker.scrollIntoView({ behavior: 'smooth', block: 'center' });
    picker.querySelector<HTMLInputElement>('input[type="radio"]')?.focus({ preventScroll: true });

    setIsPickerHighlighted(true);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setIsPickerHighlighted(false), 2000);
  };

  return (
    <div className="space-y-4">
      {requiresFlavour ? (
        <div
          ref={pickerRef}
          className={`rounded-xl transition ${isPickerHighlighted ? 'ring-2 ring-pink-700 ring-offset-2' : ''}`}
        >
          <FlavourPicker options={flavourOptions} value={flavour} onChange={setFlavour} />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <SendThisGiftButton
          product={product}
          flavour={flavour}
          requiresFlavour={requiresFlavour}
          onBlocked={() => setIsFlavourDialogOpen(true)}
        />
        <div className="sm:pt-0.5">
          <AddToCartButton product={product} flavour={flavour} requiresFlavour={requiresFlavour} />
        </div>
      </div>

      {requiresFlavour && !flavour ? (
        <p className="text-sm text-gray-600" role="status">
          Choose a flavour to add this gift to your cart.
        </p>
      ) : null}

      <FlavourRequiredDialog
        open={isFlavourDialogOpen}
        onClose={closeFlavourDialog}
        options={flavourOptions}
        productName={product.name}
      />
    </div>
  );
}
