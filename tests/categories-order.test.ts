import assert from 'node:assert/strict';
import { defaultCategoryOrder, getActiveSeasonalCategoryOrder, getSortedGiftCategories } from '../lib/categories';

function labelsFor(date: string) {
  return ['All gifts', ...getSortedGiftCategories(new Date(`${date}T12:00:00Z`)).map((category) => category.label)];
}

assert.deepEqual(labelsFor('2026-02-01'), [
  'All gifts',
  "Valentine's Day",
  'Flowers',
  'Cakes and Cupcakes',
  'Gift Baskets and Food',
  'Anniversary',
  'Birthday',
  'Thank You',
  'Congratulations',
  'Baby Shower',
  'New Baby',
  'Christmas'
]);

assert.deepEqual(labelsFor('2026-02-16'), ['All gifts', ...defaultCategoryOrder]);

assert.deepEqual(labelsFor('2026-12-10'), [
  'All gifts',
  'Christmas',
  'Gift Baskets and Food',
  'Cakes and Cupcakes',
  'Flowers',
  'Thank You',
  'Congratulations',
  'Birthday',
  'Anniversary',
  'Baby Shower',
  'New Baby',
  "Valentine's Day"
]);

assert.equal(getActiveSeasonalCategoryOrder(new Date('2026-12-10T12:00:00Z'))?.event, 'Christmas peak');
assert.equal(getSortedGiftCategories(new Date('2026-02-01T12:00:00Z')).length, 11);
