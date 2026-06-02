import { Product } from '@/lib/types';

const DEFAULT_PRODUCT_IMAGES_PREFIX = 'products';
const DEFAULT_PRODUCT_IMAGES_PUBLIC_BASE_URL = 'https://giftora-product-images-prod.s3.eu-north-1.amazonaws.com';

const IMAGE_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"%3E%3Crect width="100%25" height="100%25" fill="%23f9e8ef"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239f1239" font-size="40" font-family="Arial"%3EProduct image coming soon%3C/text%3E%3C/svg%3E';

export function isDataImageUrl(value: string) {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(value);
}

export function imageFieldContainsBase64(value: string) {
  return value.startsWith('data:') || /^[A-Za-z0-9+/]+={0,2}$/.test(value.slice(0, 120));
}

function getProductImagesPrefix() {
  return (process.env.PRODUCT_IMAGES_PREFIX || DEFAULT_PRODUCT_IMAGES_PREFIX).replace(/^\/+|\/+$/g, '');
}

function getProductImagesPublicBaseUrl() {
  return (process.env.PRODUCT_IMAGES_PUBLIC_BASE_URL || DEFAULT_PRODUCT_IMAGES_PUBLIC_BASE_URL).replace(/\/+$/g, '');
}

function normalizeStoredImageValue(value: string) {
  const prefix = getProductImagesPrefix();
  if (value.startsWith(`${prefix}/`)) {
    return `${getProductImagesPublicBaseUrl()}/${value.split('/').map(encodeURIComponent).join('/')}`;
  }

  return value;
}

export function isProductImageStorageKey(value: string) {
  return value.startsWith(`${getProductImagesPrefix()}/`);
}

function collectImageValues(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) return [normalizeStoredImageValue(value.trim())];
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => normalizeStoredImageValue(item.trim()));
}

export function normalizeProductImageUrls(product: Product): string[] {
  const legacyProduct = product as Product & {
    image?: unknown;
    imageUrl?: unknown;
    images?: unknown;
    gallery?: unknown;
    media?: unknown;
  };

  const imageUrls = [
    ...collectImageValues(legacyProduct.imageUrls),
    ...collectImageValues(legacyProduct.imageUrl),
    ...collectImageValues(legacyProduct.image),
    ...collectImageValues(legacyProduct.images),
    ...collectImageValues(legacyProduct.gallery),
    ...collectImageValues(legacyProduct.media)
  ];

  return Array.from(new Set(imageUrls));
}

export function normalizeProductForDisplay(product: Product): Product {
  return {
    ...product,
    imageUrls: normalizeProductImageUrls(product)
  };
}

export function getPrimaryProductImage(product: Product) {
  return normalizeProductImageUrls(product)[0] || IMAGE_PLACEHOLDER;
}
