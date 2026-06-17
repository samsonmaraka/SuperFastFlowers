import type { Product } from '@/lib/types';
import { getPrimaryProductImage } from '@/lib/product-images';
import { buildSiteUrl } from '@/lib/site-url';
import { getExpectedProductSlug } from '@/lib/slug';

export const STORE_NAME = 'Sendagift UG';
export const STORE_DESCRIPTION = 'Sendagift UG helps you send cakes, flowers, cupcakes, hampers, and thoughtful gifts in Uganda. Order online for birthdays, love, baby showers, get well, and special occasions.';
export const STORE_LOGO_PATH = '/icon-192.png';

export function productPath(product: Pick<Product, 'id' | 'name' | 'slug'>) {
  return `/shop/${getExpectedProductSlug(product)}`;
}

export function productUrl(product: Pick<Product, 'id' | 'name' | 'slug'>) {
  return buildSiteUrl(productPath(product));
}

export function itemListJsonLd(products: Product[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: product.name,
      url: productUrl(product)
    }))
  };
}

export function productJsonLd(product: Product) {
  const url = productUrl(product);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `${product.name} from Sendagift UG`,
    image: product.imageUrls?.length ? product.imageUrls : [getPrimaryProductImage(product)],
    sku: product.id,
    url,
    seller: {
      '@type': 'Organization',
      name: product.vendorName || STORE_NAME
    },
    offers: {
      '@type': 'Offer',
      url,
      price: product.price,
      priceCurrency: 'UGX',
      availability: product.stockStatus === 'out_of_stock' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: product.vendorName || STORE_NAME
      }
    }
  };
}

export function productBreadcrumbJsonLd(product: Product) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: buildSiteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: buildSiteUrl('/shop') },
      { '@type': 'ListItem', position: 3, name: product.name, item: productUrl(product) }
    ]
  };
}

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
