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

export type ParsedCatalogueCsvRow = {
  line: number;
  values: Partial<CatalogueCsvRow>;
};

export type ParsedCatalogueCsv = {
  rows: ParsedCatalogueCsvRow[];
  errors: string[];
};

function parseCsvText(text: string): string[][] {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === CATALOGUE_CSV_DELIMITER) {
      record.push(field);
      field = '';
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      record.push(field);
      records.push(record);
      field = '';
      record = [];
    } else {
      field += char;
    }
  }

  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  return records.filter((fields) => fields.some((value) => value.trim() !== ''));
}

export function parseCatalogueCsv(text: string): ParsedCatalogueCsv {
  const records = parseCsvText(text.replace(/^\uFEFF/, ''));
  if (records.length === 0) return { rows: [], errors: ['The CSV file is empty.'] };

  const header = records[0].map((column) => column.trim().toLowerCase());
  const columnIndexes = new Map<CatalogueCsvColumn, number>();
  for (const column of catalogueCsvColumns) {
    const index = header.indexOf(column);
    if (index !== -1) columnIndexes.set(column, index);
  }

  if (!columnIndexes.has('product_id') && !columnIndexes.has('title')) {
    return { rows: [], errors: ['Unrecognized CSV header. Expected catalogue columns such as product_id, title, price, categories.'] };
  }

  const rows: ParsedCatalogueCsvRow[] = [];
  for (let i = 1; i < records.length; i += 1) {
    const values: Partial<CatalogueCsvRow> = {};
    for (const [column, index] of columnIndexes) {
      values[column] = (records[i][index] ?? '').trim();
    }
    rows.push({ line: i + 1, values });
  }

  if (rows.length === 0) return { rows, errors: ['The CSV file has a header but no product rows.'] };
  return { rows, errors: [] };
}

export function parseCatalogueListValue(value: string | undefined) {
  if (!value) return [];
  return value.split(CATALOGUE_CSV_LIST_SEPARATOR).map((item) => item.trim()).filter(Boolean);
}

export function parseCatalogueBoolean(value: string | undefined) {
  if (value === undefined || value.trim() === '') return undefined;
  const normalized = value.trim().toLowerCase();
  if (['true', 'yes', '1'].includes(normalized)) return true;
  if (['false', 'no', '0'].includes(normalized)) return false;
  return undefined;
}

export function parseCatalogueStockStatus(value: string | undefined) {
  const normalized = value?.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return normalized === 'in_stock' || normalized === 'low_stock' || normalized === 'out_of_stock' ? normalized : undefined;
}

export function parsePreparationDaysFromDeliveryNotes(value: string | undefined) {
  const match = value?.match(/(\d+)\s*preparation\s*day/i) || value?.trim().match(/^(\d+)$/);
  if (!match) return undefined;
  const days = Number(match[1]);
  return Number.isInteger(days) && days >= 0 && days <= 30 ? days : undefined;
}
