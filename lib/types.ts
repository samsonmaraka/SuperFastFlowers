import type { AppUser, AuditLogEntry, UserRole, UserRoleAssignment, VendorAdminAssignment } from '@/lib/auth-types';

export type { AppUser, AuditLogEntry, UserRole, UserRoleAssignment, VendorAdminAssignment };

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type VendorStatus = 'active' | 'inactive';

export type ProductStatus = 'active' | 'inactive';

export type Vendor = {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  location: string;
  vendorLatitude?: number;
  vendorLongitude?: number;
  notes?: string;
  status: VendorStatus;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  legacySlugs?: string[];
  description: string;
  price: number;
  category: string;
  categories?: string[];
  tags: string[];
  imageUrls: string[];
  stockStatus: StockStatus;
  featured: boolean;
  status: ProductStatus;
  vendorId?: string;
  vendorName?: string;
  vendorContactPerson?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  vendorLocation?: string;
  vendorLatitude?: number;
  vendorLongitude?: number;
  vendorContactName1?: string;
  vendorContact1?: string;
  vendorContactName2?: string;
  vendorContact2?: string;
  preparationDays?: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderStatus =
  | 'new'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'reviewed'
  | 'PENDING_PAYMENT'
  | 'PAYMENT_INIT_FAILED'
  | 'PAID'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REVERSED'
  | 'PAYMENT_INVALID'
  | 'PAYMENT_PENDING';

export type VendorFulfillmentStatus = 'new' | 'accepted' | 'preparing' | 'ready' | 'out_for_delivery' | 'fulfilled' | 'cancelled' | 'pending' | 'processing';

export type OrderItem = {
  productId: string;
  vendorId?: string;
  vendorName?: string;
  quantity: number;
  name?: string;
  unitPrice?: number;
  lineTotal?: number;
  vendorFulfillmentStatus?: VendorFulfillmentStatus;
};

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
  items?: OrderItem[];
  totalAmount?: number;
  deliveryFee?: number;
  totalWithDelivery?: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
  pesapal?: PesapalOrderPayment;
};


export type PesapalOrderPayment = {
  orderTrackingId?: string;
  merchantReference?: string;
  redirectUrl?: string;
  status?: string;
  statusCode?: number;
  paymentMethod?: string;
  confirmationCode?: string;
  paymentAccount?: string;
  amount?: number;
  currency?: string;
  rawResponse?: unknown;
  updatedAt?: string;
};
