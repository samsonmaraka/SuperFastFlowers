'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { readCart, writeCart } from '@/lib/cart-storage';
import { formatUgx } from '@/lib/format';
import type { Addon } from '@/lib/types';
import { ADDON_MESSAGE_MAX_LENGTH, ADDON_MESSAGE_SAMPLE, isCustomizableAddon, normalizeAddonMessage } from '@/lib/addon-message';

// Keep the list from dominating the product page: taller lists become a scroll
// area sized to exactly this many rows.
const VISIBLE_ADDONS = 4;
const ROW_GAP_PX = 12; // Matches the `space-y-3` between list items.

function dispatchCartUpdate() {
  window.dispatchEvent(new Event('giftora-cart-updated'));
}

function getAddonQuantities(addons: Addon[]) {
  const cart = readCart();
  return Object.fromEntries(addons.map((addon) => [addon.id, cart.find((item) => item.lineId === addon.id)?.quantity ?? 0]));
}

function getAddonMessages(addons: Addon[]) {
  const cart = readCart();
  return Object.fromEntries(addons.map((addon) => [addon.id, cart.find((item) => item.lineId === addon.id)?.message ?? '']));
}

// Floats over the product page instead of navigating, so the customer never
// feels they have left the gift they were looking at.
function MessageDialog({
  addon,
  initialMessage,
  onSave,
  onClose
}: {
  addon: Addon;
  initialMessage: string;
  onSave: (message: string) => void;
  onClose: () => void;
}) {
  const [message, setMessage] = useState(initialMessage);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const remaining = ADDON_MESSAGE_MAX_LENGTH - message.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="addon-message-title"
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSave(message);
        }}
      >
        <h3 id="addon-message-title" className="text-lg font-semibold text-ink">
          Customize your {addon.name}
        </h3>
        <p className="mt-1 text-sm text-gray-600">Add a short message to print on it (optional).</p>
        <label htmlFor="addon-message" className="mt-4 block text-sm font-medium text-ink">
          Message
        </label>
        <input
          ref={inputRef}
          id="addon-message"
          type="text"
          value={message}
          maxLength={ADDON_MESSAGE_MAX_LENGTH}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={ADDON_MESSAGE_SAMPLE}
          className="mt-1 w-full rounded-md border border-blush p-2 text-sm"
        />
        <p className={`mt-1 text-right text-xs ${remaining === 0 ? 'font-semibold text-pink-700' : 'text-gray-500'}`} aria-live="polite">
          {remaining} characters left
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
            Cancel
          </button>
          <button type="submit" className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-pink-700">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

export function GiftAddons({ addons }: { addons: Addon[] }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [customizing, setCustomizing] = useState<Addon | null>(null);
  const closeDialog = useCallback(() => setCustomizing(null), []);
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const listRef = useRef<HTMLUListElement | null>(null);
  const isScrollable = addons.length > VISIBLE_ADDONS;

  // Rows vary in height with the add-on description, so measure the real rows
  // rather than guessing a pixel cap.
  useEffect(() => {
    const list = listRef.current;
    if (!list || !isScrollable) {
      setMaxHeight(null);
      return;
    }

    const measure = () => {
      const items = list.children;
      const first = items[0] as HTMLElement | undefined;
      const cutoff = items[VISIBLE_ADDONS] as HTMLElement | undefined;
      if (!first || !cutoff) return;

      setMaxHeight(cutoff.offsetTop - first.offsetTop - ROW_GAP_PX);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(list);
    Array.from(list.children).forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, [addons, isScrollable]);

  const onScroll = useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    setIsAtEnd(list.scrollTop + list.clientHeight >= list.scrollHeight - 1);
  }, []);

  useEffect(() => {
    const sync = () => {
      setQuantities(getAddonQuantities(addons));
      setMessages(getAddonMessages(addons));
    };

    sync();
    window.addEventListener('giftora-cart-updated', sync);
    window.addEventListener('storage', sync);

    return () => {
      window.removeEventListener('giftora-cart-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, [addons]);

  if (!addons.length) return null;

  const updateQuantity = (addon: Addon, nextQuantity: number, message?: string) => {
    const cart = readCart();
    const existing = cart.find((item) => item.lineId === addon.id);

    const nextCart = existing
      ? nextQuantity > 0
        ? cart.map((item) =>
            item.lineId === addon.id ? { ...item, quantity: nextQuantity, ...(message !== undefined ? { message: normalizeAddonMessage(message) } : {}) } : item
          )
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
              isAddon: true,
              message: message !== undefined ? normalizeAddonMessage(message) : undefined
            }
          ]
        : cart;

    writeCart(nextCart);
    setQuantities((prev) => ({ ...prev, [addon.id]: nextQuantity }));
    if (message !== undefined) setMessages((prev) => ({ ...prev, [addon.id]: normalizeAddonMessage(message) ?? '' }));
    dispatchCartUpdate();
  };

  return (
    <section className="rounded-xl border border-blush bg-white p-5">
      <h2 className="text-lg font-semibold text-ink">Make it extra special</h2>
      <p className="mt-1 text-sm text-gray-600">Add an optional extra to be delivered together with this gift.</p>

      <ul
        ref={listRef}
        onScroll={isScrollable ? onScroll : undefined}
        className={`mt-4 space-y-3 ${isScrollable ? 'overflow-y-auto pr-2' : ''}`}
        style={isScrollable && maxHeight ? { maxHeight } : undefined}
        tabIndex={isScrollable ? 0 : undefined}
        aria-label={isScrollable ? `Optional extras, ${addons.length} available` : undefined}
      >
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
                {isCustomizableAddon(addon) && quantity > 0 ? (
                  <button type="button" onClick={() => setCustomizing(addon)} className="mt-1 text-left text-xs font-medium text-pink-700 underline">
                    {messages[addon.id] ? `“${messages[addon.id]}” · Edit message` : 'Add a message'}
                  </button>
                ) : null}
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
              ) : isCustomizableAddon(addon) ? (
                <button
                  type="button"
                  onClick={() => setCustomizing(addon)}
                  className="rounded-md border border-pink-700 px-3 py-1.5 text-sm font-semibold text-pink-700 transition hover:bg-pink-700 hover:text-white"
                  aria-label={`Add and customize ${addon.name}`}
                >
                  Add &amp; customize
                </button>
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

      {isScrollable ? (
        <p className="mt-3 text-xs text-gray-500">
          {isAtEnd
            ? `Showing all ${addons.length} extras.`
            : `Showing ${VISIBLE_ADDONS} of ${addons.length} — scroll the list for more.`}
        </p>
      ) : null}

      {customizing ? (
        <MessageDialog
          addon={customizing}
          initialMessage={messages[customizing.id] ?? ''}
          onClose={closeDialog}
          onSave={(message) => {
            updateQuantity(customizing, Math.max(1, quantities[customizing.id] ?? 0), message);
            setCustomizing(null);
          }}
        />
      ) : null}
    </section>
  );
}
