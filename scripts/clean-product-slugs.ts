import { cleanProductSlugs } from '@/lib/products-repo';

async function main() {
  const products = await cleanProductSlugs();

  console.log(`Cleaned ${products.length} product slugs.`);
  for (const product of products) {
    console.log(`${product.id}: ${product.slug}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
