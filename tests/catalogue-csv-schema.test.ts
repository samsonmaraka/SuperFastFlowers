import assert from 'node:assert/strict';
import { catalogueCsvColumns, mapProductToCatalogueCsvRow, productsToCatalogueCsv } from '../lib/catalogue-csv-schema';
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
assert.match(csv, /^product_id,slug,vendor_id,vendor_name,title,description,price,currency,categories,tags,image_urls,is_active,is_featured,stock_status,delivery_notes,updated_at\r\n/);
assert.match(csv, /"A lovely bouquet, with ""premium"" roses\nand lilies\."/);
assert.match(csv, /Flowers\|Birthday\|Valentine's Day/);
assert.match(csv, /https:\/\/example\.com\/rose\.jpg\|https:\/\/example\.com\/lily\.jpg/);
