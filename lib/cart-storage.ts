import { isFlavourId, type FlavourId } from '@/lib/flavours';

// lineId, not productId, is what identifies a cart line. Two flavours of the same
// product are two lines; without this they would collapse into one.
export type CartItem = {
  lineId: string;
  productId: string;
  flavour?: FlavourId;
  name: string;
  price: number;
  quantity: number;
  preparationDays?: number;
  isAddon?: boolean;
  vendorId?: string;
};

export function buildCartLineId(productId: string, flavour?: string | null) {
  return flavour ? `${productId}#${flavour}` : productId;
}

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

// Normalizing rather than only filtering is what migrates carts stored before
// flavours existed: they get lineId backfilled from productId on the next read,
// so nobody loses a cart during rollout.
function normalizeCartItem(value: unknown): CartItem | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<CartItem>;

  const isValid =
    typeof candidate.productId === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.price === 'number' &&
    Number.isFinite(candidate.price) &&
    typeof candidate.quantity === 'number' &&
    Number.isFinite(candidate.quantity) &&
    (candidate.preparationDays === undefined ||
      (typeof candidate.preparationDays === 'number' &&
        Number.isFinite(candidate.preparationDays) &&
        candidate.preparationDays >= 0)) &&
    (candidate.isAddon === undefined || typeof candidate.isAddon === 'boolean') &&
    (candidate.vendorId === undefined || typeof candidate.vendorId === 'string');

  if (!isValid) return null;

  // An unrecognized flavour is dropped so it can never reach checkout. A known but
  // retired flavour is kept, so the order API can explain the problem by name
  // instead of the line silently changing under the customer.
  const flavour = isFlavourId(candidate.flavour) ? candidate.flavour : undefined;
  const productId = candidate.productId as string;

  return {
    ...(candidate as CartItem),
    productId,
    flavour,
    lineId: typeof candidate.lineId === 'string' && candidate.lineId ? candidate.lineId : buildCartLineId(productId, flavour)
  };
}

function sanitizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  const items: CartItem[] = [];
  for (const entry of value) {
    const item = normalizeCartItem(entry);
    if (!item) continue;

    // A migrated cart can surface two lines with the same key; merge rather than
    // leave duplicates that the UI would render with clashing React keys.
    const existing = items.find((candidate) => candidate.lineId === item.lineId);
    if (existing) existing.quantity += item.quantity;
    else items.push(item);
  }

  return items;
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
