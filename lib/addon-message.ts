// A balloon can carry a printed message. The cap is the length of the longest
// message the printer reliably fits: "Happy 70th Birthday Valentine".
export const ADDON_MESSAGE_SAMPLE = 'Happy 70th Birthday Valentine';
export const ADDON_MESSAGE_MAX_LENGTH = ADDON_MESSAGE_SAMPLE.length;

export function isCustomizableAddon(addon: { name: string }) {
  return /balloon/i.test(addon.name);
}

export function normalizeAddonMessage(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/\s+/g, ' ').trim().slice(0, ADDON_MESSAGE_MAX_LENGTH);
  return trimmed || undefined;
}

// Only one balloon per order.
export const CUSTOMIZABLE_ADDON_MAX_QUANTITY = 1;
