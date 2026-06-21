import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/product-card';
import { categoryPath, getGiftCategoryBySlug, getSortedGiftCategories } from '@/lib/categories';
import { listProducts } from '@/lib/products-repo';
import { buildSiteUrl } from '@/lib/site-url';
import { categoryBreadcrumbJsonLd, itemListJsonLd, JsonLd } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CategoryPageProps = {
  params: { category: string };
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const category = getGiftCategoryBySlug(params.category);

  if (!category) {
    return {};
  }

  const title = category.seoTitle || `${category.label} Gifts in Uganda | Sendagift UG`;
  const description = category.seoDescription || category.description || `Shop ${category.label.toLowerCase()} gifts in Uganda with Sendagift UG.`;
  const url = buildSiteUrl(categoryPath(category));

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Sendagift UG',
      type: 'website'
    },
    twitter: {
      card: 'summary',
      title,
      description
    }
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const category = getGiftCategoryBySlug(params.category);

  if (!category) {
    notFound();
  }

  const products = await listProducts({ category: category.slug, categoryMatch: 'assigned' });
  const categories = getSortedGiftCategories();
  const relatedCategories = (category.relatedCategories || [])
    .map((slug) => getGiftCategoryBySlug(slug))
    .filter((relatedCategory): relatedCategory is NonNullable<typeof relatedCategory> => Boolean(relatedCategory));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <JsonLd data={[categoryBreadcrumbJsonLd(category), itemListJsonLd(products)]} />

      <section className="mb-8 rounded-3xl border border-blush bg-white p-6 shadow-sm md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-pink-700">Shop by occasion</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink md:text-4xl">{category.h1 || `${category.label} Gifts in Uganda`}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-gray-700">
          {category.intro || category.description || `Browse ${category.label.toLowerCase()} gifts available from Sendagift UG.`}
        </p>
        {relatedCategories.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <span className="py-2 font-semibold text-gray-700">Related:</span>
            {relatedCategories.map((relatedCategory) => (
              <Link
                key={relatedCategory.slug}
                href={categoryPath(relatedCategory)}
                className="rounded-full border border-gray-300 bg-cream px-4 py-2 text-ink transition hover:border-ink/40"
              >
                {relatedCategory.label}
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <nav className="mb-5" aria-label="Gift categories">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          <Link href="/shop" className="whitespace-nowrap rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-ink transition hover:border-ink/40">
            All gifts
          </Link>
          {categories.map((giftCategory) => {
            const isActive = giftCategory.slug === category.slug;

            return (
              <Link
                key={giftCategory.slug}
                href={categoryPath(giftCategory)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${
                  isActive ? 'border-ink bg-ink text-white' : 'border-gray-300 bg-white text-ink hover:border-ink/40'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {giftCategory.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {products.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-gray-600">
          <p className="text-lg font-semibold text-ink">No products are listed in {category.label} yet.</p>
          <p className="mt-2">Please check back soon or browse all gifts while we update this category.</p>
          <Link href="/shop" className="mt-4 inline-flex rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white transition hover:bg-pink-700">
            Browse all gifts
          </Link>
        </div>
      )}
    </div>
  );
}
