import type { OrderRequest, Product } from '@/lib/types';

export const DELIVERY_RATE_PER_KM = 1000;
export const ROAD_DISTANCE_MULTIPLIER = 1.5;
export const DELIVERY_FEE_ROUNDING_INCREMENT = 500;

export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function roundDeliveryFee(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.ceil(amount / DELIVERY_FEE_ROUNDING_INCREMENT) * DELIVERY_FEE_ROUNDING_INCREMENT;
}

export function calculateOrderDeliveryFee(order: Pick<OrderRequest, 'deliveryLatitude' | 'deliveryLongitude' | 'items'>, products: Product[]) {
  if (typeof order.deliveryLatitude !== 'number' || typeof order.deliveryLongitude !== 'number') return null;

  let maxDistanceKm = 0;
  for (const item of order.items || []) {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product || typeof product.vendorLatitude !== 'number' || typeof product.vendorLongitude !== 'number') continue;
    const distanceKm = haversineDistanceKm(order.deliveryLatitude, order.deliveryLongitude, product.vendorLatitude, product.vendorLongitude);
    if (distanceKm > maxDistanceKm) maxDistanceKm = distanceKm;
  }

  if (maxDistanceKm <= 0) return null;
  return roundDeliveryFee(maxDistanceKm * ROAD_DISTANCE_MULTIPLIER * DELIVERY_RATE_PER_KM);
}
