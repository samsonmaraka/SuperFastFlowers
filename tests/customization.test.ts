import assert from 'node:assert/strict';
import {
  buildCustomizationValues,
  containsEmoji,
  stripEmoji,
  countGraphemes,
  emptyCustomFieldRow,
  findMissingRequiredField,
  isProductCustomizable,
  normalizeCustomizationValues,
  orderLineCustomizationKey,
  parseCustomFieldRows,
  resolveOrderCustomizations,
  resolveProductCustomFields,
  rowsFromCustomFields,
  truncateGraphemes,
  type CustomFieldRow
} from '../lib/customization';
import { buildCartLineId } from '../lib/cart-storage';
import { orderSchema, productSchema } from '../lib/validators';

// ---------------------------------------------------------------- graphemes
assert.equal(countGraphemes('Happy'), 5);
assert.equal(countGraphemes('👍🏽'), 1); // emoji + skin tone: 4 UTF-16 units
assert.equal(countGraphemes('é'), 1); // e + combining accent
assert.equal(countGraphemes('👨‍👩‍👧'), 1); // ZWJ family
assert.equal(truncateGraphemes('ab👍🏽cd', 3), 'ab👍🏽');
assert.equal(truncateGraphemes('abc', 5), 'abc');

// ---------------------------------------------------------------- emoji
for (const emoji of ['😀', '👍🏽', '👨‍👩‍👧', '🇺🇬', '❤️', '1️⃣', '🎂', '❤']) assert.equal(containsEmoji(`a${emoji}b`), true, emoji);
for (const plain of ['Happy 70th Birthday!', '#1 Mum *', 'Crème brûlé', 'Nakato & Ssali', "It's 5 o'clock", '£€$%']) {
  assert.equal(containsEmoji(plain), false, plain);
  assert.equal(stripEmoji(plain), plain);
}
assert.equal(stripEmoji('Happy 🎂 Birthday 👍🏽!'), 'Happy  Birthday !');
assert.equal(stripEmoji('Love ❤️ 👨‍👩‍👧 🇺🇬 1️⃣'), 'Love    1');
// Stateful /g regex must not leak between calls.
assert.equal(containsEmoji('🎂'), true);
assert.equal(containsEmoji('🎂'), true);

// ---------------------------------------------------------------- admin rows
const rows: CustomFieldRow[] = [
  { name: 'Cake 1', maxLength: '11', placeholder: 'Happy', required: true },
  { name: 'Cake 2', maxLength: '11', placeholder: 'Birthday', required: true },
  { name: 'Cake 3', maxLength: '11', placeholder: '', required: false }
];
const parsed = parseCustomFieldRows(rows);
assert.ok('fields' in parsed);
assert.deepEqual(parsed.fields, [
  { name: 'Cake 1', maxLength: 11, defaultMessage: 'Happy', required: true, type: 'text' },
  { name: 'Cake 2', maxLength: 11, defaultMessage: 'Birthday', required: true, type: 'text' },
  { name: 'Cake 3', maxLength: 11, required: false, type: 'text' }
]);
assert.deepEqual(rowsFromCustomFields(parsed.fields), rows);
assert.deepEqual(emptyCustomFieldRow(), { name: '', maxLength: '', placeholder: '', required: true });

assert.ok('error' in parseCustomFieldRows([]));
assert.ok('error' in parseCustomFieldRows([{ ...rows[0], name: ' ' }]));
assert.ok('error' in parseCustomFieldRows([rows[0], { ...rows[1], name: 'cake 1' }])); // duplicate, case-insensitive
assert.ok('error' in parseCustomFieldRows([{ ...rows[0], maxLength: '' }]));
assert.ok('error' in parseCustomFieldRows([{ ...rows[0], maxLength: '0' }]));
assert.ok('error' in parseCustomFieldRows([{ ...rows[0], maxLength: '2.5' }]));
assert.ok('error' in parseCustomFieldRows([{ ...rows[0], maxLength: '5', placeholder: 'Birthday' }]));
assert.ok('error' in parseCustomFieldRows([{ ...rows[0], placeholder: 'Happy 🎂' }]));
assert.ok('error' in parseCustomFieldRows(Array.from({ length: 11 }, (_, i) => ({ ...rows[0], name: `F${i}` }))));

// ---------------------------------------------------------------- legacy fields
// Saved before required/type existed: both default, defaultMessage becomes the placeholder.
const legacy = resolveProductCustomFields({ customFields: [{ name: 'Cake 1', maxLength: 11, defaultMessage: 'Happy' }] });
assert.deepEqual(legacy, [{ name: 'Cake 1', maxLength: 11, placeholder: 'Happy', required: true, type: 'text' }]);
assert.equal(isProductCustomizable({ customFields: parsed.fields }), true);
assert.equal(isProductCustomizable({ customFields: [] }), false);
assert.equal(isProductCustomizable({}), false);

