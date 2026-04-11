import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/dynamodb';
import { env } from '@/lib/env';
import { seedProducts } from '@/data/seed-products';

async function main() {
  if (!env.tableName) {
    throw new Error('DYNAMODB_TABLE is required to seed DynamoDB');
  }

  for (const product of seedProducts) {
    await db.send(
      new PutCommand({
        TableName: env.tableName,
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
  }

  console.log(`Seeded ${seedProducts.length} products into ${env.tableName}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
