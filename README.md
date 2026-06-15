# Giftora – Serverless Gifts Website (AWS MVP)

Modern ecommerce-style gifts website using **Next.js + Tailwind + DynamoDB (on-demand)** with an AWS-friendly architecture and low idle cost.

## Highlights

- Elegant, mobile-first storefront pages (Home, Shop, Product Details, Cart, Checkout, About, Contact)
- Search + category filtering
- Admin product CRUD API (token-protected)
- DynamoDB on-demand as primary data store
- Seed data and local fallback mode for easy local startup
- Modular checkout flow (payment provider can be plugged in later)

## Tech Stack

- **Frontend**: Next.js 14 App Router
- **Styling**: Tailwind CSS
- **Backend/API**: Next.js Route Handlers (`app/api/*`)
- **Database**: Amazon DynamoDB (on-demand mode)
- **Object storage**: Amazon S3 for product images (URL-based)
- **Deployment**: AWS Amplify Hosting (recommended)

---

## Project Structure

```txt
app/
  api/
    admin/products/route.ts
    orders/route.ts
    products/route.ts
    products/[idOrSlug]/route.ts
  about/page.tsx
  admin/page.tsx
  cart/page.tsx
  checkout/page.tsx
  contact/page.tsx
  shop/page.tsx
  shop/[slug]/page.tsx
  layout.tsx
  page.tsx
components/
  add-to-cart-button.tsx
  admin-products-client.tsx
  cart-client.tsx
  footer.tsx
  navbar.tsx
  product-card.tsx
data/seed-products.ts
lib/
  dynamodb.ts
  env.ts
  orders-repo.ts
  products-repo.ts
  types.ts
  validators.ts
scripts/seed.ts
```

---

## Data Model (DynamoDB)

### 1) `giftora-main` table (on-demand)
Primary key:
- `pk` (partition key, string)
- `sk` (sort key, string)

GSI:
- `gsi1pk` (partition key)
- `gsi1sk` (sort key)

#### Product item shape

```json
{
  "pk": "PRODUCT#p001",
  "sk": "META",
  "entityType": "PRODUCT",
  "gsi1pk": "SLUG#luxury-tea-truffle-box",
  "gsi1sk": "PRODUCT#p001",
  "id": "p001",
  "name": "Luxury Tea & Truffle Box",
  "slug": "luxury-tea-truffle-box",
  "description": "...",
  "price": 59,
  "category": "Gourmet",
  "tags": ["tea", "chocolate"],
  "imageUrls": ["https://..."],
  "stockStatus": "in_stock",
  "featured": true,
  "createdAt": "2026-01-05T10:00:00.000Z",
  "updatedAt": "2026-01-05T10:00:00.000Z"
}
```

### 2) `giftora-orders` table (on-demand)
Primary key:
- `pk` = `ORDER#{id}`
- `sk` = ISO timestamp

Stores checkout/order inquiry requests.

---

## Access Patterns

- List all products: scan where `entityType = PRODUCT` (MVP)
- Get product by ID: `GetItem(pk=PRODUCT#{id}, sk=META)`
- Get product by slug: Query GSI1 with `gsi1pk = SLUG#{slug}`
- Upsert/Delete product: `PutItem` / `DeleteItem` by product primary key
- Create order request: `PutItem` in `giftora-orders`

> Scaling note: For large catalogs, add category/search optimized GSIs and avoid full scan.

---

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env.local
```

3. Run dev server:

```bash
npm run dev
```

If `DYNAMODB_TABLE` is not set, app uses seed data in memory for local MVP browsing.


## Optional Google Sign-In (Auth.js / NextAuth)

Phase 2 adds optional Google sign-in for customer accounts. Phase 3 adds role-aware admin access: Google-authenticated users are normal USER accounts by default, while active SUPER_ADMIN users can access the admin backend. Checkout, shop pages, product pages, and cart pages remain available to guests and normal customers. `ADMIN_TOKEN` remains as a temporary emergency fallback for admin APIs during this migration.

Required environment variables:

- `AUTH_SECRET` (generate with `npx auth secret` or another secure random secret)
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_URL` (for example `http://localhost:3000` locally or `https://www.sendagift.ug` in production)
- `NEXTAUTH_URL` may also be set for deployments that still expect the legacy name
- `BOOTSTRAP_SUPER_ADMIN_EMAILS` comma-separated Google emails that should be idempotently granted SUPER_ADMIN on sign-in or admin role loading

Google OAuth callback URLs to register:

