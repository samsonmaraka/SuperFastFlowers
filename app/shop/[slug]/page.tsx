import { notFound } from 'next/navigation';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { getProductByIdOrSlug } from '@/lib/products-repo';

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductByIdOrSlug(params.slug);
  if (!product) notFound();

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-2">
      <img src={product.imageUrls[0]} alt={product.name} className="h-96 w-full rounded-xl object-cover" />
      <div className="space-y-4">
        <p className="text-sm uppercase text-pink-700">{product.category}</p>
        <h1 className="text-3xl font-semibold">{product.name}</h1>
        <p className="text-gray-700">{product.description}</p>
        <p className="text-2xl font-semibold">${product.price}</p>
        <p className="text-sm">Availability: {product.stockStatus.replace('_', ' ')}</p>
        <AddToCartButton product={product} />
      </div>
    </div>
  );
}
