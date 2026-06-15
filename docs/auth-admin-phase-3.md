# Auth/Admin Phase 3: Google-authenticated SUPER_ADMIN access

## What changed

Phase 3 replaces shared-token-only admin access with role-aware access for Google-authenticated users. Every signed-in Google user remains a normal `USER` by default. Users with an active `SUPER_ADMIN` role can access `/admin`, admin APIs, product/vendor/order management, and the minimal role-management UI.

`VENDOR_ADMIN` role records can be granted and revoked, but they do **not** unlock backend access yet unless that user is also a `SUPER_ADMIN`.

## Intentionally deferred

- Phase 4: vendor-level scoped permissions and vendor filtering.
- Phase 5: full admin UI redesign.
- Customer sign-in requirements for browsing, cart, or checkout. Guest checkout remains supported.

## Bootstrap first SUPER_ADMIN

Set `BOOTSTRAP_SUPER_ADMIN_EMAILS` to one or more comma-separated Google emails:

```env
BOOTSTRAP_SUPER_ADMIN_EMAILS=owner@example.com,ops@example.com
```

Emails are trimmed and lowercased before comparison. When a signed-in user's normalized email is listed, the app idempotently ensures an active `SUPER_ADMIN` role exists and writes one audit log entry when it creates the role. Existing roles are not duplicated and do not produce repeated bootstrap audit logs.

Bootstrap runs during Google sign-in and again when the server loads the current user with roles, so an already-signed-in user can become `SUPER_ADMIN` after the env var is added and the app is redeployed.

## Amplify configuration

Add this environment variable in Amplify alongside the existing auth/admin values:

- `BOOTSTRAP_SUPER_ADMIN_EMAILS`
- keep `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_URL`, `NEXTAUTH_URL`, and `ADMIN_TOKEN`

`amplify.yml` now includes `BOOTSTRAP_SUPER_ADMIN_EMAILS` in the generated `.env.production` envNames list.

## Temporary ADMIN_TOKEN fallback

Admin APIs still accept the existing `x-admin-token` header matching `ADMIN_TOKEN` as a temporary emergency fallback so the site owner is not locked out during migration. Google `SUPER_ADMIN` access is the preferred path. The fallback is documented in code as temporary and should be removed after Phase 3 is verified in production.

## Testing first SUPER_ADMIN

1. Configure `BOOTSTRAP_SUPER_ADMIN_EMAILS` with your Google email.
2. Redeploy.
3. Sign in with Google.
4. Visit `/admin`.
5. Confirm a `SUPER_ADMIN` role exists and an audit entry was written for the bootstrap grant.

## Promoting another user

1. Ask the user to sign in with Google once so their app user profile exists.
2. Sign in as a `SUPER_ADMIN`.
3. Open `/admin` and use the Users tab.
4. Search/list users.
5. Grant `SUPER_ADMIN` or `VENDOR_ADMIN`.

## Revoking roles

Use the Users tab in `/admin` to revoke active roles. The app prevents a `SUPER_ADMIN` from removing their own last active `SUPER_ADMIN` role unless the request is made through the temporary `ADMIN_TOKEN` fallback.

## Remaining work

Phase 4 should implement vendor assignment UI where needed, vendor-level permissions, and vendor-scoped filtering/enforcement across admin APIs. Phase 5 should redesign the admin UI for production-grade role and vendor management.
