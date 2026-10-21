'use client';

import { useRouter } from 'next/navigation';
import { buildCartLineId, readCart, writeCart } from '@/lib/cart-storage';
import { trackEcommerce } from '@/lib/analytics';
import type { FlavourId } from '@/lib/flavours';
import type { CustomizationValue } from '@/lib/customization';
import { Product } from '@/lib/types';

function dispatchCartUpdate() {
  window.dispatchEvent(new Event('giftora-cart-updated'));
}

type SendThisGiftButtonProps = {
  product: Product;
  flavour?: FlavourId | null;
  customizations?: CustomizationValue[];
  blockedReason?: string | null;
  onBlocked?: () => void;
  describedBy?: string;
};

export function SendThisGiftButton({
  product,
  flavour = null,
  customizations,
  blockedReason = null,
  onBlocked,
  describedBy
}: SendThisGiftButtonProps) {
  const router = useRouter();
  const isBlocked = Boolean(blockedReason);

  const onSendGift = () => {
    // The button stays clickable while blocked so the click can explain itself
    // instead of doing nothing.
    if (isBlocked) {
      onBlocked?.();
      return;
    }

    const lineId = buildCartLineId(product.id, flavour, customizations);
    const cart = readCart();
    const existingItem = cart.find((item) => item.lineId === lineId);

    if (!existingItem) {
      writeCart([
        ...cart,
        {
          lineId,
          productId: product.id,
          ...(flavour ? { flavour } : {}),
          ...(customizations?.length ? { customizations } : {}),
          name: product.name,
          price: product.price,
          quantity: 1,
          preparationDays: product.preparationDays,
          vendorId: product.vendorId
        }
      ]);
      trackEcommerce('add_to_cart', {
        items: [{ item_id: product.id, item_name: product.name, price: product.price, quantity: 1, ...(flavour ? { item_variant: flavour } : {}) }]
      });
      dispatchCartUpdate();
    }

    router.push('/checkout');
  };

  return (
    <button
      onClick={onSendGift}
      aria-describedby={describedBy}
      className={`inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-pink-700/40 focus:ring-offset-2 ${
        isBlocked
          ? 'bg-gray-400 hover:bg-gray-500'
          : 'bg-pink-700 shadow-lg shadow-pink-700/20 hover:-translate-y-0.5 hover:bg-ink hover:shadow-xl'
      }`}
      type="button"
      aria-label={isBlocked ? `${blockedReason} before sending ${product.name}` : `Send ${product.name} now`}
      title={blockedReason ? `${blockedReason} first` : undefined}
    >
      Send this gift
    </button>
  );
}
