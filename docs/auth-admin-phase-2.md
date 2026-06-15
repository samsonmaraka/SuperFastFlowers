# Auth/Admin Phase 2: Optional Google Sign-In

## What was added

- Auth.js / NextAuth configuration for the Next.js App Router.
- Google OAuth sign-in and sign-out routes at `/api/auth/*`.
- A friendly account control in the site navigation.
- A basic `/account` page that shows a signed-in user's name, email, and profile image.
- User profile upsert on Google sign-in using the Phase 1 `upsertUserProfile` helper.

## What was intentionally not added yet

- No replacement of the existing `ADMIN_TOKEN` admin flow.
- No role enforcement.
- No Google-auth protection for `/admin` or admin APIs.
- No vendor-admin behavior.
- No admin UI redesign.
- No requirement for customers to sign in before checkout.
- No order history yet.

Roles will be activated in Phase 3 after optional sign-in is verified.

## Required environment variables

```bash
AUTH_SECRET=your_auth_secret_here
AUTH_GOOGLE_ID=your_google_oauth_client_id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your_google_oauth_client_secret
AUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

`AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET` are required for Google sign-in. Set `AUTH_URL` to the deployed site URL for each environment. `NEXTAUTH_URL` is included for compatibility with deployments or tooling that still reference the legacy variable name.

## Google Cloud Console setup

1. Open Google Cloud Console and choose the project for Sendagift.
2. Configure the OAuth consent screen.
3. Create an OAuth client ID for a web application.
4. Add the required authorized redirect URIs.
5. Copy the client ID into `AUTH_GOOGLE_ID`.
6. Copy the client secret into `AUTH_GOOGLE_SECRET`.
7. Store secrets in `.env.local` locally and Amplify environment variables in deployed environments.

## Expected callback URLs

You said Phase 2 will be tested in production rather than on localhost. For production-only testing, register the production callback first and make sure the deployed environment variables use the production host. The local URL is included only for future developer convenience.

- Production: `https://www.sendagift.ug/api/auth/callback/google`
- Amplify test domain, if testing that deployed branch: `https://main.d15cn4uvjtmkv7.amplifyapp.com/api/auth/callback/google`
- Local developer fallback, not required for production testing: `http://localhost:3000/api/auth/callback/google`

## Production-only deployment checklist

1. In Google Cloud Console, add `https://www.sendagift.ug/api/auth/callback/google` to the OAuth client's authorized redirect URIs.
2. In Amplify, set `AUTH_URL=https://www.sendagift.ug`.
3. In Amplify, set `NEXTAUTH_URL=https://www.sendagift.ug` if the deployment still reads the legacy variable.
4. In Amplify, set `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET`.
5. Redeploy the production branch after changing environment variables.
6. Test sign-in from `https://www.sendagift.ug`, not the root/apex domain, so it matches the configured canonical production callback.

## User profile creation

When Google sign-in succeeds, the Auth.js sign-in callback reads the Google profile email, name, image, subject, and email verification flag. Sign-in is rejected if Google does not return an email or subject. The app stores a normal active user profile with:

- `email`
- `emailNormalized`
- `name`
- `image`
- `googleSubject`
- `status`
- `lastLoginAt`
- `createdAt`
- `updatedAt`

Profiles are written through `upsertUserProfile`, so DynamoDB is used when configured and the existing local fallback storage is used otherwise.

## Guest checkout remains unchanged

Google sign-in is optional. Signed-out visitors can still browse products, add gifts to the cart, check out as guests, complete Pesapal payment, and view checkout success pages. Checkout does not require a session.

## ADMIN_TOKEN remains unchanged

The existing admin page and admin APIs still rely on the Phase 1 `ADMIN_TOKEN` behavior. Google sign-in is not used as an admin gate in Phase 2.

## Troubleshooting redirect URI mismatch

If Google shows a redirect URI mismatch error:

1. Copy the exact callback URL from the Google error screen.
2. Add that exact URL to the OAuth client authorized redirect URIs.
3. Confirm `AUTH_URL` or `NEXTAUTH_URL` matches the environment where the app is running.
4. Confirm the browser is using the same host you registered, such as `localhost:3000`, the Amplify test domain, or `www.sendagift.ug`.
5. Redeploy or restart the server after changing environment variables.
