import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { SendThisGiftButton } from '@/components/send-this-gift-button';
import { getProductByIdOrSlug } from '@/lib/products-repo';
import { getExpectedProductSlug } from '@/lib/slug';
import { formatUgx } from '@/lib/format';
import { getPrimaryProductImage } from '@/lib/product-images';
import { ProductImage } from '@/components/product-image';
import { JsonLd, productBreadcrumbJsonLd, productJsonLd, productUrl } from '@/lib/seo';

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

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-2">
      <JsonLd data={[productJsonLd(canonicalProduct), productBreadcrumbJsonLd(canonicalProduct)]} />
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
      </div>
    </div>
  );
}
