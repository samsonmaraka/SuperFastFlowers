# Auth/Admin Phase 5: Friendly role-aware admin portal

Phase 5 refactors the admin UI from a single tabbed page into a dedicated admin portal with protected layouts, separate route pages, role-aware navigation, helpful empty states, and clearer SUPER_ADMIN versus VENDOR_ADMIN workflows.

## New admin routes

- `/admin` redirects to `/admin/dashboard`.
- `/admin/dashboard` shows role-scoped metrics and recent orders.
- `/admin/orders` shows order management.
- `/admin/products` shows product creation/editing and filters.
- `/admin/vendors` is global vendor management for SUPER_ADMIN and a vendor profile page for VENDOR_ADMIN.
- `/admin/users` is SUPER_ADMIN-only user listing/search.
- `/admin/roles` is SUPER_ADMIN-only role/admin management.
- `/admin/vendor-assignments` is SUPER_ADMIN-only vendor assignment management.
- `/admin/settings` is SUPER_ADMIN-only safe diagnostics.

## SUPER_ADMIN UI

SUPER_ADMIN users see the full admin navigation: dashboard, orders, products, vendors, users, roles, vendor assignments, and settings. They can view all orders, products, vendors, users, and assignments according to existing backend policies.

## VENDOR_ADMIN UI

VENDOR_ADMIN users see only dashboard, orders, products, and vendor profile. The portal shows an assigned-vendor indicator and all server data is still filtered through the existing vendor permission helpers. Vendor admins can only see assigned vendor products, assigned vendor order line items, and assigned vendor profiles.

Hidden and server-restricted from VENDOR_ADMIN:

- Users
- Roles/admin management
- Vendor assignments
- Settings/diagnostics
- Environment check and Pesapal test/auth tools

## Vendor assignments

Use `/admin/vendor-assignments` as SUPER_ADMIN. Select a user that already has the active `VENDOR_ADMIN` role, select a vendor, and assign. The API returns a helpful error if the user does not have the VENDOR_ADMIN role. Current assignments show vendor names and can be removed.

## Managing products

Products are managed at `/admin/products`. SUPER_ADMIN can choose any active vendor and can set featured status. VENDOR_ADMIN can choose only assigned active vendors; if there is one assigned vendor, it is selected automatically. The form includes required-field guidance, UGX price context, image preview, categories, active/inactive status, and preparation-days helper text.

## Managing orders

Orders are managed at `/admin/orders`. SUPER_ADMIN sees all order details and can update the global order status. VENDOR_ADMIN sees only assigned vendor order line items and can update vendor fulfillment status for those line items. The UI labels global order status separately from vendor fulfillment status.

## Settings / diagnostics

`/admin/settings` shows safe yes/no indicators only: DynamoDB, orders table, SES sender, Pesapal base URL, Google auth, and ADMIN_TOKEN fallback presence. It does not show secret values, raw environment values, credentials, or tokens.

## Security preservation

The UI uses server-protected admin layout and page-level checks. Admin APIs continue to enforce permissions server-side:

- Products: SUPER_ADMIN all products; VENDOR_ADMIN assigned vendor products only.
- Vendors: SUPER_ADMIN global management; VENDOR_ADMIN safe profile fields for assigned vendors only.
- Orders: SUPER_ADMIN global status; VENDOR_ADMIN assigned line-item fulfillment only.
- Users, roles, vendor assignments, settings/diagnostics: SUPER_ADMIN only.
- Existing ADMIN_TOKEN emergency fallback is retained for protected admin APIs that already support it and is documented as emergency SUPER_ADMIN-equivalent API access.

## Known limitations

- Dashboard counts are simple repository-list counts and may use scans depending on configured repository backends.
- Recent audit actions are not displayed yet; audit logging remains available where existing APIs write it.
- Date-range order filtering is not included yet; search/status/vendor filters are included.

## Recommended future improvements

- Add paginated server-side tables for very large order/product/vendor datasets.
- Add audit-log route and recent audit card.
- Add route-level friendly forbidden pages instead of default server error boundaries for direct VENDOR_ADMIN access to SUPER_ADMIN-only pages.
- Add date-range filters backed by order indexes.
