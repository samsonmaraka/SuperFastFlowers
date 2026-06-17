import { cleanProductSlugs, validateProductSlugCleanup } from '@/lib/products-repo';

function isExplicitLocalMode() {
  return process.argv.includes('--local') || process.env.PRODUCT_SLUG_CLEANUP_LOCAL === '1';
}

async function main() {
  const localMode = isExplicitLocalMode();

  if (!process.env.DYNAMODB_TABLE && !localMode) {
    console.error('DYNAMODB_TABLE is not configured. Production DynamoDB was NOT updated.');
    console.error('Set DYNAMODB_TABLE, AWS_REGION/REGION, and AWS credentials to update production, or rerun with --local / PRODUCT_SLUG_CLEANUP_LOCAL=1 for local fallback only.');
    process.exit(1);
  }

  const products = await cleanProductSlugs();
  const validations = validateProductSlugCleanup(products);
  const invalidProducts = validations.filter((validation) => !validation.isClean);

  console.log(`${localMode && !process.env.DYNAMODB_TABLE ? 'Locally cleaned' : 'Cleaned'} ${products.length} product slugs.`);
  for (const validation of validations) {
    console.log(`${validation.id}: ${validation.currentSlug} (${validation.name})`);
  }

  if (!process.env.DYNAMODB_TABLE) {
    console.error('Local fallback was used. Production DynamoDB was NOT updated.');
    if (!localMode) process.exit(1);
  } else {
    console.log(`Updated DynamoDB table ${process.env.DYNAMODB_TABLE}.`);
  }

  if (invalidProducts.length > 0) {
    console.error('Product slug cleanup validation failed:');
    for (const validation of invalidProducts) {
      console.error(`${validation.id}: ${validation.name} has ${validation.currentSlug}; expected ${validation.expectedSlug}`);
    }
    process.exit(1);
  }

  console.log('Validated product slugs against product names.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
