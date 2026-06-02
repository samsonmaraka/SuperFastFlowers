import assert from 'node:assert/strict';
import { buildSignedS3RequestUrl } from '../lib/product-image-storage';
import { buildProductImagePublicUrl, normalizeProductImagesPublicBaseUrl } from '../lib/product-images';

const originalBaseUrl = process.env.PRODUCT_IMAGES_PUBLIC_BASE_URL;

try {
  const correctedBaseUrl = normalizeProductImagesPublicBaseUrl('https:://giftora-product-images-prod.s3.eu-north-1.amazonaws.com/');
  assert.equal(correctedBaseUrl, 'https://giftora-product-images-prod.s3.eu-north-1.amazonaws.com');
  assert.ok(correctedBaseUrl.startsWith('https://'));
  assert.ok(!correctedBaseUrl.startsWith('https:://'));

  process.env.PRODUCT_IMAGES_PUBLIC_BASE_URL = 'https:://giftora-product-images-prod.s3.eu-north-1.amazonaws.com/';
  const publicImageUrl = buildProductImagePublicUrl('products/test-product/image.png');
  assert.equal(publicImageUrl, 'https://giftora-product-images-prod.s3.eu-north-1.amazonaws.com/products/test-product/image.png');
  assert.ok(publicImageUrl.startsWith('https://'));
  assert.ok(!publicImageUrl.startsWith('https:://'));

  const uploadUrl = buildSignedS3RequestUrl({
    protocol: 'https:',
    hostname: 'giftora-product-images-prod.s3.eu-north-1.amazonaws.com',
    path: '/products/test-product/image.png'
  });
  assert.equal(uploadUrl, 'https://giftora-product-images-prod.s3.eu-north-1.amazonaws.com/products/test-product/image.png');
  assert.ok(uploadUrl.startsWith('https://'));
  assert.ok(!uploadUrl.startsWith('https:://'));

  assert.throws(
    () => normalizeProductImagesPublicBaseUrl('http://giftora-product-images-prod.s3.eu-north-1.amazonaws.com'),
    /must start with https:\/\//
  );

  console.log('Product image URL validation passed.');
} finally {
  if (originalBaseUrl === undefined) {
    delete process.env.PRODUCT_IMAGES_PUBLIC_BASE_URL;
  } else {
    process.env.PRODUCT_IMAGES_PUBLIC_BASE_URL = originalBaseUrl;
  }
}
