import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand
} from '@aws-sdk/lib-dynamodb';
import { Product, Vendor } from '@/lib/types';
import { normalizeProductForDisplay } from '@/lib/product-images';
import { db } from '@/lib/dynamodb';
import { getEnv, isDynamoConfigured } from '@/lib/env';
import { seedProducts } from '@/data/seed-products';
import { getVendor } from '@/lib/vendors-repo';

const localProductsPath = path.join(process.cwd(), 'data', '.local-products.json');

type ProductSaveErrorCode = 'VENDOR_REQUIRED' | 'VENDOR_NOT_FOUND' | 'VENDOR_INACTIVE';

export class ProductSaveError extends Error {
  code: ProductSaveErrorCode;
  status: number;
  details: Record<string, unknown>;

  constructor(code: ProductSaveErrorCode, message: string, status = 400, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ProductSaveError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function loadLocalProducts() {
  try {
    const raw = await fs.readFile(localProductsPath, 'utf8');
    const parsed = JSON.parse(raw) as Product[];
    return Array.isArray(parsed) ? parsed : [...seedProducts];
  } catch {
    return [...seedProducts];
  }
}

function shouldAllowLocalFallback() {
  return process.env.NODE_ENV !== 'production';
}

function ensureProductsStorageConfigured() {
  if (!isDynamoConfigured() && !shouldAllowLocalFallback()) {
    console.error('[products-repo] DYNAMODB_TABLE is missing in production. Falling back to local seed data; this is unsafe for production and can cause stale data behavior.');
  }
}

async function persistLocalProducts(products: Product[]) {
  await fs.writeFile(localProductsPath, JSON.stringify(products, null, 2), 'utf8');
}

function applyVendorSnapshot(product: Product, vendor: Vendor): Product {
  return {
    ...product,
    vendorId: vendor.id,
    vendorName: vendor.name,
    vendorContactPerson: vendor.contactPerson,
    vendorPhone: vendor.phone,
    vendorEmail: vendor.email,
    vendorLocation: vendor.location,
    vendorLatitude: vendor.vendorLatitude,
    vendorLongitude: vendor.vendorLongitude
  };
}

export async function getActiveVendorForProduct(product: Product) {
  if (!product.vendorId) {
    throw new ProductSaveError('VENDOR_REQUIRED', 'Please select an active vendor before saving this product.', 400);
  }

  const vendor = await getVendor(product.vendorId);
  if (!vendor) {
    throw new ProductSaveError('VENDOR_NOT_FOUND', 'Selected vendor was not found. Please choose an active vendor and try again.', 404, {
      vendorId: product.vendorId
    });
  }

  if (vendor.status !== 'active') {
    throw new ProductSaveError('VENDOR_INACTIVE', 'Selected vendor is inactive. Please choose an active vendor before saving this product.', 400, {
      vendorId: vendor.id,
      vendorStatus: vendor.status
    });
  }

  return vendor;
}

export async function listProducts(options?: { category?: string; q?: string; featured?: boolean; includeInactive?: boolean }) {
  const { category, q, featured, includeInactive = false } = options || {};
  ensureProductsStorageConfigured();

  if (!isDynamoConfigured()) {
    console.warn('[products-repo] DynamoDB disabled; falling back to local products.', {
      hasTableName: Boolean(getEnv().tableName),
      tableName: getEnv().tableName || '(empty)'
    });
    const localProducts = await loadLocalProducts();
    return filterProducts(localProducts.map(normalizeProductForDisplay), category, q, featured, includeInactive);
  }

  const res = await db.send(
    new ScanCommand({
      TableName: getEnv().tableName,
      FilterExpression: '#entity = :entity',
      ExpressionAttributeNames: { '#entity': 'entityType' },
      ExpressionAttributeValues: { ':entity': 'PRODUCT' }
    })
  );

  return filterProducts(((res.Items || []) as Product[]).map(normalizeProductForDisplay), category, q, featured, includeInactive);
}

function filterProducts(products: Product[], category?: string, q?: string, featured?: boolean, includeInactive = false) {
  return products.filter((p) => {
    const normalizedCategories = p.categories ?? [];
    const matchesCategory = category ? normalizedCategories.some((slug) => slug.toLowerCase() === category.toLowerCase()) : true;
    const matchesQ = q
      ? [p.name, p.description, p.category, normalizedCategories.join(' '), (p.tags ?? []).join(' ')].join(' ').toLowerCase().includes(q.toLowerCase())
      : true;
    const matchesFeatured = featured !== undefined ? p.featured === featured : true;
    const matchesStatus = includeInactive ? true : (p.status ?? 'active') === 'active';

    return matchesCategory && matchesQ && matchesFeatured && matchesStatus;
  });
}

export async function getProductBySlug(slug: string, options?: { includeInactive?: boolean }) {
  const { includeInactive = false } = options || {};
  ensureProductsStorageConfigured();
  if (!isDynamoConfigured()) {
    console.warn('[products-repo] DynamoDB disabled in getProductBySlug.', {
      hasTableName: Boolean(getEnv().tableName),
      tableName: getEnv().tableName || '(empty)'
    });
    const localProducts = await loadLocalProducts();
    const product = localProducts.find((p) => p.slug === slug) || null;
    if (product && !includeInactive && (product.status ?? 'active') !== 'active') return null;
    return product ? normalizeProductForDisplay(product) : null;
  }

  const bySlug = await db.send(
    new QueryCommand({
      TableName: getEnv().tableName,
      IndexName: getEnv().productSlugIndexName,
      KeyConditionExpression: 'gsi1pk = :gsi1pk',
      ExpressionAttributeValues: { ':gsi1pk': `SLUG#${slug}` },
      Limit: 1
    })
  );

  const product = ((bySlug.Items || [])[0] as Product | undefined) || null;
  if (product && !includeInactive && (product.status ?? 'active') !== 'active') return null;
  return product ? normalizeProductForDisplay(product) : null;
}

export async function getProductByIdOrSlug(idOrSlug: string, options?: { includeInactive?: boolean }) {
  const { includeInactive = false } = options || {};
  ensureProductsStorageConfigured();
  if (!isDynamoConfigured()) {
    console.warn('[products-repo] DynamoDB disabled in getProductByIdOrSlug.', {
      hasTableName: Boolean(getEnv().tableName),
      tableName: getEnv().tableName || '(empty)'
    });
    const localProducts = await loadLocalProducts();
    const product = localProducts.find((p) => p.id === idOrSlug || p.slug === idOrSlug) || null;
    if (product && !includeInactive && (product.status ?? 'active') !== 'active') return null;
    return product ? normalizeProductForDisplay(product) : null;
  }

  const byId = await db.send(
    new GetCommand({
      TableName: getEnv().tableName,
      Key: { pk: `PRODUCT#${idOrSlug}`, sk: 'META' }
    })
  );

  if (byId.Item) {
    const product = byId.Item as Product;
    if (!includeInactive && (product.status ?? 'active') !== 'active') return null;
    return normalizeProductForDisplay(product);
  }

  return getProductBySlug(idOrSlug, { includeInactive });
}

export async function upsertProduct(product: Product) {
  ensureProductsStorageConfigured();
  const vendor = await getActiveVendorForProduct(product);
  const nextProduct = applyVendorSnapshot(product, vendor);

  if (!isDynamoConfigured()) {
    console.warn('[products-repo] DynamoDB disabled in upsertProduct.', {
      hasTableName: Boolean(getEnv().tableName),
      tableName: getEnv().tableName || '(empty)'
    });
    const localProducts = await loadLocalProducts();
    const updatedProducts = [...localProducts.filter((p) => p.id !== nextProduct.id), nextProduct];
    await persistLocalProducts(updatedProducts);
    return nextProduct;
  }

  await db.send(
    new PutCommand({
      TableName: getEnv().tableName,
      Item: {
        ...nextProduct,
        entityType: 'PRODUCT',
        pk: `PRODUCT#${nextProduct.id}`,
        sk: 'META',
        gsi1pk: `SLUG#${nextProduct.slug}`,
        gsi1sk: `PRODUCT#${nextProduct.id}`
      }
    })
  );

  return nextProduct;
}

export async function deleteProduct(id: string) {
  ensureProductsStorageConfigured();
  if (!isDynamoConfigured()) {
    console.warn('[products-repo] DynamoDB disabled in deleteProduct.', {
      hasTableName: Boolean(getEnv().tableName),
      tableName: getEnv().tableName || '(empty)'
    });
    const localProducts = await loadLocalProducts();
    const updatedProducts = localProducts.filter((p) => p.id !== id);
    await persistLocalProducts(updatedProducts);
    return;
  }

  await db.send(
    new DeleteCommand({
      TableName: getEnv().tableName,
      Key: { pk: `PRODUCT#${id}`, sk: 'META' }
    })
  );
}
