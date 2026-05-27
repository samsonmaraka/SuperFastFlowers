export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type VendorStatus = 'active' | 'inactive';

export type Vendor = {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  location: string;
  notes?: string;
  status: VendorStatus;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  categories?: string[];
  tags: string[];
  imageUrls: string[];
  stockStatus: StockStatus;
  featured: boolean;
  vendorId?: string;
  vendorName?: string;
  vendorContactPerson?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  vendorLocation?: string;
  vendorContactName1?: string;
  vendorContact1?: string;
  vendorContactName2?: string;
  vendorContact2?: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderStatus = 'new' | 'processing' | 'completed' | 'cancelled' | 'reviewed';

export type OrderRequest = {
  id: string;
  recipientName: string;
  recipientPhone: string;
  deliveryDate: string;
  region: 'Kampala Region' | 'Entebbe area';
  cityId: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryPinUrl?: string;
  email: string;
  note?: string;
  items?: Array<{
    productId: string;
    quantity: number;
    name?: string;
    unitPrice?: number;
    lineTotal?: number;
  }>;
  totalAmount?: number;
  status: OrderStatus;
  createdAt: string;
};
