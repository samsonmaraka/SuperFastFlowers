import type { GiftCategory } from '@/lib/categories';
import { categoryPath } from '@/lib/categories';
import type { Product } from '@/lib/types';
import { getPrimaryProductImage } from '@/lib/product-images';
import { buildSiteUrl } from '@/lib/site-url';
import { getExpectedProductSlug } from '@/lib/slug';
import { DELIVERY_FEE_PER_VENDOR } from '@/lib/delivery-fee';
import { getProductPreparationDays } from '@/lib/preparation-days';

export const STORE_NAME = 'Sendagift UG';
export const STORE_DESCRIPTION = 'Sendagift UG helps you send a gift in Uganda, including cakes, flowers, cupcakes, hampers, and thoughtful gifts for birthdays, baby showers, congratulations, and special occasions.';
export const STORE_LOGO_PATH = '/icon-192.png';
export const STORE_PHONE = '+256703578111';
export const STORE_EMAIL = 'support@sendagift.ug';
export const STORE_DELIVERY_AREAS = ['Kampala', 'Entebbe'];

export function storeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: STORE_NAME,
    url: buildSiteUrl('/'),
    logo: buildSiteUrl(STORE_LOGO_PATH),
    description: STORE_DESCRIPTION,
    telephone: STORE_PHONE,
    email: STORE_EMAIL,
    areaServed: [
      ...STORE_DELIVERY_AREAS.map((city) => ({ '@type': 'City', name: city })),
      { '@type': 'Country', name: 'Uganda' }
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: STORE_PHONE,
      email: STORE_EMAIL,
      areaServed: 'UG'
    }
  };
}

export function productPath(product: Pick<Product, 'id' | 'name' | 'slug'>) {
  return `/shop/${getExpectedProductSlug(product)}`;
}

export function productUrl(product: Pick<Product, 'id' | 'name' | 'slug'>) {
  return buildSiteUrl(productPath(product));
}

export function categoryUrl(category: Pick<GiftCategory, 'slug'>) {
  return buildSiteUrl(categoryPath(category));
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

// Delivery is charged per vendor (distance-based) with a flat per-vendor base fee.
// We advertise that base fee as the representative shipping rate and derive the
// handling window from the product's preparation days.
function offerShippingDetails(product: Product) {
  return {
    '@type': 'OfferShippingDetails',
    shippingRate: {
      '@type': 'MonetaryAmount',
      value: DELIVERY_FEE_PER_VENDOR,
      currency: 'UGX'
    },
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: 'UG'
    },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: {
        '@type': 'QuantitativeValue',
        minValue: 0,
        maxValue: getProductPreparationDays(product),
        unitCode: 'DAY'
      },
      transitTime: {
        '@type': 'QuantitativeValue',
        minValue: 0,
        maxValue: 1,
        unitCode: 'DAY'
      }
    }
  };
}

// Flowers, cakes, and hampers are perishable, so returns are not accepted.
// This is a valid, honest return policy that satisfies Google's recommendation.
function merchantReturnPolicy() {
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'UG',
    returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted'
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
    brand: {
      '@type': 'Brand',
      name: STORE_NAME
    },
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
      },
      shippingDetails: offerShippingDetails(product),
      hasMerchantReturnPolicy: merchantReturnPolicy()
    }
  };
}


export function categoryBreadcrumbJsonLd(category: Pick<GiftCategory, 'label' | 'slug'>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: buildSiteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: buildSiteUrl('/shop') },
      { '@type': 'ListItem', position: 3, name: category.label, item: categoryUrl(category) }
    ]
  };
}

export function productBreadcrumbJsonLd(product: Product, category?: Pick<GiftCategory, 'label' | 'slug'> | null) {
  const crumbs = [
    { name: 'Home', item: buildSiteUrl('/') },
    { name: 'Shop', item: buildSiteUrl('/shop') },
    ...(category ? [{ name: category.label, item: categoryUrl(category) }] : []),
    { name: product.name, item: productUrl(product) }
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, ...crumb }))
  };
}

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
