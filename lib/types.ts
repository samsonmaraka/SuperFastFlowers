export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  imageUrls: string[];
  stockStatus: StockStatus;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrderRequest = {
  id: string;
  recipientName: string;
  recipientPhone: string;
  deliveryDate: string;
  region: 'Kampala Region' | 'Entebbe area';
  cityId: string;
  email: string;
  note?: string;
  items: Array<{ productId: string; quantity: number }>;
  status: 'new' | 'reviewed';
  createdAt: string;
};
