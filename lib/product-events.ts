// Browser-side queue for first-party product events (impressions, product-page
// views, add-to-carts). Events are batched and sent to /api/track, using
// sendBeacon when the page is being hidden so the last batch is not lost.
// Unlike GA4, this goes to our own domain, so ad blockers rarely stop it.
// Every function is a no-op on the server.

export type ProductEventType = 'impression' | 'view' | 'add_to_cart';

const ENDPOINT = '/api/track';
const FLUSH_DELAY_MS = 3000;
const MAX_BATCH = 100;

let queue: { type: ProductEventType; productId: string }[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersAttached = false;
// One impression per product per page load is enough.
const impressionsThisPage = new Set<string>();

function flush(useBeacon = false) {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0) return;

  const batch = queue.slice(0, MAX_BATCH);
  queue = queue.slice(MAX_BATCH);
  const body = JSON.stringify({ events: batch });

  try {
    if (useBeacon && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
    } else {
      void fetch(ENDPOINT, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
    }
  } catch {
    // Tracking must never break the page.
  }

  if (queue.length > 0) flush(useBeacon);
}

function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true);
  });
  window.addEventListener('pagehide', () => flush(true));
}

export function queueProductEvent(type: ProductEventType, productId: string) {
  if (typeof window === 'undefined' || !productId) return;
  // Staff screens are never part of the experiment.
  if (window.location.pathname.startsWith('/admin')) return;

  if (type === 'impression') {
    if (impressionsThisPage.has(productId)) return;
    impressionsThisPage.add(productId);
  }

  attachListeners();
  queue.push({ type, productId });
  if (queue.length >= MAX_BATCH) {
    flush();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => flush(), FLUSH_DELAY_MS);
  }
}

// Client-side navigation keeps this module alive, so the impression set must be
// reset whenever a new grid is shown.
export function resetPageImpressions() {
  impressionsThisPage.clear();
}
