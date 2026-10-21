export type CustomFieldType = 'text';

// Stored on the product. `required` and `type` were added after the first
// customisable products were saved, so readers must default them (see
// resolveProductCustomFields). `defaultMessage` is shown to customers as
// placeholder text only; it is never submitted on their behalf.
export type ProductCustomField = {
  name: string;
  maxLength: number;
  defaultMessage?: string;
  required?: boolean;
  type?: CustomFieldType;
};

export type ResolvedCustomField = {
  name: string;
  maxLength: number;
  placeholder?: string;
  required: boolean;
  type: CustomFieldType;
};

// What the customer typed, keyed by field name. Lives on the cart line.
export type CustomizationValue = { name: string; value: string };

// What the order keeps: the field's label and the value, snapshotted at order
// time so a later rename of the field does not rewrite history.
export type OrderItemCustomization = { label: string; value: string };

export const CUSTOM_FIELDS_MAX = 10;
export const CUSTOM_FIELD_MAX_LENGTH = 200;
export const CUSTOM_FIELD_NAME_MAX_LENGTH = 60;

type Segmenter = { segment: (value: string) => Iterable<unknown> };
let segmenter: Segmenter | null | undefined;

function getSegmenter(): Segmenter | null {
  if (segmenter !== undefined) return segmenter;
  const Ctor = (Intl as unknown as { Segmenter?: new (locale?: string, options?: { granularity: 'grapheme' }) => Segmenter }).Segmenter;
  segmenter = Ctor ? new Ctor(undefined, { granularity: 'grapheme' }) : null;
  return segmenter;
}

function splitGraphemes(value: string): string[] {
  const seg = getSegmenter();
  if (!seg) return Array.from(value);
  return Array.from(seg.segment(value), (part) => (part as { segment: string }).segment);
}

// Caps count what a person sees as one character: an emoji with a skin tone or
// an accented letter is one, even though it is several UTF-16 units. Browser
// maxLength counts the units, which is why the inputs do not use it.
export function countGraphemes(value: string) {
  return splitGraphemes(value).length;
}

export function truncateGraphemes(value: string, max: number) {
  const parts = splitGraphemes(value);
  return parts.length > max ? parts.slice(0, max).join('') : value;
}

// Emoji cannot be printed or piped onto the products, so messages and
// placeholders reject them. Extended_Pictographic covers the emoji themselves;
// the rest are the pieces that build them up (skin tones, flags, keycaps, the
// zero-width joiner and the emoji variation selector). Plain digits, # and *
// are left alone even though Unicode also lists them as emoji.
const EMOJI_PATTERN = /[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\u200D\uFE0F\u20E3]/gu;

export function containsEmoji(value: string) {
  EMOJI_PATTERN.lastIndex = 0;
  return EMOJI_PATTERN.test(value);
}

export function stripEmoji(value: string) {
  return value.replace(EMOJI_PATTERN, '');
}

