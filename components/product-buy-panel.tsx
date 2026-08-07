'use client';

import { useState } from 'react';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { FlavourPicker } from '@/components/flavour-picker';
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

  return (
    <div className="space-y-4">
      {requiresFlavour ? <FlavourPicker options={flavourOptions} value={flavour} onChange={setFlavour} /> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <SendThisGiftButton product={product} flavour={flavour} requiresFlavour={requiresFlavour} />
        <div className="sm:pt-0.5">
          <AddToCartButton product={product} flavour={flavour} requiresFlavour={requiresFlavour} />
        </div>
      </div>

      {requiresFlavour && !flavour ? (
        <p className="text-sm text-gray-600" role="status">
          Choose a flavour to add this gift to your cart.
        </p>
      ) : null}
    </div>
  );
}
