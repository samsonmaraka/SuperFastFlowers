import type { Product } from '@/lib/types';

export const DEFAULT_PREPARATION_DAYS = 2;

export function getProductPreparationDays(product?: Pick<Product, 'preparationDays'> | null) {
  return typeof product?.preparationDays === 'number' && Number.isFinite(product.preparationDays)
    ? product.preparationDays
    : DEFAULT_PREPARATION_DAYS;
}

export function getRequiredPreparationDays(items: Array<{ productId: string }>, products: Product[]) {
  return Math.max(
    DEFAULT_PREPARATION_DAYS,
    ...items.map((item) => getProductPreparationDays(products.find((product) => product.id === item.productId)))
  );
}

export function getDateOnlyAtUtcMidnight(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getMinimumDeliveryDate(preparationDays: number, now = new Date()) {
  const min = new Date(now);
  min.setUTCDate(min.getUTCDate() + preparationDays);
  min.setUTCHours(0, 0, 0, 0);
  return min;
}
