import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { normalizeProductForDisplay, REFERENCE_IMAGES_MAX, stripInternalProductFields } from '../lib/product-images';
import { productSchema } from '../lib/validators';
import type { Product } from '../lib/types';

const base: Product = {
  id: 'ref-test-product',
  name: 'Reference Test Bouquet',
  slug: 'reference-test-bouquet',
  description: 'A bouquet used only to test reference images.',
  price: 100000,
  category: 'Flowers',
  tags: [],
  imageUrls: ['https://example.com/product.jpg'],
  referenceImageUrls: ['https://example.com/reference.jpg'],
  stockStatus: 'in_stock',
  featured: false,
  status: 'active',
  vendorId: 'v1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

// ------------------------------------------------------------ stripping
const stripped = stripInternalProductFields(base);
assert.equal('referenceImageUrls' in stripped, false, 'public product must not carry reference images');
assert.equal(JSON.stringify(stripped).includes('reference.jpg'), false);
assert.deepEqual(stripped.imageUrls, base.imageUrls, 'product images are untouched');
assert.deepEqual(base.referenceImageUrls, ['https://example.com/reference.jpg'], 'stripping does not mutate the input');

// --------------------------------------------------------- normalization
const fromKey = normalizeProductForDisplay({ ...base, referenceImageUrls: ['products/references/ref-test-product/1-a.jpg'] });
assert.match(fromKey.referenceImageUrls?.[0] ?? '', /^https:\/\/.+\/products\/references\/ref-test-product\/1-a\.jpg$/);
assert.equal(normalizeProductForDisplay({ ...base, referenceImageUrls: [] }).referenceImageUrls, undefined);
assert.equal(normalizeProductForDisplay({ ...base, referenceImageUrls: undefined }).referenceImageUrls, undefined);

// ------------------------------------------------------------- validator
assert.equal(productSchema.safeParse(base).success, true);
assert.equal(productSchema.safeParse({ ...base, referenceImageUrls: undefined }).success, true, 'reference image is optional');
assert.equal(productSchema.safeParse({ ...base, referenceImageUrls: ['data:image/png;base64,iVBORw0KGgo='] }).success, true, 'uploads accepted');
assert.equal(productSchema.safeParse({ ...base, referenceImageUrls: ['not a url'] }).success, false);
assert.equal(
  productSchema.safeParse({ ...base, referenceImageUrls: Array.from({ length: REFERENCE_IMAGES_MAX + 1 }, (_, i) => `https://example.com/${i}.jpg`) }).success,
  false,
  'reference image count is capped'
);
assert.deepEqual(productSchema.parse(base).referenceImageUrls, base.referenceImageUrls, 'validator keeps the field');

// ------------------------------------------- repository (local-file mode)
async function repoChecks() {
  delete process.env.DYNAMODB_TABLE;
  const localPath = path.join(process.cwd(), 'data', '.local-products.json');
  const previous = await fs.readFile(localPath, 'utf8').catch(() => null);
  await fs.writeFile(localPath, JSON.stringify([base]), 'utf8');
  try {
    const { listProducts, getProductByIdOrSlug, getProductBySlug } = await import('../lib/products-repo');

    const publicList = await listProducts();
    assert.equal(publicList.length, 1);
    assert.equal(publicList[0].referenceImageUrls, undefined, 'storefront list hides reference images');
    assert.equal((await getProductByIdOrSlug(base.id))?.referenceImageUrls, undefined, 'product page hides reference images');
    assert.equal((await getProductBySlug(base.slug))?.referenceImageUrls, undefined);

    const adminList = await listProducts({ includeInactive: true, includeInternal: true });
    assert.deepEqual(adminList[0].referenceImageUrls, base.referenceImageUrls, 'admin list shows reference images');
    assert.deepEqual((await getProductByIdOrSlug(base.id, { includeInternal: true }))?.referenceImageUrls, base.referenceImageUrls);
  } finally {
    if (previous === null) await fs.rm(localPath, { force: true });
    else await fs.writeFile(localPath, previous, 'utf8');
  }
}

repoChecks()
  .then(() => console.log('reference-images tests passed'))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
