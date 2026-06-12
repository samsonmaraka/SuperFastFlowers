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

export function getDateInputValue(date: Date) {
  return date.toISOString().split('T')[0];
}

function getOrdinalSuffix(day: number) {
  if (day >= 11 && day <= 13) return 'th';

  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

export function formatDeliveryDateLabel(date: Date | string) {
  const parsedDate = typeof date === 'string' ? new Date(`${date}T00:00:00.000Z`) : date;
  if (Number.isNaN(parsedDate.getTime())) return typeof date === 'string' ? date : '';

  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(parsedDate);
  const month = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(parsedDate);
  const day = parsedDate.getUTCDate();
  const year = parsedDate.getUTCFullYear();

  return `${weekday} ${day}${getOrdinalSuffix(day)} ${month} ${year}`;
}
