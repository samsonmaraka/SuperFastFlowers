import { notFound } from 'next/navigation';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { getProductByIdOrSlug } from '@/lib/products-repo';

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductByIdOrSlug(params.slug);

  if (!product) {
    notFound();
  }

  const heroImage = product.imageUrls?.[0] || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"%3E%3Crect width="100%25" height="100%25" fill="%23f9e8ef"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239f1239" font-size="40" font-family="Arial"%3EProduct image coming soon%3C/text%3E%3C/svg%3E';

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-2">
      <img src={heroImage} alt={product.name} className="h-[32rem] w-full rounded-xl object-cover" />

      <div className="space-y-4">
        <p className="text-sm uppercase text-pink-700">{product.category || 'Floral gift'}</p>
        <h1 className="text-3xl font-semibold">{product.name}</h1>
        <p className="text-gray-700">{product.description || 'No description available yet.'}</p>
        <p className="text-2xl font-semibold">UGX {product.price}</p>
        <AddToCartButton product={product} />
      </div>
    </div>
  );
}
