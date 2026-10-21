export type ProductCustomField = {
  name: string;
  maxLength: number;
  defaultMessage?: string;
};

export const CUSTOM_FIELDS_MAX = 10;
export const CUSTOM_FIELD_MAX_LENGTH = 200;

export type CustomFieldsInput = {
  count: string;
  maxLengths: string;
  names: string;
  defaultMessages: string;
};

function splitList(value: string) {
  return value.split(',').map((part) => part.trim());
}

// The admin form takes four comma-separated boxes (count, caps, names, default
// messages) because that is how staff describe a customisation: "3 fields,
// 11/11/11 characters, Cake 1/2/3, Happy/Birthday/Love". This turns those boxes
// into one field per entry, or explains which box does not line up.
export function parseCustomFieldsInput(input: CustomFieldsInput): { fields: ProductCustomField[] } | { error: string } {
  const count = Number(input.count.trim());
  if (!Number.isInteger(count) || count < 1 || count > CUSTOM_FIELDS_MAX) {
    return { error: `Number of fields must be a whole number from 1 to ${CUSTOM_FIELDS_MAX}.` };
  }

  const maxLengths = splitList(input.maxLengths);
  if (maxLengths.length !== count) {
    return { error: `Enter ${count} message cap${count === 1 ? '' : 's'}, separated by commas (got ${maxLengths.length}).` };
  }
  const caps = maxLengths.map(Number);
  if (caps.some((cap) => !Number.isInteger(cap) || cap < 1 || cap > CUSTOM_FIELD_MAX_LENGTH)) {
    return { error: `Each message cap must be a whole number from 1 to ${CUSTOM_FIELD_MAX_LENGTH}.` };
  }

  const names = splitList(input.names);
  if (names.length !== count || names.some((name) => !name)) {
    return { error: `Enter ${count} field name${count === 1 ? '' : 's'}, separated by commas.` };
  }

  // Default messages are optional as a whole, but when given they must cover
  // every field so a default never lands on the wrong one.
  const defaults = input.defaultMessages.trim() ? splitList(input.defaultMessages) : [];
  if (defaults.length && defaults.length !== count) {
    return { error: `Enter ${count} default message${count === 1 ? '' : 's'}, separated by commas, or leave the box empty.` };
  }
  const tooLong = defaults.findIndex((message, index) => message.length > caps[index]);
  if (tooLong >= 0) {
    return { error: `Default message "${defaults[tooLong]}" is longer than its ${caps[tooLong]}-character cap.` };
  }

  return {
    fields: names.map((name, index) => ({
      name,
      maxLength: caps[index],
      ...(defaults[index] ? { defaultMessage: defaults[index] } : {})
    }))
  };
}

export function formatCustomFieldsInput(fields: ProductCustomField[] | undefined | null): CustomFieldsInput {
  const list = fields || [];
  return {
    count: list.length ? String(list.length) : '',
    maxLengths: list.map((field) => field.maxLength).join(', '),
    names: list.map((field) => field.name).join(', '),
    defaultMessages: list.some((field) => field.defaultMessage) ? list.map((field) => field.defaultMessage || '').join(', ') : ''
  };
}

export function isProductCustomizable(product: { customFields?: ProductCustomField[] | null } | null | undefined) {
  return Boolean(product?.customFields?.length);
}