// ---------------------------------------------------------------- storefront
const fields = resolveProductCustomFields({ customFields: parsed.fields });
assert.equal(findMissingRequiredField(fields, {})?.name, 'Cake 1');
assert.equal(findMissingRequiredField(fields, { 'Cake 1': 'Hi', 'Cake 2': '   ' })?.name, 'Cake 2');
assert.equal(findMissingRequiredField(fields, { 'Cake 1': 'Hi', 'Cake 2': 'There' }), null);
// Placeholders are never submitted; blank optional fields are left out.
assert.deepEqual(buildCustomizationValues(fields, { 'Cake 1': ' Hi  you ', 'Cake 2': 'There', 'Cake 3': '' }), [
  { name: 'Cake 1', value: 'Hi you' },
  { name: 'Cake 2', value: 'There' }
]);
assert.equal(normalizeCustomizationValues([{ name: 'Cake 1', value: '  ' }]), undefined);
assert.equal(normalizeCustomizationValues('nope'), undefined);

// Different messages are different cart lines; same messages are the same line.
const a = buildCartLineId('p1', null, [{ name: 'Cake 1', value: 'Happy' }]);
const b = buildCartLineId('p1', null, [{ name: 'Cake 1', value: 'Love' }]);
assert.notEqual(a, b);
assert.equal(a, buildCartLineId('p1', null, [{ name: 'Cake 1', value: 'Happy' }]));
assert.equal(buildCartLineId('p1', null, []), 'p1');
assert.equal(buildCartLineId('p1', 'vanilla'), 'p1#vanilla');
assert.notEqual(buildCartLineId('p1', 'vanilla', [{ name: 'Cake 1', value: 'Happy' }]), 'p1#vanilla');

// ---------------------------------------------------------------- order API
const product = { name: 'Cake set', customFields: parsed.fields };
const ok = resolveOrderCustomizations(product, [
  { name: 'Cake 2', value: 'Birthday' },
  { name: 'Cake 1', value: 'Happy' }
]);
assert.deepEqual(ok, {
  customizations: [
    { label: 'Cake 1', value: 'Happy' },
    { label: 'Cake 2', value: 'Birthday' }
  ]
});
assert.ok('error' in resolveOrderCustomizations(product, [{ name: 'Cake 1', value: 'Happy' }])); // Cake 2 required
assert.ok('error' in resolveOrderCustomizations(product, undefined));
assert.ok('error' in resolveOrderCustomizations(product, [{ name: 'Cake 1', value: 'Happy birthday!' }, { name: 'Cake 2', value: 'x' }])); // over cap
assert.ok('error' in resolveOrderCustomizations(product, [{ name: 'Cake 1', value: 'a' }, { name: 'Cake 2', value: 'b' }, { name: 'Gone', value: 'c' }]));
assert.ok('error' in resolveOrderCustomizations(product, [{ name: 'Cake 1', value: 'a' }, { name: 'Cake 1', value: 'b' }, { name: 'Cake 2', value: 'c' }]));
// Emoji are refused; accented letters count as one character each.
assert.ok('error' in resolveOrderCustomizations(product, [{ name: 'Cake 1', value: 'Hi 👍🏽' }, { name: 'Cake 2', value: 'x' }]));
assert.ok('customizations' in resolveOrderCustomizations(product, [{ name: 'Cake 1', value: 'Crème brûlé' }, { name: 'Cake 2', value: 'x' }]));
assert.deepEqual(resolveOrderCustomizations({ name: 'Plain' }, undefined), { customizations: [] });
assert.ok('error' in resolveOrderCustomizations({ name: 'Plain' }, [{ name: 'Cake 1', value: 'x' }]));

assert.equal(orderLineCustomizationKey({}), '');
assert.notEqual(
  orderLineCustomizationKey({ customizations: [{ label: 'Cake 1', value: 'Happy' }] }),
  orderLineCustomizationKey({ customizations: [{ label: 'Cake 1', value: 'Love' }] })
);

// ---------------------------------------------------------------- schemas
const base = {
  id: 'p1', name: 'Cake set', slug: 'cake-set', description: 'Three lovely cakes', price: 1000, category: 'Cakes',
  tags: [], imageUrls: ['https://example.com/a.jpg'], stockStatus: 'in_stock', featured: false, status: 'active',
  createdAt: 'x', updatedAt: 'x'
};
const saved = productSchema.safeParse({ ...base, customFields: [{ name: 'Cake 1', maxLength: 11 }] });
assert.ok(saved.success);
assert.deepEqual(saved.data.customFields, [{ name: 'Cake 1', maxLength: 11, required: true, type: 'text' }]);
assert.ok(!productSchema.safeParse({ ...base, customFields: [{ name: 'a', maxLength: 3, defaultMessage: 'toolong' }] }).success);
assert.ok(!productSchema.safeParse({ ...base, customFields: [{ name: 'A', maxLength: 3 }, { name: 'a', maxLength: 3 }] }).success);
assert.ok(!productSchema.safeParse({ ...base, customFields: [{ name: 'A', maxLength: 3, type: 'image' }] }).success);
assert.ok(!productSchema.safeParse({ ...base, customFields: [{ name: 'A', maxLength: 5, defaultMessage: 'Hi 🎂' }] }).success);

const order = {
  recipientName: 'Jo Bloggs', recipientPhone: '0700000000', deliveryDate: new Date().toISOString().slice(0, 10),
  region: 'Kampala Region', cityId: 'x', email: 'a@b.co',
  items: [{ productId: 'p1', quantity: 1, customizations: [{ name: 'Cake 1', value: 'Happy' }] }]
};
assert.ok(orderSchema.safeParse(order).success);

console.log('customization tests passed');
