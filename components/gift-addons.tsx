'use client';

import { useEffect, useState } from 'react';
import { readCart, writeCart } from '@/lib/cart-storage';
import { formatUgx } from '@/lib/format';
import type { Addon } from '@/lib/types';

function dispatchCartUpdate() {
  window.dispatchEvent(new Event('giftora-cart-updated'));
}

function getAddonQuantities(addons: Addon[]) {
  const cart = readCart();
  return Object.fromEntries(addons.map((addon) => [addon.id, cart.find((item) => item.lineId === addon.id)?.quantity ?? 0]));
}

export function GiftAddons({ addons }: { addons: Addon[] }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    const sync = () => setQuantities(getAddonQuantities(addons));

    sync();
    window.addEventListener('giftora-cart-updated', sync);
    window.addEventListener('storage', sync);

    return () => {
      window.removeEventListener('giftora-cart-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, [addons]);

  if (!addons.length) return null;

  const updateQuantity = (addon: Addon, nextQuantity: number) => {
    const cart = readCart();
    const existing = cart.find((item) => item.lineId === addon.id);

    const nextCart = existing
      ? nextQuantity > 0
        ? cart.map((item) => (item.lineId === addon.id ? { ...item, quantity: nextQuantity } : item))
        : cart.filter((item) => item.lineId !== addon.id)
      : nextQuantity > 0
        ? [
            ...cart,
            {
              // Add-ons carry no flavour, so their line id is just the addon id.
              lineId: addon.id,
              productId: addon.id,
              name: addon.name,
              price: addon.price,
              quantity: nextQuantity,
              preparationDays: 0,
              isAddon: true
            }
          ]
        : cart;

    writeCart(nextCart);
    setQuantities((prev) => ({ ...prev, [addon.id]: nextQuantity }));
    dispatchCartUpdate();
  };

  return (
    <section className="rounded-xl border border-blush bg-white p-5">
      <h2 className="text-lg font-semibold text-ink">Make it extra special</h2>
      <p className="mt-1 text-sm text-gray-600">Add an optional extra to be delivered together with this gift.</p>
      <ul className="mt-4 space-y-3">
        {addons.map((addon) => {
          const quantity = quantities[addon.id] ?? 0;
          return (
            <li key={addon.id} className="flex items-center gap-4 rounded-lg border border-blush/70 p-3">
              {addon.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={addon.imageUrl} alt={addon.name} className="h-20 w-14 shrink-0 rounded object-contain" />
              ) : (
                <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded bg-pink-50 text-2xl" aria-hidden="true">
                  🎁
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{addon.name}</p>
                {addon.description ? <p className="text-xs text-gray-600">{addon.description}</p> : null}
                <p className="mt-1 text-sm font-semibold text-ink">UGX {formatUgx(addon.price)}</p>
              </div>
              {quantity > 0 ? (
                <div
                  className="flex items-center gap-3 text-sm font-medium text-ink"
                  role="group"
                  aria-label={`${addon.name} quantity in cart`}
                >
                  <button
                    type="button"
                    onClick={() => updateQuantity(addon, Math.max(0, quantity - 1))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-ink text-lg leading-none text-white transition hover:bg-pink-700"
                    aria-label={`Remove one ${addon.name}`}
                  >
                    −
                  </button>
                  <span className="min-w-4 text-center" aria-live="polite" aria-atomic="true">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(addon, quantity + 1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-ink text-lg leading-none text-white transition hover:bg-pink-700"
                    aria-label={`Add one more ${addon.name}`}
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => updateQuantity(addon, 1)}
                  className="rounded-md border border-pink-700 px-3 py-1.5 text-sm font-semibold text-pink-700 transition hover:bg-pink-700 hover:text-white"
                  aria-label={`Add ${addon.name} to your gift`}
                >
                  Add
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
