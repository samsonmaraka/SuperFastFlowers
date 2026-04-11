import { z } from 'zod';

export const productSchema = z.object({
  id: z.string().min(2),
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().min(10),
  price: z.number().min(0),
  category: z.string().min(2),
  tags: z.array(z.string()),
  imageUrls: z.array(z.string().url()).min(1),
  stockStatus: z.enum(['in_stock', 'low_stock', 'out_of_stock']),
  featured: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const orderSchema = z.object({
  customerName: z.string().min(2),
  email: z.string().email(),
  note: z.string().max(500).optional(),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().min(1) })).min(1)
});
