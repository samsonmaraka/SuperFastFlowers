import type { Product } from '@/lib/types';

export const CATALOGUE_CSV_DELIMITER = ',';
export const CATALOGUE_CSV_LIST_SEPARATOR = '|';
export const CATALOGUE_CSV_CURRENCY = 'UGX';

export const catalogueCsvColumns = [
  'product_id',
  'slug',
  'vendor_id',
  'vendor_name',
  'title',
  'description',
  'price',
  'currency',
  'categories',
  'tags',
  'image_urls',
  'is_active',
  'is_featured',
  'stock_status',
  'delivery_notes',
  'updated_at'
] as const;

export type CatalogueCsvColumn = (typeof catalogueCsvColumns)[number];
export type CatalogueCsvRow = Record<CatalogueCsvColumn, string>;

function listValue(values: Array<string | undefined | null>) {
  return values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)).join(CATALOGUE_CSV_LIST_SEPARATOR);
}

function formatPrice(value: number) {
  return Number.isFinite(value) ? String(value) : '';
}

function formatBoolean(value: boolean) {
  return value ? 'true' : 'false';
}

function formatIsoDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function mapProductToCatalogueCsvRow(product: Product): CatalogueCsvRow {
  const categories = product.categories?.length ? product.categories : [product.category];

  return {
    product_id: product.id,
    slug: product.slug,
    vendor_id: product.vendorId || '',
    vendor_name: product.vendorName || '',
    title: product.name,
    description: product.description,
    price: formatPrice(product.price),
    currency: CATALOGUE_CSV_CURRENCY,
    categories: listValue(categories),
    tags: listValue(product.tags || []),
    image_urls: listValue(product.imageUrls || []),
    is_active: formatBoolean((product.status ?? 'active') === 'active'),
    is_featured: formatBoolean(Boolean(product.featured)),
    stock_status: product.stockStatus || '',
    delivery_notes: product.preparationDays !== undefined ? `${product.preparationDays} preparation day${product.preparationDays === 1 ? '' : 's'}` : '',
    updated_at: formatIsoDate(product.updatedAt)
  };
}

export function escapeCsvField(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function catalogueCsvRowsToCsv(rows: CatalogueCsvRow[]) {
  const lines = [
    catalogueCsvColumns.join(CATALOGUE_CSV_DELIMITER),
    ...rows.map((row) => catalogueCsvColumns.map((column) => escapeCsvField(row[column])).join(CATALOGUE_CSV_DELIMITER))
  ];

  return `${lines.join('\r\n')}\r\n`;
}

export function productsToCatalogueCsv(products: Product[]) {
  return catalogueCsvRowsToCsv(products.map(mapProductToCatalogueCsvRow));
}
