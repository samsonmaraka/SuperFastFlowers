import { Product } from '@/lib/types';

export const seedProducts: Product[] = [
  {
    id: 'p001',
    name: 'Luxury Tea & Truffle Box',
    slug: 'luxury-tea-truffle-box',
    description: 'Handpicked teas paired with artisan truffles in a keepsake box.',
    price: 59,
    category: 'Gourmet',
    tags: ['tea', 'chocolate', 'premium'],
    categories: ['gift-baskets-food', 'occasions'],
    imageUrls: ['https://images.unsplash.com/photo-1559620192-032c4bc4674e?w=1200&q=80'],
    stockStatus: 'in_stock',
    featured: true,
    createdAt: '2026-01-05T10:00:00.000Z',
    updatedAt: '2026-01-05T10:00:00.000Z'
  },
  {
    id: 'p002',
    name: 'Celebration Bloom Vase',
    slug: 'celebration-bloom-vase',
    description: 'Elegant preserved floral arrangement in a ceramic vase.',
    price: 79,
    category: 'Home & Decor',
    tags: ['flowers', 'home', 'anniversary'],
    categories: ['flowers', 'mothers-day', 'birthday'],
    imageUrls: ['https://images.unsplash.com/photo-1463320726281-696a485928c7?w=1200&q=80'],
    stockStatus: 'low_stock',
    featured: true,
    createdAt: '2026-01-05T10:00:00.000Z',
    updatedAt: '2026-01-05T10:00:00.000Z'
  },
  {
    id: 'p003',
    name: 'Calm Evening Gift Set',
    slug: 'calm-evening-gift-set',
    description: 'Soy candle, lavender mist, and silk eye mask for a relaxing night.',
    price: 49,
    category: 'Wellness',
    tags: ['self-care', 'spa', 'relax'],
    categories: ['get-well', 'occasions'],
    imageUrls: ['https://images.unsplash.com/photo-1602874801006-8f3a655f0f84?w=1200&q=80'],
    stockStatus: 'in_stock',
    featured: false,
    createdAt: '2026-01-05T10:00:00.000Z',
    updatedAt: '2026-01-05T10:00:00.000Z'
  }
];
