import 'server-only';

import type { CurrentUserWithRoles } from '@/lib/current-user';
import type { OrderRequest, Product, Vendor } from '@/lib/types';
import { getVendorAssignmentsForUser } from '@/lib/roles-repo';

export type AdminAccessContext =
  | { mode: 'super-admin' | 'admin-token'; current: CurrentUserWithRoles | null; assignedVendorIds: string[] }
  | { mode: 'vendor-admin'; current: CurrentUserWithRoles; assignedVendorIds: string[] };

export function hasActiveRole(user: CurrentUserWithRoles | null | undefined, role: string) {
  return Boolean(user?.roles.some((assignment) => assignment.role === role && assignment.status === 'active'));
}

export async function getAssignedVendorIdsForUser(userId: string) {
  const assignments = await getVendorAssignmentsForUser(userId);
  return [...new Set(assignments.filter((a) => a.status === 'active').map((a) => a.vendorId))];
}

export function isSuperAdminContext(access: AdminAccessContext) {
  return access.mode === 'super-admin' || access.mode === 'admin-token';
}

export function canManageVendor(access: AdminAccessContext, vendorId?: string) {
  if (isSuperAdminContext(access)) return true;
  return Boolean(vendorId && access.assignedVendorIds.includes(vendorId));
}

export function canManageProduct(access: AdminAccessContext, product: Pick<Product, 'vendorId'>) {
  return canManageVendor(access, product.vendorId);
}

export function canViewOrderForVendor(access: AdminAccessContext, order: OrderRequest) {
  if (isSuperAdminContext(access)) return true;
  return (order.items || []).some((item) => item.vendorId && access.assignedVendorIds.includes(item.vendorId));
}

export function filterProductsForAdmin(access: AdminAccessContext, products: Product[]) {
  if (isSuperAdminContext(access)) return products;
  return products.filter((product) => canManageProduct(access, product));
}

export function filterVendorsForAdmin(access: AdminAccessContext, vendors: Vendor[]) {
  if (isSuperAdminContext(access)) return vendors;
  return vendors.filter((vendor) => canManageVendor(access, vendor.id));
}

export function filterOrdersForAdmin(access: AdminAccessContext, orders: OrderRequest[]) {
  if (isSuperAdminContext(access)) return orders;
  return orders.filter((order) => canViewOrderForVendor(access, order)).map((order) => sanitizeOrderForVendorAdmin(access, order));
}

export function sanitizeOrderForVendorAdmin(access: AdminAccessContext, order: OrderRequest): OrderRequest {
  if (isSuperAdminContext(access)) return order;
  const items = (order.items || []).filter((item) => item.vendorId && access.assignedVendorIds.includes(item.vendorId));
  const vendorSubtotal = items.reduce((sum, item) => sum + (item.lineTotal ?? (item.unitPrice ?? 0) * item.quantity), 0);
  return {
    id: order.id,
    recipientName: order.recipientName,
    recipientPhone: order.recipientPhone,
    deliveryDate: order.deliveryDate,
    region: order.region,
    cityId: order.cityId,
    deliveryLatitude: order.deliveryLatitude,
    deliveryLongitude: order.deliveryLongitude,
    deliveryPinUrl: order.deliveryPinUrl,
    email: '',
    note: order.note,
    items,
    totalAmount: vendorSubtotal,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}
