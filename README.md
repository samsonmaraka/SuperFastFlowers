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

---

## AWS Deployment (Amplify – Recommended)

1. Push repository to GitHub.
2. In AWS Amplify, create a new app and connect repo/branch.
3. Add environment variables in Amplify:
   - `NEXT_PUBLIC_SITE_URL`
   - `AWS_REGION`
   - `DYNAMODB_TABLE`
   - `DYNAMODB_ORDER_TABLE`
   - `ADMIN_TOKEN`
4. Ensure Amplify execution role has IAM permissions:
   - `dynamodb:GetItem`
   - `dynamodb:Query`
   - `dynamodb:Scan`
   - `dynamodb:PutItem`
   - `dynamodb:DeleteItem`
5. Deploy.

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
  --global-secondary-indexes '[{"IndexName":"gsi1","KeySchema":[{"AttributeName":"gsi1pk","KeyType":"HASH"},{"AttributeName":"gsi1sk","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]'

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

- Admin APIs use `x-admin-token` for MVP. Upgrade to Cognito/Amplify Auth for production admin login.
- Validate/sanitize all admin payloads (already basic Zod validation).
- Add rate limiting/WAF in front of production endpoints.

