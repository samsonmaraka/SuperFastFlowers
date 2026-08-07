# Cupcake Flavours — Architecture Design

Design proposal only. No behaviour in this document has been implemented yet.

## The problem in one sentence

A cupcake product is not one sellable thing — it is a product plus a customer choice, and the
current catalogue has no concept of a customer choice anywhere between the product page and the
baker's email.

## Available flavours

`vanilla`, `coconut`, `strawberry`, `lemon`, `chocolate`, `mocha`, `red-velvet`, `blueberry`,
`bubble-gum`, `banana`, `orange`, `mint-chocolate`.

## Recommended design

Three pieces, in dependency order.

### 1. A flavour registry (static, typed, closed)

A new `lib/flavours.ts` in the same shape as the existing `lib/categories.ts` and
`lib/delivery-areas.ts`: an exported const array, a lookup by slug, a slug normaliser.

```ts
export type FlavourId =
  | 'vanilla' | 'coconut' | 'strawberry' | 'lemon'
  | 'chocolate' | 'mocha' | 'red-velvet' | 'blueberry'
  | 'bubble-gum' | 'banana' | 'orange' | 'mint-chocolate';

export type Flavour = {
  id: FlavourId;
  label: string;        // 'Mint Chocolate'
  rank: number;         // display order, same convention as giftCategories
  swatch: string;       // hex, for the picker chips
  status: 'active' | 'inactive';
  notes?: string;       // allergen / description text for the product page
};
```

Static rather than a DynamoDB entity because the list is small, stable, and wanted at build time
for filters and SEO. It also makes `FlavourId` a real union type, so every downstream consumer is
checked by the compiler instead of by hope. If admins later need to add flavours without a deploy,
promote it to a repo using the existing `lib/addons-repo.ts` pattern — the shape above is already
the record shape, so that promotion is additive.

### 2. A per-product flavour policy (the part that makes this elegant)

The interesting variation is not the flavour list, it is *how many* choices a product takes. One
cupcake takes one. A box of six takes six. A "baker's choice" box takes none. All three are the
same product type and should not be three code paths.

```ts
export type ProductFlavourPolicy = {
  mode: 'single' | 'multi';
  picks: number;              // flavour slots per unit: 1 for a single, 6 for a box of six
  allowed: FlavourId[];       // empty = every active flavour
  allowDuplicates: boolean;   // true = "six of the same" is legal; false = must be six different
  defaults?: FlavourId[];     // pre-selected, so the picker is never an empty required field
};
```

and on `Product`:

```ts
flavours?: ProductFlavourPolicy;   // absent === not flavoured
```

Optional and absent-by-default is deliberate: every existing flower, hamper and gift basket stays
byte-identical in DynamoDB, and no migration or backfill job is needed.

### 3. Flavour-aware cart line identity (the one true architectural change)

This is the change that everything else depends on, and the only one that touches existing
working code rather than adding to it.

Today a cart line **is** a product. `components/add-to-cart-button.tsx:44`,
`components/cart-client.tsx:49`, `components/cart-client.tsx:56`,
`components/gift-addons.tsx:14` and `components/gift-addons.tsx:37` all locate a line with
`item.productId === x`. Under that assumption, "six vanilla and six chocolate from the same box
product" is unrepresentable — the second add collapses into the first.

So the line key stops being the product id and becomes a derived line id:

```ts
export type CartItem = {
  lineId: string;          // productId, or `${productId}#${flavourSignature}`
  productId: string;
  flavours?: FlavourId[];  // length === policy.picks
  // ...unchanged fields
};

