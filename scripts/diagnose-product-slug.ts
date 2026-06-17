import { diagnoseProductSlugByName } from '@/lib/products-repo';

async function main() {
  const name = process.argv.slice(2).join(' ') || 'Romantic Bear Hugs Cupcakes';
  const diagnostic = await diagnoseProductSlugByName(name);

  console.log(`Source: ${diagnostic.source}`);
  console.log(`Product ID: ${diagnostic.productId ?? '(not found)'}`);
  console.log(`Product name: ${diagnostic.productName}`);
  console.log(`Current slug: ${diagnostic.currentSlug ?? '(not found)'}`);
  console.log(`Expected slug: ${diagnostic.expectedSlug}`);

  if (diagnostic.source !== 'DynamoDB') {
    console.error('Production was NOT read because DYNAMODB_TABLE is not configured; result came from local fallback.');
    process.exitCode = 1;
  }

  if (!diagnostic.found) {
    console.error(`Product named "${name}" was not found.`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
