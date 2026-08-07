import assert from 'node:assert/strict';
import {
  FLAVOUR_IDS,
  formatFlavourList,
  productFlavourSentence,
  getFlavourLabel,
  isFlavourId,
  normalizeFlavourId,
  normalizeFlavourIds,
  productRequiresFlavour,
  resolveProductFlavours
} from '../lib/flavours';
import { buildCartLineId } from '../lib/cart-storage';
import { isSameDayEligible } from '../lib/preparation-days';

// ---------------------------------------------------------------- registry
assert.equal(FLAVOUR_IDS.length, 12);
assert.deepEqual(
  FLAVOUR_IDS,
  [
    'vanilla',
    'coconut',
    'strawberry',
    'lemon',
    'chocolate',
    'mocha',
    'red-velvet',
    'blueberry',
    'bubble-gum',
    'banana',
    'orange',
    'mint-chocolate'
  ],
  'the twelve flavours, in registry order'
);
assert.ok(isFlavourId('mint-chocolate'));
assert.ok(!isFlavourId('tiramisu'));
assert.equal(getFlavourLabel('red-velvet'), 'Red Velvet');
// An id that is not in the registry still renders as itself rather than blank.
assert.equal(getFlavourLabel('tiramisu'), 'tiramisu');

assert.equal(normalizeFlavourId('Red Velvet'), 'red-velvet');
assert.equal(normalizeFlavourId('MINT CHOCOLATE'), 'mint-chocolate');
assert.equal(normalizeFlavourId('bubble_gum'), 'bubble-gum');
assert.equal(normalizeFlavourId('tiramisu'), null);
assert.equal(normalizeFlavourId(undefined), null);
// Normalizing dedupes and restores registry order rather than input order.
assert.deepEqual(normalizeFlavourIds(['chocolate', 'vanilla', 'chocolate']), ['vanilla', 'chocolate']);

// ---------------------------------------------------------------- product policy
assert.deepEqual(resolveProductFlavours(null), []);
assert.deepEqual(resolveProductFlavours({}), []);
assert.deepEqual(resolveProductFlavours({ flavours: [] }), []);
assert.ok(!productRequiresFlavour({ flavours: [] }), 'an empty list means no flavour choice');
assert.ok(productRequiresFlavour({ flavours: ['vanilla'] }), 'a non-empty list makes flavour required');
assert.deepEqual(
  resolveProductFlavours({ flavours: ['chocolate', 'tiramisu', 'vanilla'] }).map((flavour) => flavour.id),
  ['vanilla', 'chocolate'],
  'unknown ids are dropped and the rest come back in registry order'
);

// ---------------------------------------------------------------- cart line identity
// This is the whole point: two flavours of one product must be two distinct lines.
assert.equal(buildCartLineId('p1'), 'p1');
assert.equal(buildCartLineId('p1', null), 'p1', 'no flavour keeps the bare product id, so add-ons are unchanged');
assert.equal(buildCartLineId('p1', 'vanilla'), 'p1#vanilla');
assert.notEqual(buildCartLineId('p1', 'vanilla'), buildCartLineId('p1', 'chocolate'));
assert.equal(
  buildCartLineId('p1', 'vanilla'),
  buildCartLineId('p1', 'vanilla'),
  'the same flavour twice merges into one line rather than duplicating'
);
assert.notEqual(buildCartLineId('p1', 'vanilla'), buildCartLineId('p2', 'vanilla'));

// ---------------------------------------------------------------- same-day rule
// Counts boxes, not lines, with no box limit: an order qualifies when every gift
// item is a one-day item, whatever the quantity or how the lines are split.
assert.ok(isSameDayEligible(1, 1), 'a single one-day box qualifies');
assert.ok(isSameDayEligible(2, 1), 'two flavour lines still qualify — this is the case that used to fail');
assert.ok(isSameDayEligible(9, 1), 'no box limit');
assert.ok(isSameDayEligible(1, 0), 'zero-day items are easier to fulfil, not harder');
assert.ok(!isSameDayEligible(1, 2), 'a two-day item never qualifies');
assert.ok(!isSameDayEligible(2, 2), 'one slow item disqualifies the order, since the rule reads the max');
assert.ok(!isSameDayEligible(0, 1), 'an order with no gift items never qualifies');

// ---------------------------------------------------------------- SEO copy
// The flavour names have to exist as readable prose, not only as picker labels.
assert.equal(formatFlavourList([]), '');
assert.equal(formatFlavourList(['vanilla']), 'Vanilla');
assert.equal(formatFlavourList(['vanilla', 'chocolate']), 'Vanilla and Chocolate');
assert.equal(formatFlavourList(['vanilla', 'chocolate', 'lemon']), 'Vanilla, Chocolate and Lemon');

assert.equal(productFlavourSentence({}), '', 'an unflavoured product gets no sentence at all');
assert.equal(productFlavourSentence({ flavours: [] }), '');
assert.equal(productFlavourSentence({ flavours: ['vanilla'] }), 'Available in 1 flavour: Vanilla.');
assert.equal(
  productFlavourSentence({ flavours: ['chocolate', 'vanilla'] }),
  'Available in 2 flavours: Vanilla and Chocolate.',
  'listed in registry order, not the order stored on the product'
);
assert.ok(
  productFlavourSentence({ flavours: [...FLAVOUR_IDS] }).startsWith('Available in 12 flavours: Vanilla, Coconut'),
  'a fully stocked product names all twelve'
);

console.log('flavours tests passed');
