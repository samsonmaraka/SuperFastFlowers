import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { SendThisGiftButton } from '@/components/send-this-gift-button';
import { getProductByIdOrSlug } from '@/lib/products-repo';
import { formatUgx } from '@/lib/format';
import { getPrimaryProductImage } from '@/lib/product-images';
import { JsonLd, productBreadcrumbJsonLd, productJsonLd, productUrl } from '@/lib/seo';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductByIdOrSlug(params.slug);

  if (!product) {
    return {};
  }

  const canonicalUrl = productUrl(product);
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

  if (params.slug !== product.slug) {
    permanentRedirect(`/shop/${product.slug}`);
  }

  const heroImage = getPrimaryProductImage(product);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-2">
      <JsonLd data={[productJsonLd(product), productBreadcrumbJsonLd(product)]} />
      <img src={heroImage} alt={product.name} className="h-[32rem] w-full rounded-xl object-cover" />

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
