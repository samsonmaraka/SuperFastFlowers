import { z } from 'zod';
import { isDataImageUrl, isProductImageStorageKey } from '@/lib/product-images';
import { ADDON_MESSAGE_MAX_LENGTH } from '@/lib/addon-message';
import { FLAVOUR_IDS, type FlavourId } from '@/lib/flavours';
import { getMaximumDeliveryDate } from '@/lib/preparation-days';
import { countGraphemes, CUSTOM_FIELDS_MAX, CUSTOM_FIELD_MAX_LENGTH, CUSTOM_FIELD_NAME_MAX_LENGTH } from '@/lib/customization';

const productImageValue = z.string().refine((value) => {
  if (isDataImageUrl(value) || isProductImageStorageKey(value)) return true;
  return z.string().url().safeParse(value).success;
}, 'Product image must be a hosted URL or an uploaded image.');

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
  email: z.preprocess((value) => (value === '' ? undefined : value), z.string().email().optional()),
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
  imageUrls: z.array(productImageValue).min(1),
  stockStatus: z.enum(['in_stock', 'low_stock', 'out_of_stock']),
  featured: z.boolean(),
  status: z.enum(['active', 'inactive']).default('active'),
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
  preparationDays: z.number().int().min(0).max(30).optional(),
  flavours: z.array(z.enum(FLAVOUR_IDS as [FlavourId, ...FlavourId[]])).optional(),
  customFields: z
    .array(
      z
        .object({
          name: z.string().trim().min(1).max(CUSTOM_FIELD_NAME_MAX_LENGTH),
          maxLength: z.number().int().min(1).max(CUSTOM_FIELD_MAX_LENGTH),
          // Placeholder text shown to the customer, never submitted for them.
          defaultMessage: z.string().optional(),
          required: z.boolean().default(true),
          type: z.enum(['text']).default('text')
        })
        .refine((field) => !field.defaultMessage || countGraphemes(field.defaultMessage) <= field.maxLength, 'Placeholder is longer than its cap.')
    )
    .max(CUSTOM_FIELDS_MAX)
    .refine((fields) => new Set(fields.map((field) => field.name.toLowerCase())).size === fields.length, 'Customisation field names must be unique.')
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const addonSchema = z.object({
  id: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().min(0),
  imageUrl: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z
      .string()
      .refine((value) => {
        if (value.startsWith('/') || isDataImageUrl(value) || isProductImageStorageKey(value)) return true;
        return z.string().url().safeParse(value).success;
      }, 'Add-on image must be a hosted URL, a site path, or an uploaded image.')
      .optional()
  ),
  status: z.enum(['active', 'inactive']).default('active'),
  sortOrder: z.number().int().min(0).optional(),
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
  return delivery <= getMaximumDeliveryDate();
}
export const orderSchema = z.object({
  recipientName: z.string().min(2),
  recipientPhone: z.string().min(7),
  deliveryDate: z.string().refine(isValidDeliveryDate, 'Delivery date must be a valid date within 14 days from today.'),
  region: z.enum(['Kampala Region', 'Entebbe area']),
  cityId: z.string().min(1),
  deliveryLatitude: optionalCoordinate,
  deliveryLongitude: optionalCoordinate,
  deliveryPinUrl: z.string().trim().optional(),
  email: z.string().email(),
  customerPhone: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().regex(/^[0-9]{10}$/, 'Mobile number must be 10 digits, e.g. 0756924285.').optional()
  ),
  note: z.string().max(500).optional(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1), name: z.string().optional(), unitPrice: z.number().min(0).optional(), lineTotal: z.number().min(0).optional(), isAddon: z.boolean().optional(), message: z.string().max(ADDON_MESSAGE_MAX_LENGTH).optional(), customizations: z.array(z.object({ name: z.string().max(CUSTOM_FIELD_NAME_MAX_LENGTH), value: z.string().max(CUSTOM_FIELD_MAX_LENGTH * 8) })).max(CUSTOM_FIELDS_MAX).optional(), flavour: z.enum(FLAVOUR_IDS as [FlavourId, ...FlavourId[]]).optional() })).min(1),
  totalAmount: z.number().min(0).optional(),
  deliveryFee: z.number().min(0).optional(),
  totalWithDelivery: z.number().min(0).optional()
});
