import { permanentRedirect } from 'next/navigation';
import { categoryPath, getGiftCategoryBySlug } from '@/lib/categories';

// /shop used to show the same product grid as the homepage, so the two pages
// competed in search and split analytics. It now permanently redirects to the
// homepage. Only this exact path is affected: product pages (/shop/<slug>) and
// category pages (/shop/category/<slug>) are separate routes and keep working.
//
// Query strings are kept, so old search links (/shop?q=roses) still show
// results and campaign tags (utm_*) still reach analytics. An old
// /shop?category=<slug> link goes straight to that category's page, as before.

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const q = firstValue(searchParams.q);
  const category = firstValue(searchParams.category);
  const requestedCategory = category ? getGiftCategoryBySlug(category) : null;

  if (requestedCategory && !q) {
    permanentRedirect(categoryPath(requestedCategory));
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) query.append(key, item);
    }
  }

  const queryString = query.toString();
  permanentRedirect(queryString ? `/?${queryString}` : '/');
}
