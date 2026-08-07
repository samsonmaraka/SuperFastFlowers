'use client';

import { useRouter } from 'next/navigation';
import { buildCartLineId, readCart, writeCart } from '@/lib/cart-storage';
import type { FlavourId } from '@/lib/flavours';
import { Product } from '@/lib/types';

function dispatchCartUpdate() {
  window.dispatchEvent(new Event('giftora-cart-updated'));
}

type SendThisGiftButtonProps = {
  product: Product;
  flavour?: FlavourId | null;
  requiresFlavour?: boolean;
};

export function SendThisGiftButton({ product, flavour = null, requiresFlavour = false }: SendThisGiftButtonProps) {
  const router = useRouter();
  const isBlockedOnFlavour = requiresFlavour && !flavour;

  const onSendGift = () => {
    if (isBlockedOnFlavour) return;

    const lineId = buildCartLineId(product.id, flavour);
    const cart = readCart();
    const existingItem = cart.find((item) => item.lineId === lineId);

    if (!existingItem) {
      writeCart([
        ...cart,
        {
          lineId,
          productId: product.id,
          ...(flavour ? { flavour } : {}),
          name: product.name,
          price: product.price,
          quantity: 1,
          preparationDays: product.preparationDays,
          vendorId: product.vendorId
        }
      ]);
      dispatchCartUpdate();
    }

    router.push('/checkout');
  };

  return (
    <button
      onClick={onSendGift}
      disabled={isBlockedOnFlavour}
      className="inline-flex items-center justify-center rounded-md bg-pink-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-700/20 transition hover:-translate-y-0.5 hover:bg-ink hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-pink-700/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none disabled:hover:translate-y-0"
      type="button"
      aria-label={isBlockedOnFlavour ? `Choose a flavour before sending ${product.name}` : `Send ${product.name} now`}
      title={isBlockedOnFlavour ? 'Choose a flavour first' : undefined}
    >
      Send this gift
    </button>
  );
}
