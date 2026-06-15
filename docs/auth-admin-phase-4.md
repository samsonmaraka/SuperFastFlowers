# Auth/Admin Phase 4: Vendor-scoped admin permissions

Phase 4 activates vendor-level permissions for `VENDOR_ADMIN` users without redesigning the admin UI.

## Added

- Shared admin access context helpers in `lib/admin-auth.ts` and `lib/vendor-permissions.ts`.
- Super-admin-only vendor assignment API at `/api/admin/vendor-assignments`.
- Minimal vendor assignment tab in the existing admin UI.
- Vendor-scoped products, vendors, and orders API enforcement.
- Vendor fulfillment status updates on assigned order line items.
- Audit logging for vendor assignments and vendor-admin changes.

## Intentionally deferred

- A polished Phase 5 admin redesign.
- Removing the temporary `ADMIN_TOKEN` emergency fallback.
- Customer sign-in requirements. Guest browsing, cart, and checkout remain unchanged.

## Permission behavior

### SUPER_ADMIN

`SUPER_ADMIN` users can access all existing admin functions and manage all products, vendors, orders, users, roles, and vendor assignments.

### VENDOR_ADMIN

`VENDOR_ADMIN` users can access the admin backend but only see assigned vendor data.

They can:

- View and manage products for assigned vendors only.
- Update assigned vendor profile fields: contact person, phone, email, location, coordinates, and notes.
- View only orders containing assigned vendor line items.
- Update only `vendorFulfillmentStatus` for their own line items.

They cannot:

- Manage users or roles.
- Assign vendors to admins.
- Create or delete vendors.
- Change vendor status or ownership/global fields.
- Update global order status, payment status, or Pesapal fields.
- See other vendors' products, vendor records, or order line items.

A vendor admin with no vendor assignment sees: “You have vendor admin access but no vendor has been assigned to your account yet.” API responses are empty scoped lists, not all data.

## Assigning a vendor admin

1. Sign in as `SUPER_ADMIN`.
2. Grant the user the `VENDOR_ADMIN` role from the Users tab.
3. Open the Vendor assignments tab.
4. Select a `VENDOR_ADMIN` user and a vendor.
5. Click assign. Reassigning the same vendor is idempotent and does not create duplicate active assignments.

## Multi-vendor orders

For `VENDOR_ADMIN`, order responses include fulfillment details needed by the vendor: order id, delivery date, recipient name and phone, delivery location/pin fields, and only line items whose `vendorId` is assigned to that admin. `totalAmount` is replaced with the visible vendor subtotal.

## Historical orders without vendor metadata

Orders with items missing `vendorId` are not shown to `VENDOR_ADMIN` because they cannot be safely attributed to a vendor. `SUPER_ADMIN` and `ADMIN_TOKEN` fallback still see full orders.

## ADMIN_TOKEN fallback

The existing `ADMIN_TOKEN` fallback remains temporary emergency access. When a valid `x-admin-token` is supplied to admin APIs, it behaves as `SUPER_ADMIN` and does not require a Google session. This is documented as temporary and should be removed only after Google-auth super-admin access is proven stable.

## Vendor-admin product delete policy

`SUPER_ADMIN` keeps existing hard-delete behavior. `VENDOR_ADMIN` delete requests for assigned products soft-hide the product by setting `status` to `inactive`; vendor admins cannot hard-delete products.

## Manual test checklist

- Signed-out customer can browse and checkout as guest.
- Normal signed-in `USER` cannot access admin APIs/pages.
- `SUPER_ADMIN` can see all products, vendors, and orders.
- `SUPER_ADMIN` can grant `VENDOR_ADMIN` and assign vendors.
- `VENDOR_ADMIN` can access admin with only assigned products/vendors/orders.
- `VENDOR_ADMIN` cannot create products for unassigned vendors or move products to other vendors.
- `VENDOR_ADMIN` cannot create/delete vendors.
- `VENDOR_ADMIN` only sees assigned vendor line items in multi-vendor orders.
- `VENDOR_ADMIN` can update own line-item fulfillment status only.
- `VENDOR_ADMIN` cannot update global order status.
- `VENDOR_ADMIN` cannot access users, roles, or vendor assignment APIs.
- `ADMIN_TOKEN` fallback still works as super-admin emergency API access.
- Audit logs are written for vendor assignment and vendor-admin mutations.

## Phase 5 limitations

The admin UI changes are intentionally minimal. Phase 5 should split pages, improve navigation, add better vendor dashboards, and provide a more polished assignment workflow.