export function buildCartLineId(productId: string, flavours?: FlavourId[]) {
  if (!flavours?.length) return productId;
  const signature = [...flavours].sort().join('+');
  return `${productId}#${signature}`;
}
```

Sorting the signature means `{vanilla, chocolate}` and `{chocolate, vanilla}` are the same line and
merge their quantities, which is what a customer expects.

Non-flavoured products and add-ons get `lineId === productId`, so their behaviour is unchanged by
construction. Every `find`/`filter`/`map` in the five call sites above switches from `productId` to
`lineId`.

Migration of live carts is free: `isCartItem` in `lib/cart-storage.ts:20` already sanitises on read,
so a stored pre-flavour cart is backfilled with `lineId = productId` on the next read, and flavour
ids that are no longer in the registry are dropped there rather than reaching checkout. Nobody
loses a cart.

## Server-side revalidation

`app/api/orders/route.ts:128-143` already refuses to trust the client — it reloads each product and
recomputes name, price and vendor. Flavour must join that discipline, not bypass it. In the same
loop:

- reject if `item.flavours` is present but the product has no policy;
- reject if the count does not equal `policy.picks`;
- reject if any id is outside `policy.allowed` or inactive in the registry;
- reject duplicates when `allowDuplicates` is false;

with the same error style as the existing `Product ${id} is no longer available.` responses.

The resolved result is then **snapshotted onto the order line**, the way
`applyVendorSnapshot` (`lib/products-repo.ts:102`) already snapshots vendor details:

```ts
export type OrderItem = {
  // ...unchanged
  flavours?: Array<{ id: string; label: string; quantity: number }>;
};
```

Storing the label alongside the id means an order reprinted next year still reads "Red Velvet" even
if the registry is renamed, and the `quantity` roll-up is what the baker actually wants to read
("4 × vanilla, 2 × mocha") rather than a twelve-item list.

## Full list of touch points

| Area | File | Change |
| --- | --- | --- |
| Registry | `lib/flavours.ts` | New. The 12 flavours, lookup, normaliser. |
| Types | `lib/types.ts` | `ProductFlavourPolicy`; `Product.flavours?`; `OrderItem.flavours?`. |
| Cart | `lib/cart-storage.ts` | `lineId` + `flavours` on `CartItem`, validated in `isCartItem`, backfilled on read. |
| Cart writes | `components/add-to-cart-button.tsx` | Key on `lineId`; accept a selection from the picker. |
| Cart writes | `components/gift-addons.tsx` | Key on `lineId` (no behaviour change — add-ons have no flavour). |
| Cart UI | `components/cart-client.tsx` | Key on `lineId`; render the flavour line under the name, next to the existing add-on badge at line 71. |
| Checkout | `components/checkout-client.tsx` | Key on `lineId`; send `flavours` in the payload; render in the summary at line 234. |
| Picker | `components/flavour-picker.tsx` | New client component. Chips for `picks === 1`, a stepper grid summing to `picks` for a box. |
| Product page | `app/shop/[slug]/page.tsx` | Render the picker above `AddToCartButton` when `product.flavours` exists. |
| Validation | `lib/validators.ts` | `productSchema.flavours` policy object; `orderSchema.items[].flavours` optional string array. |
| Order API | `app/api/orders/route.ts` | Revalidate against the policy; snapshot ids + labels onto the line. |
| Baker email | `lib/send-order-email.ts` | Flavour breakdown per line (lines 55 and 132). This is the path the vendor actually reads. |
| Admin order view | `components/admin/order-detail-drawer.tsx` | Show the breakdown. |
| Order PDF | `components/download-order-pdf-button.tsx` | Show the breakdown. |
| Admin editor | `components/admin-products-client.tsx` | Flavour block in the item form: mode, picks, allowed checkboxes, duplicates toggle. |
| CSV | `lib/catalogue-csv-schema.ts` | Additive columns `flavour_mode`, `flavour_picks`, `flavours` using the existing `\|` list separator. |
| SEO | `lib/seo.tsx` | List flavours in the product JSON-LD. One canonical URL per product — see below. |
| Shop filter | `lib/products-repo.ts` | Optional `flavour` filter reading `product.flavours.allowed`. |

## Things this design deliberately protects

**Delivery fee does not change.** `countOrderVendors` (`lib/delivery-fee.ts:10`) counts a `Set` of
vendor ids, not lines. Splitting one box product into a vanilla line and a chocolate line keeps one
vendor id, so the customer is still charged one UGX 5,000 fee. Worth a regression test, because
"splitting a line doubled my delivery fee" is the obvious way to get this wrong.

**Preparation days do not change.** `getRequiredPreparationDays` (`lib/preparation-days.ts:11`)
resolves by `productId`, which flavour does not affect.

**Slugs and canonical URLs do not change.** One product, one slug, one canonical URL. The
`legacySlugs` machinery, the `SLUG#` GSI and the `permanentRedirect` in
`app/shop/[slug]/page.tsx:68` are all untouched, because no flavour ever mints a URL.

## Three designs rejected, and why

**Flavour as a tag.** Zero schema change, and tempting. But `filterProducts`
(`lib/products-repo.ts:168`) folds `tags` into category matching, so a `chocolate` tag would start
matching category queries and quietly pollute the occasion taxonomy. It is also unenforceable —
nothing stops a customer ordering a flavour the baker does not make, because tags are free text and
the order API has nothing to validate against.

**Flavour as a separate product.** Twelve products per cupcake, twelve slugs, twelve image
uploads, twelve rows in every admin list, near-duplicate descriptions competing for the same search
terms, and `getRelatedProducts` (`app/shop/[slug]/page.tsx:46`) returning three colours of the same
cupcake as "You may also like". The catalogue becomes unmaintainable at roughly the third product.

**Flavour as an add-on.** The `Addon` entity already exists and is close in shape, so this looks
like reuse. It is not: add-ons are separately priced things that ride along with a gift, are
explicitly excluded from vendor delivery-fee counting and from preparation-day maths, and carry no
vendor. A flavour is an attribute of the gift itself, and modelling it as an add-on would put
"vanilla" on the invoice as a line item with its own price.

## Suggested phasing

**Phase 1 — the spine.** Registry, types, policy, `lineId` cart migration, picker on the product
page, server revalidation, flavour on the baker email and admin order view. No pricing change, no
new admin editing UI — seed the first few cupcake products' policies directly.

**Phase 2 — administration.** Flavour block in the admin item form, CSV columns, so the catalogue
team owns flavours without a deploy.

**Phase 3 — merchandising.** `?flavour=` filter on the shop, flavours in JSON-LD, optional
per-flavour surcharge (a `surcharges?: Partial<Record<FlavourId, number>>` on the policy, applied in
the server re-price loop — the only correct place for it), optional per-flavour availability so a
baker can mark `bubble-gum` out of stock without pulling the product.

Phase 1 is the only phase with an irreversible decision in it. Phases 2 and 3 are additive.
