import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/product-card';
import { categoryPath, getGiftCategoryBySlug, getSortedGiftCategories, normalizeCategorySlug } from '@/lib/categories';
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
  const description =
    category.seoDescription ||
    category.description ||
    `Sendagift UG helps you send ${category.label.toLowerCase()} gifts in Uganda for birthdays, celebrations, and special occasions.`;
  const url = buildSiteUrl(categoryPath(category));

  return {
    title: { absolute: title },
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
  const activeCategory = normalizeCategorySlug(category.slug);
  const relatedCategories = (category.relatedCategories || [])
    .map((slug) => getGiftCategoryBySlug(slug))
    .filter((related): related is NonNullable<typeof related> => related !== null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <JsonLd data={[categoryBreadcrumbJsonLd(category), itemListJsonLd(products)]} />

      <header className="mb-6 max-w-3xl">
        <h1 className="text-3xl font-semibold text-ink">{category.h1 || `${category.label} Gifts in Uganda`}</h1>
        {category.intro ? <p className="mt-3 text-gray-700">{category.intro}</p> : null}
      </header>

      <nav className="mb-5" aria-label="Gift categories">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          <Link href="/shop" className="whitespace-nowrap rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-ink transition hover:border-ink/40">
            All gifts
          </Link>
          {categories.map((giftCategory) => {
            const isActive = activeCategory === normalizeCategorySlug(giftCategory.slug);

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

      {relatedCategories.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-ink">Explore related gift ideas</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {relatedCategories.map((related) => (
              <Link
                key={related.slug}
                href={categoryPath(related)}
                className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-ink transition hover:border-ink/40 hover:text-pink-700"
              >
                {related.h1 || `${related.label} Gifts in Uganda`}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