export function normalizeCustomMessage(value: unknown): string {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function resolveProductCustomFields(product: { customFields?: ProductCustomField[] | null } | null | undefined): ResolvedCustomField[] {
  return (product?.customFields || [])
    .filter((field) => field && typeof field.name === 'string' && field.name.trim())
    .map((field) => ({
      name: field.name.trim(),
      maxLength: field.maxLength,
      ...(field.defaultMessage ? { placeholder: field.defaultMessage } : {}),
      required: field.required ?? true,
      type: field.type ?? 'text'
    }));
}

export function isProductCustomizable(product: { customFields?: ProductCustomField[] | null } | null | undefined) {
  return resolveProductCustomFields(product).length > 0;
}

// Cart-side shape: only fields with something typed, in the product's field order.
export function buildCustomizationValues(fields: ResolvedCustomField[], values: Record<string, string>): CustomizationValue[] {
  return fields
    .map((field) => ({ name: field.name, value: normalizeCustomMessage(values[field.name]) }))
    .filter((entry) => entry.value);
}

export function findMissingRequiredField(fields: ResolvedCustomField[], values: Record<string, string>) {
  return fields.find((field) => field.required && !normalizeCustomMessage(values[field.name])) || null;
}

export function normalizeCustomizationValues(value: unknown): CustomizationValue[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const entries = value
    .filter((entry): entry is CustomizationValue => Boolean(entry) && typeof entry.name === 'string' && typeof entry.value === 'string')
    .map((entry) => ({ name: entry.name, value: normalizeCustomMessage(entry.value) }))
    .filter((entry) => entry.value);
  return entries.length ? entries : undefined;
}

// The server decides what is orderable, as it does for price and flavour: values
// are matched to the product's current fields by name, checked against each
// cap and required flag, and snapshotted with their label.
export function resolveOrderCustomizations(
  product: { name: string; customFields?: ProductCustomField[] | null },
  requested: CustomizationValue[] | undefined
): { customizations: OrderItemCustomization[] } | { error: string } {
  const fields = resolveProductCustomFields(product);
  const entries = requested || [];

  if (!fields.length) {
    return entries.length ? { error: `${product.name} cannot be personalised.` } : { customizations: [] };
  }

  const byName = new Map<string, string>();
  for (const entry of entries) {
    if (!fields.some((field) => field.name === entry.name) || byName.has(entry.name)) {
      return { error: `The personalisation options for ${product.name} have changed. Please remove it from your cart and add it again.` };
    }
    byName.set(entry.name, normalizeCustomMessage(entry.value));
  }

  const customizations: OrderItemCustomization[] = [];
  for (const field of fields) {
    const value = byName.get(field.name) || '';
    if (!value) {
      if (field.required) return { error: `Please fill in "${field.name}" for ${product.name}.` };
      continue;
    }
    if (containsEmoji(value)) {
      return { error: `"${field.name}" for ${product.name} cannot contain emoji.` };
    }
    if (countGraphemes(value) > field.maxLength) {
      return { error: `"${field.name}" for ${product.name} must be at most ${field.maxLength} characters.` };
    }
    customizations.push({ label: field.name, value });
  }

  return { customizations };
}

export function formatCustomization(entry: { label?: string; name?: string; value: string }) {
  return `${entry.label ?? entry.name}: "${entry.value}"`;
}

// ---------------------------------------------------------------- admin editor

export type CustomFieldRow = {
  name: string;
  maxLength: string;
  placeholder: string;
  required: boolean;
};

export function emptyCustomFieldRow(): CustomFieldRow {
  return { name: '', maxLength: '', placeholder: '', required: true };
}

export function rowsFromCustomFields(fields: ProductCustomField[] | undefined | null): CustomFieldRow[] {
  return resolveProductCustomFields({ customFields: fields }).map((field) => ({
    name: field.name,
    maxLength: String(field.maxLength),
    placeholder: field.placeholder || '',
    required: field.required
  }));
}

export function parseCustomFieldRows(rows: CustomFieldRow[]): { fields: ProductCustomField[] } | { error: string } {
  if (!rows.length) return { error: 'Add at least one customisation field, or untick Customisable.' };
  if (rows.length > CUSTOM_FIELDS_MAX) return { error: `A product can have at most ${CUSTOM_FIELDS_MAX} customisation fields.` };

  const seen = new Set<string>();
  const fields: ProductCustomField[] = [];

  for (const [index, row] of rows.entries()) {
    const label = `Field ${index + 1}`;
    const name = row.name.trim();
    if (!name) return { error: `${label}: enter a name.` };
    if (name.length > CUSTOM_FIELD_NAME_MAX_LENGTH) return { error: `${label}: name must be at most ${CUSTOM_FIELD_NAME_MAX_LENGTH} characters.` };
    // Names are how a customer's message finds its field, so they must be unique.
    if (seen.has(name.toLowerCase())) return { error: `${label}: "${name}" is used by another field. Field names must be unique.` };
    seen.add(name.toLowerCase());

    const maxLength = Number(row.maxLength.trim());
    if (!row.maxLength.trim() || !Number.isInteger(maxLength) || maxLength < 1 || maxLength > CUSTOM_FIELD_MAX_LENGTH) {
      return { error: `${label}: character cap must be a whole number from 1 to ${CUSTOM_FIELD_MAX_LENGTH}.` };
    }

    const placeholder = row.placeholder.trim();
    if (containsEmoji(placeholder)) return { error: `${label}: placeholder cannot contain emoji.` };
    if (countGraphemes(placeholder) > maxLength) {
      return { error: `${label}: placeholder "${placeholder}" is longer than the ${maxLength}-character cap.` };
    }

    fields.push({ name, maxLength, ...(placeholder ? { defaultMessage: placeholder } : {}), required: row.required, type: 'text' });
  }

  return { fields };
}

// Part of an order line's identity alongside product, vendor and flavour: two
// boxes of one cake with different messages are two lines, fulfilled separately.
export function orderLineCustomizationKey(item: { customizations?: OrderItemCustomization[] | null }) {
  return item.customizations?.length ? JSON.stringify(item.customizations.map((entry) => [entry.label, entry.value])) : '';
}