- Production: `https://www.sendagift.ug/api/auth/callback/google`
- Amplify test domain, if you test that deployed branch: `https://main.d15cn4uvjtmkv7.amplifyapp.com/api/auth/callback/google`
- Local developer fallback, not required for production-only testing: `http://localhost:3000/api/auth/callback/google`

For production-only testing, set `AUTH_URL=https://www.sendagift.ug` in Amplify before redeploying.

See `docs/auth-admin-phase-2.md` for the full Phase 2 setup and troubleshooting guide, and `docs/auth-admin-phase-3.md` for SUPER_ADMIN bootstrap, role management, and temporary ADMIN_TOKEN fallback details.

---

## AWS Deployment (Amplify – Recommended)

1. Push repository to GitHub.
2. In AWS Amplify, create a new app and connect repo/branch.
3. Add environment variables in Amplify:
   - `NEXT_PUBLIC_SITE_URL=https://www.sendagift.ug`
   - `AWS_REGION`
   - `DYNAMODB_TABLE`
   - `DYNAMODB_ORDER_TABLE`
   - `ADMIN_TOKEN` (temporary emergency fallback; store the real value only in Amplify, not in committed files)
   - `BOOTSTRAP_SUPER_ADMIN_EMAILS` (comma-separated Google emails, for example `owner@example.com,ops@example.com`)
   - `AUTH_SECRET`
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
   - `AUTH_URL`
   - `NEXTAUTH_URL` (optional legacy compatibility)
   - `PESAPAL_BASE_URL`
   - `PESAPAL_CONSUMER_KEY`
   - `PESAPAL_CONSUMER_SECRET`
   - `PESAPAL_IPN_ID` (set after registering the production IPN URL)
   - `SES_FROM_EMAIL`
4. Ensure Amplify execution role has IAM permissions:
   - `dynamodb:GetItem`
   - `dynamodb:Query`
   - `dynamodb:Scan`
   - `dynamodb:PutItem`
   - `dynamodb:DeleteItem`
5. Deploy.


### Production domain checklist

- Primary website URL: `https://www.sendagift.ug`.
- Root domain `https://sendagift.ug` should redirect to `https://www.sendagift.ug`.
- Register the Pesapal production IPN URL as `https://www.sendagift.ug/api/pesapal/ipn`, then store the returned IPN ID in Amplify as `PESAPAL_IPN_ID`.
- Keep Pesapal keys, Google Maps keys, SES secrets, and admin tokens in Amplify environment variables only.

### Create DynamoDB tables (AWS CLI)

```bash
aws dynamodb create-table \
  --table-name giftora-main \
  --attribute-definitions \
      AttributeName=pk,AttributeType=S \
      AttributeName=sk,AttributeType=S \
      AttributeName=gsi1pk,AttributeType=S \
      AttributeName=gsi1sk,AttributeType=S \
  --key-schema \
      AttributeName=pk,KeyType=HASH \
      AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[{"IndexName":"giftora_main_index","KeySchema":[{"AttributeName":"gsi1pk","KeyType":"HASH"},{"AttributeName":"gsi1sk","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]'

aws dynamodb create-table \
  --table-name giftora-orders \
  --attribute-definitions AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S \
  --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST
```

### Seed products to DynamoDB

```bash
npm run seed
```

---

## S3 Image Setup

1. Create S3 bucket, e.g. `giftora-product-images`.
2. Upload product images (public via CloudFront preferred).
3. Store image URLs in each product `imageUrls` field.
4. Add image domain to `next.config.mjs` if needed.

Recommended production pattern:
- Keep bucket private
- Serve through CloudFront with signed/origin access controls
- Save CloudFront URLs in `imageUrls`

---

## Cost Control Notes (Low Traffic)

- Use DynamoDB **PAY_PER_REQUEST** (on-demand) for no fixed DB instance cost.
- Use Amplify hosting/serverless instead of EC2.
- Keep image sizes optimized and cached at CDN edge.
- Configure CloudWatch log retention to 7–14 days.
- Use S3 lifecycle policies for old/unused assets.
- Add budget alarms in AWS Budgets.

---

## Payments (Modular Future Integration)

The current checkout creates an order request. To add payments later:
- Add `paymentProvider.ts` abstraction in `lib/`
- Add provider adapters (`stripe`, `razorpay`, etc.)
- Replace/extend `/api/orders` with payment intent + webhook flow

---

## Security Notes

- Admin APIs now prefer Google-authenticated `SUPER_ADMIN` access. The legacy `x-admin-token` / `ADMIN_TOKEN` path remains only as a temporary emergency fallback during the Phase 3 migration.
- Validate/sanitize all admin payloads (already basic Zod validation).
- Add rate limiting/WAF in front of production endpoints.

