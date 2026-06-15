# Auth/Admin Phase 1

## What was added

- Shared auth/admin domain types for future signed-in users, role assignments, vendor-admin assignments, vendor permissions, and audit log entries.
- Repository helpers for users, roles, vendor-admin assignments, permission checks, and audit writes.
- Order creation now rebuilds saved order line items from server-side product data instead of trusting names, prices, totals, or vendor ownership sent by the client.

## What was intentionally not added yet

- No Google sign-in, OAuth, Auth.js, or NextAuth integration.
- No replacement of the existing `ADMIN_TOKEN` admin journey.
- No visible customer checkout changes.
- No visible admin UI redesign.
- No active vendor-admin authorization enforcement.
- No forced migration of historical orders.

## New types

- `UserRole`: `USER`, `VENDOR_ADMIN`, `SUPER_ADMIN`.
- `AppUser`: the future signed-in user profile, including normalized email, optional Google subject, status, and timestamps.
- `UserRoleAssignment`: role grant/revocation record for a user.
- `VendorAdminAssignment`: vendor-level assignment with permissions for future vendor admins.
- `AuditLogEntry`: append-only audit event shape for future admin/security actions.
- `OrderItem`: extended with optional vendor ownership fields and vendor fulfillment status for old-order compatibility.

## New DynamoDB record shapes

The Phase 1 helpers use the existing main DynamoDB table when configured and in-memory fallback otherwise:

- User profile: `pk = USER#{userId}`, `sk = PROFILE`, `entityType = USER`, `gsi1pk = USER_EMAIL#{emailNormalized}`.
- User role: `pk = USER#{userId}`, `sk = ROLE#{role}`, `entityType = USER_ROLE`.
- Vendor assignment: `pk = USER#{userId}`, `sk = VENDOR#{vendorId}`, `entityType = VENDOR_ADMIN_ASSIGNMENT`.
- Audit log: `pk = AUDIT#{auditId}`, `sk = createdAt`, `entityType = AUDIT_LOG`.

## Order vendor ownership

During order creation, each submitted cart line is treated only as a product identifier and quantity. The API reloads each product from the product repository, then saves the line using the product's current canonical values:

- `productId`
- `vendorId`
- `vendorName`
- `quantity`
- `name`
- `unitPrice`
- `lineTotal`
- `vendorFulfillmentStatus`

This means future vendor-admin order views can filter or authorize by `vendorId` on each order item.

## How this prepares for Google sign-in and vendor permissions

The new user, role, assignment, permission, and audit helpers provide a typed persistence layer that future Google sign-in can call after verifying an identity. Users can default to normal `USER`, then a future `SUPER_ADMIN` flow can grant roles and vendor assignments. The permission helpers can later gate admin routes without changing the customer shopping path.

## Risks and migration notes

- Historical orders may not include `vendorId`, `vendorName`, or `vendorFulfillmentStatus` on their items. Phase 1 keeps those fields optional in TypeScript so existing success pages, emails, PDF/admin views, and historical records can continue working.
- Product price and vendor snapshots are now taken at order creation time. If a product is edited after checkout, the order keeps the values captured when it was created.
- The new auth/admin repository helpers are not wired into live login or admin access yet, so they should not affect current behavior.
