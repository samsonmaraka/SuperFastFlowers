import assert from 'node:assert/strict';
import { formatCustomFieldsInput, isProductCustomizable, parseCustomFieldsInput } from '../lib/customization';
import { productSchema } from '../lib/validators';

const example = { count: '3', maxLengths: '11,11,11', names: 'cake 1, cake 2, cake 3', defaultMessages: 'Happy,Birthday,Love' };
const parsed = parseCustomFieldsInput(example);
assert.ok('fields' in parsed);
assert.deepEqual(parsed.fields, [
  { name: 'cake 1', maxLength: 11, defaultMessage: 'Happy' },
  { name: 'cake 2', maxLength: 11, defaultMessage: 'Birthday' },
  { name: 'cake 3', maxLength: 11, defaultMessage: 'Love' }
]);

// Round-trips through the form boxes.
assert.deepEqual(parseCustomFieldsInput(formatCustomFieldsInput(parsed.fields)), parsed);

// Defaults are optional.
const noDefaults = parseCustomFieldsInput({ ...example, defaultMessages: '' });
assert.ok('fields' in noDefaults);
assert.equal(noDefaults.fields[0].defaultMessage, undefined);
assert.equal(formatCustomFieldsInput(noDefaults.fields).defaultMessages, '');

// Mismatched boxes are rejected.
assert.ok('error' in parseCustomFieldsInput({ ...example, count: '2' }));
assert.ok('error' in parseCustomFieldsInput({ ...example, maxLengths: '11,11' }));
assert.ok('error' in parseCustomFieldsInput({ ...example, names: 'cake 1,,cake 3' }));
assert.ok('error' in parseCustomFieldsInput({ ...example, defaultMessages: 'Happy,Birthday' }));
assert.ok('error' in parseCustomFieldsInput({ ...example, maxLengths: '11,abc,11' }));
assert.ok('error' in parseCustomFieldsInput({ ...example, count: '0' }));
assert.ok('error' in parseCustomFieldsInput({ ...example, maxLengths: '11,5,11' })); // "Birthday" > 5

assert.equal(isProductCustomizable({ customFields: parsed.fields }), true);
assert.equal(isProductCustomizable({ customFields: [] }), false);
assert.equal(isProductCustomizable({}), false);

// The API schema accepts the parsed fields and rejects an over-long default.
const base = {
  id: 'p1', name: 'Cake set', slug: 'cake-set', description: 'Three lovely cakes', price: 1000, category: 'Cakes',
  tags: [], imageUrls: ['https://example.com/a.jpg'], stockStatus: 'in_stock', featured: false, status: 'active',
  createdAt: 'x', updatedAt: 'x'
};
assert.ok(productSchema.safeParse({ ...base, customFields: parsed.fields }).success);
assert.ok(!productSchema.safeParse({ ...base, customFields: [{ name: 'a', maxLength: 3, defaultMessage: 'toolong' }] }).success);

console.log('customization tests passed');
