import assert from 'node:assert/strict';
import { getDateInputValue, getMaximumDeliveryDate } from '../lib/preparation-days';

assert.equal(
  getDateInputValue(getMaximumDeliveryDate(new Date('2026-10-02T13:00:00.000Z'))),
  '2026-10-16'
);

// Kampala's date has already rolled over even though it is still the prior UTC day.
assert.equal(
  getDateInputValue(getMaximumDeliveryDate(new Date('2026-10-02T22:30:00.000Z'))),
  '2026-10-17'
);
