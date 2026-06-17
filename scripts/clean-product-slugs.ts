import { cleanProductSlugs, validateProductSlugCleanup } from '@/lib/products-repo';

async function main() {
  const products = await cleanProductSlugs();
  const validations = validateProductSlugCleanup(products);
  const invalidProducts = validations.filter((validation) => !validation.isClean);

  console.log(`Cleaned ${products.length} product slugs.`);
  for (const validation of validations) {
    console.log(`${validation.id}: ${validation.currentSlug} (${validation.name})`);
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
