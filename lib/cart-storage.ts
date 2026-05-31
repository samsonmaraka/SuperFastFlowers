export type CartItem = { productId: string; name: string; price: number; quantity: number; preparationDays?: number };

type CartMeta = { lastUpdated: string };

export const CART_KEY = 'giftora-cart';
export const CART_META_KEY = 'giftora-cart-meta';

const CART_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000;

function safeParseJson(raw: string | null): unknown {
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<CartItem>;

  return (
    typeof candidate.productId === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.price === 'number' &&
    Number.isFinite(candidate.price) &&
    typeof candidate.quantity === 'number' &&
    Number.isFinite(candidate.quantity) &&
    (candidate.preparationDays === undefined ||
      (typeof candidate.preparationDays === 'number' &&
        Number.isFinite(candidate.preparationDays) &&
        candidate.preparationDays >= 0))
  );
}

function sanitizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isCartItem);
}

function readMeta(): CartMeta | null {
  if (typeof window === 'undefined') return null;

  const parsed = safeParseJson(window.localStorage.getItem(CART_META_KEY));
  if (!parsed || typeof parsed !== 'object') return null;

  const lastUpdated = (parsed as Partial<CartMeta>).lastUpdated;
  if (typeof lastUpdated !== 'string') return null;

  return { lastUpdated };
}

function writeMeta(lastUpdated: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CART_META_KEY, JSON.stringify({ lastUpdated } satisfies CartMeta));
}

export function isCartExpired(lastUpdated: string): boolean {
  const timestamp = Date.parse(lastUpdated);
  if (Number.isNaN(timestamp)) return false;

  return Date.now() - timestamp > CART_EXPIRY_MS;
}

export function clearCart() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CART_KEY);
  window.localStorage.removeItem(CART_META_KEY);
}

export function readCart(): CartItem[] {
  if (typeof window === 'undefined') return [];

  const cart = sanitizeCart(safeParseJson(window.localStorage.getItem(CART_KEY)));
  const meta = readMeta();

  if (!meta || !meta.lastUpdated || Number.isNaN(Date.parse(meta.lastUpdated))) {
    writeMeta(new Date().toISOString());
    return cart;
  }

  if (isCartExpired(meta.lastUpdated)) {
    clearCart();
    return [];
  }

  return cart;
}

export function writeCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;

  const safeItems = sanitizeCart(items);
  window.localStorage.setItem(CART_KEY, JSON.stringify(safeItems));
  writeMeta(new Date().toISOString());
}
