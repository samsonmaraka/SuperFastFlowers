import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { ProductCard } from '@/components/product-card';
import { SendThisGiftButton } from '@/components/send-this-gift-button';
import { categoryPath, getGiftCategoryBySlug } from '@/lib/categories';
import { getProductByIdOrSlug, listProducts } from '@/lib/products-repo';
import { getExpectedProductSlug } from '@/lib/slug';
import { formatUgx } from '@/lib/format';
import { getPrimaryProductImage } from '@/lib/product-images';
import { ProductImage } from '@/components/product-image';
import { JsonLd, productBreadcrumbJsonLd, productJsonLd, productUrl, STORE_DELIVERY_AREAS } from '@/lib/seo';
import type { Product } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductByIdOrSlug(params.slug);

  if (!product) {
    return {};
  }

  const expectedSlug = getExpectedProductSlug(product);
  const canonicalUrl = productUrl({ ...product, slug: expectedSlug });
  const image = getPrimaryProductImage(product);

  return {
    title: product.name,
    description: product.description || `Order ${product.name} from Sendagift UG in Uganda.`,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: product.name,
      description: product.description || `Order ${product.name} from Sendagift UG in Uganda.`,
      url: canonicalUrl,
      type: 'website',
      images: [{ url: image, alt: product.name }]
    }
  };
}

async function getRelatedProducts(product: Product) {
  const sameCategory = product.category ? await listProducts({ category: product.category }) : [];
  let related = sameCategory.filter((candidate) => candidate.id !== product.id);

  if (related.length === 0) {
    const allProducts = await listProducts();
    related = allProducts.filter((candidate) => candidate.id !== product.id);
  }

  return related.slice(0, 3);
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductByIdOrSlug(params.slug);

  if (!product) {
    notFound();
  }

  const expectedSlug = getExpectedProductSlug(product);

  if (params.slug !== expectedSlug) {
    permanentRedirect(`/shop/${expectedSlug}`);
  }

  const canonicalProduct = { ...product, slug: expectedSlug };
  const heroImage = getPrimaryProductImage(product);
  const category = product.category ? getGiftCategoryBySlug(product.category) : null;
  const relatedProducts = await getRelatedProducts(product);

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/shop' },
    ...(category ? [{ label: category.label, href: categoryPath(category) }] : [])
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <JsonLd data={[productJsonLd(canonicalProduct), productBreadcrumbJsonLd(canonicalProduct, category)]} />

      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-600">
        <ol className="flex flex-wrap items-center gap-1">
          {breadcrumbs.map((crumb) => (
            <li key={crumb.href} className="flex items-center gap-1">
              <Link href={crumb.href} className="transition hover:text-pink-700 hover:underline">
                {crumb.label}
              </Link>
              <span aria-hidden="true">›</span>
            </li>
          ))}
          <li aria-current="page" className="font-medium text-ink">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative h-[32rem] w-full overflow-hidden rounded-xl">
          <ProductImage src={heroImage} alt={product.name} sizes="(min-width: 768px) 50vw, 100vw" priority className="object-cover" />
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-semibold">{product.name}</h1>
          <p className="text-gray-700">{product.description || 'No description available yet.'}</p>
          <p className="text-2xl font-semibold">UGX {formatUgx(product.price)}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <SendThisGiftButton product={product} />
            <div className="sm:pt-0.5">
              <AddToCartButton product={product} />
            </div>
          </div>

          <section className="rounded-xl border border-blush bg-cream/60 p-5">
            <h2 className="text-lg font-semibold text-ink">Delivery information</h2>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              <li>We deliver across the {STORE_DELIVERY_AREAS.join(' and ')} areas in Uganda.</li>
              {product.preparationDays && product.preparationDays > 0 ? (
                <li>
                  This item needs {product.preparationDays} day{product.preparationDays > 1 ? 's' : ''} of preparation before
                  it can be delivered.
                </li>
              ) : (
                <li>Order before 9:00 am (GMT+3) to have this gift delivered the same day.</li>
              )}
              <li>Pick your preferred delivery date at checkout and add a note for the recipient.</li>
            </ul>
          </section>
        </div>
      </div>

      {relatedProducts.length > 0 ? (
        <section className="mt-14">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-2xl font-semibold text-ink">You may also like</h2>
            {category ? (
              <Link href={categoryPath(category)} className="text-sm font-semibold text-pink-700 hover:underline">
                See all {category.label} gifts
              </Link>
            ) : null}
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
