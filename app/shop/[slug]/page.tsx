import { notFound } from 'next/navigation';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { getProductByIdOrSlug } from '@/lib/products-repo';
import { formatUgx } from '@/lib/format';
import { getPrimaryProductImage } from '@/lib/product-images';

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductByIdOrSlug(params.slug);

  if (!product) {
    notFound();
  }

  const heroImage = getPrimaryProductImage(product);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-2">
      <img src={heroImage} alt={product.name} className="h-[32rem] w-full rounded-xl object-cover" />

      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">{product.name}</h1>
        <p className="text-gray-700">{product.description || 'No description available yet.'}</p>
        <p className="text-2xl font-semibold">UGX {formatUgx(product.price)}</p>
        <AddToCartButton product={product} />
      </div>
    </div>
  );
}
