export type UserRole = 'USER' | 'VENDOR_ADMIN' | 'SUPER_ADMIN';

export type AuthRecordStatus = 'active' | 'inactive' | 'revoked';

export type AppUser = {
  userId: string;
  email: string;
  emailNormalized: string;
  name?: string;
  image?: string;
  googleSubject?: string;
  status: AuthRecordStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
};

export type UserRoleAssignment = {
  userId: string;
  role: UserRole;
  status: AuthRecordStatus;
  grantedByUserId?: string;
  grantedAt: string;
  revokedByUserId?: string;
  revokedAt?: string;
};

export type VendorPermission = 'VIEW_ORDERS' | 'MANAGE_ORDERS' | 'MANAGE_PRODUCTS';

export type VendorAdminAssignment = {
  userId: string;
  vendorId: string;
  permissions: VendorPermission[];
  status: AuthRecordStatus;
  assignedByUserId?: string;
  assignedAt: string;
  updatedAt: string;
};

export type AuditLogEntry = {
  auditId: string;
  actorUserId?: string;
  actorEmail?: string;
  action: string;
  targetType: string;
  targetId?: string;
  vendorId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
};
