import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand
} from '@aws-sdk/lib-dynamodb';
import { Product } from '@/lib/types';
import { db } from '@/lib/dynamodb';
import { getEnv, isDynamoConfigured } from '@/lib/env';
import { seedProducts } from '@/data/seed-products';

const localProductsPath = path.join(process.cwd(), 'data', '.local-products.json');

async function loadLocalProducts() {
  try {
    const raw = await fs.readFile(localProductsPath, 'utf8');
    const parsed = JSON.parse(raw) as Product[];
    return Array.isArray(parsed) ? parsed : [...seedProducts];
  } catch {
    return [...seedProducts];
  }
}

async function persistLocalProducts(products: Product[]) {
  await fs.writeFile(localProductsPath, JSON.stringify(products, null, 2), 'utf8');
}

export async function listProducts(options?: { category?: string; q?: string; featured?: boolean }) {
  const { category, q, featured } = options || {};

  if (!isDynamoConfigured()) {
    console.warn('[products-repo] DynamoDB disabled; falling back to local products.', {
      hasTableName: Boolean(getEnv().tableName),
      tableName: getEnv().tableName || '(empty)'
    });
    const localProducts = await loadLocalProducts();
    return filterProducts(localProducts, category, q, featured);
  }

  const res = await db.send(
    new ScanCommand({
      TableName: getEnv().tableName,
      FilterExpression: '#entity = :entity',
      ExpressionAttributeNames: { '#entity': 'entityType' },
      ExpressionAttributeValues: { ':entity': 'PRODUCT' }
    })
  );

  return filterProducts((res.Items || []) as Product[], category, q, featured);
}

function filterProducts(products: Product[], category?: string, q?: string, featured?: boolean) {
  return products.filter((p) => {
    const matchesCategory = category ? p.category.toLowerCase() === category.toLowerCase() : true;
    const matchesQ = q
      ? [p.name, p.description, p.category, p.tags.join(' ')].join(' ').toLowerCase().includes(q.toLowerCase())
      : true;
    const matchesFeatured = featured !== undefined ? p.featured === featured : true;

    return matchesCategory && matchesQ && matchesFeatured;
  });
}

export async function getProductByIdOrSlug(idOrSlug: string) {
  if (!isDynamoConfigured()) {
    console.warn('[products-repo] DynamoDB disabled in getProductByIdOrSlug.', {
      hasTableName: Boolean(getEnv().tableName),
      tableName: getEnv().tableName || '(empty)'
    });
    const localProducts = await loadLocalProducts();
    return localProducts.find((p) => p.id === idOrSlug || p.slug === idOrSlug) || null;
  }

  const byId = await db.send(
    new GetCommand({
      TableName: getEnv().tableName,
      Key: { pk: `PRODUCT#${idOrSlug}`, sk: 'META' }
    })
  );

  if (byId.Item) return byId.Item as Product;

  const bySlug = await db.send(
    new QueryCommand({
      TableName: getEnv().tableName,
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :gsi1pk',
      ExpressionAttributeValues: { ':gsi1pk': `SLUG#${idOrSlug}` },
      Limit: 1
    })
  );

  return ((bySlug.Items || [])[0] as Product | undefined) || null;
}

export async function upsertProduct(product: Product) {
  if (!isDynamoConfigured()) {
    console.warn('[products-repo] DynamoDB disabled in upsertProduct.', {
      hasTableName: Boolean(getEnv().tableName),
      tableName: getEnv().tableName || '(empty)'
    });
    const localProducts = await loadLocalProducts();
    const updatedProducts = [...localProducts.filter((p) => p.id !== product.id), product];
    await persistLocalProducts(updatedProducts);
    return product;
  }

  await db.send(
    new PutCommand({
      TableName: getEnv().tableName,
      Item: {
        ...product,
        entityType: 'PRODUCT',
        pk: `PRODUCT#${product.id}`,
        sk: 'META',
        gsi1pk: `SLUG#${product.slug}`,
        gsi1sk: `PRODUCT#${product.id}`
      }
    })
  );

  return product;
}

export async function deleteProduct(id: string) {
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
