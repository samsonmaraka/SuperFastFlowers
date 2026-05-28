import { z } from 'zod';

const optionalCoordinate = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
}, z.number().finite().optional());

export const vendorSchema = z.object({
  id: z.string().min(2),
  name: z.string().min(2),
  contactPerson: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  location: z.string().min(1),
  vendorLatitude: optionalCoordinate,
  vendorLongitude: optionalCoordinate,
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const productSchema = z.object({
  id: z.string().min(2),
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().min(10),
  price: z.number().min(0),
  category: z.string().min(2),
  tags: z.array(z.string().trim().min(1)).default([]),
  categories: z.array(z.string().trim().min(1)).optional(),
  imageUrls: z.array(z.string().url()).min(1),
  stockStatus: z.enum(['in_stock', 'low_stock', 'out_of_stock']),
  featured: z.boolean(),
  vendorId: z.string().optional(),
  vendorName: z.string().optional(),
  vendorContactPerson: z.string().optional(),
  vendorPhone: z.string().optional(),
  vendorEmail: z.string().optional(),
  vendorLocation: z.string().optional(),
  vendorLatitude: optionalCoordinate,
  vendorLongitude: optionalCoordinate,
  vendorContactName1: z.string().optional(),
  vendorContact1: z.string().optional(),
  vendorContactName2: z.string().optional(),
  vendorContact2: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const orderStatusSchema = z.enum([
  'new',
  'processing',
  'completed',
  'cancelled',
  'reviewed',
  'PENDING_PAYMENT',
  'PAYMENT_INIT_FAILED',
  'PAID',
  'PAYMENT_FAILED',
  'PAYMENT_REVERSED',
  'PAYMENT_INVALID',
  'PAYMENT_PENDING'
]);

function isValidDeliveryDate(value: string) {
  const delivery = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(delivery.getTime())) return false;
  const now = new Date();
  const min = new Date(now);
  min.setUTCDate(min.getUTCDate() + 2);
  min.setUTCHours(0, 0, 0, 0);
  const max = new Date(now);
  max.setUTCDate(max.getUTCDate() + 14);
  max.setUTCHours(23, 59, 59, 999);
  return delivery >= min && delivery <= max;
}
export const orderSchema = z.object({
  recipientName: z.string().min(2),
  recipientPhone: z.string().min(7),
  deliveryDate: z.string().refine(isValidDeliveryDate, 'Delivery date must be between 2 and 14 days from today.'),
  region: z.enum(['Kampala Region', 'Entebbe area']),
  cityId: z.string().min(1),
  deliveryLatitude: optionalCoordinate,
  deliveryLongitude: optionalCoordinate,
  deliveryPinUrl: z.string().trim().optional(),
  email: z.string().email(),
  note: z.string().max(500).optional(),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().min(1), name: z.string().optional(), unitPrice: z.number().min(0).optional(), lineTotal: z.number().min(0).optional() })).min(1),
  totalAmount: z.number().min(0).optional(),
  deliveryFee: z.number().min(0).optional(),
  totalWithDelivery: z.number().min(0).optional()
});
