// Thin wrapper over the gtag.js snippet in app/layout.tsx. Every call is a no-op
// when gtag is missing (ad blockers, server render), so tracking never breaks a page.

export type GaItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_variant?: string;
  item_category?: string;
};

type GaEvent = 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_CURRENCY = 'UGX';

export function trackEcommerce(event: GaEvent, params: { items: GaItem[]; value?: number; [key: string]: unknown }) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  const value = params.value ?? params.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  window.gtag('event', event, { currency: GA_CURRENCY, ...params, value });
}

export function cartItemToGaItem(item: { productId: string; name: string; price: number; quantity: number; flavour?: string; isAddon?: boolean }): GaItem {
  return {
    item_id: item.productId,
    item_name: item.name,
    price: item.price,
    quantity: item.quantity,
    ...(item.flavour ? { item_variant: item.flavour } : {}),
    ...(item.isAddon ? { item_category: 'Add-on' } : {})
  };
}

// Pesapal can send the customer back to the callback page more than once (refresh,
// back button), so a purchase is remembered per order to avoid double-counting revenue.
export function trackPurchaseOnce(transactionId: string, params: { items: GaItem[]; value?: number; shipping?: number }) {
  if (typeof window === 'undefined') return;

  const key = `ga-purchase-${transactionId}`;
  try {
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, '1');
  } catch {
    // Storage blocked: still send; GA also dedupes on transaction_id.
  }

  trackEcommerce('purchase', { transaction_id: transactionId, ...params });
}
