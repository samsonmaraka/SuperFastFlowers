import assert from 'node:assert/strict';
import {
  catalogueCsvColumns,
  mapProductToCatalogueCsvRow,
  parseCatalogueBoolean,
  parseCatalogueFlavours,
  parseCatalogueCsv,
  parseCatalogueListValue,
  parseCatalogueStockStatus,
  parsePreparationDaysFromDeliveryNotes,
  productsToCatalogueCsv
} from '../lib/catalogue-csv-schema';
import type { Product } from '../lib/types';

const product: Product = {
  id: 'prod_123',
  name: 'Rose Bouquet',
  slug: 'rose-bouquet',
  description: 'A lovely bouquet, with "premium" roses\nand lilies.',
  price: 125000,
  category: 'Flowers',
  categories: ['Flowers', 'Birthday', "Valentine's Day"],
  tags: ['roses', 'same-day'],
  imageUrls: ['https://example.com/rose.jpg', 'https://example.com/lily.jpg'],
  stockStatus: 'in_stock',
  featured: true,
  status: 'active',
  vendorId: 'vendor_1',
  vendorName: 'Fast Florist',
  preparationDays: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-03T04:05:06.000Z'
};

assert.deepEqual(catalogueCsvColumns, [
  'product_id',
  'slug',
  'vendor_id',
  'vendor_name',
  'title',
  'description',
  'price',
  'currency',
  'categories',
  'tags',
  'flavours',
  'image_urls',
  'is_active',
  'is_featured',
  'stock_status',
  'delivery_notes',
  'updated_at'
]);

const row = mapProductToCatalogueCsvRow(product);
assert.equal(row.product_id, 'prod_123');
assert.equal(row.categories, "Flowers|Birthday|Valentine's Day");
assert.equal(row.tags, 'roses|same-day');
assert.equal(row.image_urls, 'https://example.com/rose.jpg|https://example.com/lily.jpg');
assert.equal(row.is_active, 'true');
assert.equal(row.is_featured, 'true');
assert.equal(row.price, '125000');
assert.equal(row.updated_at, '2026-02-03T04:05:06.000Z');

const csv = productsToCatalogueCsv([product]);
assert.match(csv, /^product_id,slug,vendor_id,vendor_name,title,description,price,currency,categories,tags,flavours,image_urls,is_active,is_featured,stock_status,delivery_notes,updated_at\r\n/);
assert.match(csv, /"A lovely bouquet, with ""premium"" roses\nand lilies\."/);
assert.match(csv, /Flowers\|Birthday\|Valentine's Day/);
assert.match(csv, /https:\/\/example\.com\/rose\.jpg\|https:\/\/example\.com\/lily\.jpg/);

// Parsing round-trips the exported CSV, including quoted fields with commas and newlines.
const parsed = parseCatalogueCsv(csv);
assert.deepEqual(parsed.errors, []);
assert.equal(parsed.rows.length, 1);
const parsedRow = parsed.rows[0];
assert.equal(parsedRow.line, 2);
assert.equal(parsedRow.values.product_id, 'prod_123');
assert.equal(parsedRow.values.title, 'Rose Bouquet');
assert.equal(parsedRow.values.description, 'A lovely bouquet, with "premium" roses\nand lilies.');
assert.equal(parsedRow.values.price, '125000');
assert.equal(parsedRow.values.is_active, 'true');
assert.deepEqual(parseCatalogueListValue(parsedRow.values.categories), ['Flowers', 'Birthday', "Valentine's Day"]);
assert.deepEqual(parseCatalogueListValue(parsedRow.values.tags), ['roses', 'same-day']);
assert.deepEqual(parseCatalogueListValue(parsedRow.values.image_urls), ['https://example.com/rose.jpg', 'https://example.com/lily.jpg']);
assert.equal(parsePreparationDaysFromDeliveryNotes(parsedRow.values.delivery_notes), 2);

// Header order does not matter and unknown/missing columns are tolerated.
const reordered = parseCatalogueCsv('title,price,product_id\r\nOrchid Box,90000,prod_456\r\n');
assert.deepEqual(reordered.errors, []);
assert.equal(reordered.rows[0].values.product_id, 'prod_456');
assert.equal(reordered.rows[0].values.title, 'Orchid Box');
assert.equal(reordered.rows[0].values.updated_at, undefined);

// Empty and unrecognized files report errors instead of rows.
assert.equal(parseCatalogueCsv('').errors.length, 1);
assert.equal(parseCatalogueCsv('foo,bar\r\n1,2\r\n').errors.length, 1);
assert.equal(parseCatalogueCsv('product_id,title\r\n').errors.length, 1);

// Value parsers used by the import route.
assert.equal(parseCatalogueBoolean('TRUE'), true);
assert.equal(parseCatalogueBoolean('no'), false);
assert.equal(parseCatalogueBoolean(''), undefined);
assert.equal(parseCatalogueStockStatus('In Stock'), 'in_stock');
assert.equal(parseCatalogueStockStatus('unknown'), undefined);
assert.equal(parsePreparationDaysFromDeliveryNotes('4 preparation days'), 4);
assert.equal(parsePreparationDaysFromDeliveryNotes('1 preparation day'), 1);
assert.equal(parsePreparationDaysFromDeliveryNotes('3'), 3);
assert.equal(parsePreparationDaysFromDeliveryNotes('same day'), undefined);

console.log('catalogue-csv-schema tests passed');

// Flavours round-trip through the CSV, and loose spellings normalize to registry ids.
const flavouredProduct: Product = { ...product, flavours: ['chocolate', 'vanilla'] };
assert.equal(mapProductToCatalogueCsvRow(flavouredProduct).flavours, 'chocolate|vanilla');
assert.equal(mapProductToCatalogueCsvRow(product).flavours, '');
assert.deepEqual(parseCatalogueFlavours('chocolate|vanilla'), ['vanilla', 'chocolate']);
assert.deepEqual(parseCatalogueFlavours('Red Velvet | MINT CHOCOLATE'), ['red-velvet', 'mint-chocolate']);
assert.deepEqual(parseCatalogueFlavours('chocolate|not-a-flavour|chocolate'), ['chocolate']);
assert.deepEqual(parseCatalogueFlavours(''), []);
assert.deepEqual(parseCatalogueFlavours(undefined), []);
