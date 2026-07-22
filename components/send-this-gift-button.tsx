'use client';

import { useRouter } from 'next/navigation';
import { readCart, writeCart } from '@/lib/cart-storage';
import { Product } from '@/lib/types';

function dispatchCartUpdate() {
  window.dispatchEvent(new Event('giftora-cart-updated'));
}

export function SendThisGiftButton({ product }: { product: Product }) {
  const router = useRouter();

  const onSendGift = () => {
    const cart = readCart();
    const existingItem = cart.find((item) => item.productId === product.id);

    if (!existingItem) {
      writeCart([
        ...cart,
        {
          productId: product.id,
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
      className="inline-flex items-center justify-center rounded-md bg-pink-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-700/20 transition hover:-translate-y-0.5 hover:bg-ink hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-pink-700/40 focus:ring-offset-2"
      type="button"
      aria-label={`Send ${product.name} now`}
    >
      Send this gift
    </button>
  );
}
