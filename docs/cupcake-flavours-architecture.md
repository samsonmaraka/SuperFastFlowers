# Cupcake Flavours — Architecture Design

Design proposal only. No behaviour in this document has been implemented yet.

## Domain rules this design is built on

- Cupcakes are sold as a box of 12. The box is the product; there is no per-cupcake purchase.
- **A box is a single flavour.** There are no mixed boxes.
- A customer wanting two flavours orders two boxes.

That second rule is what keeps this design small. Because the choice is exactly one value per box,
a flavour is a plain attribute of a cart line, not a configuration sub-document.

## The problem in one sentence

A cupcake box is not one sellable thing — it is a product plus a single customer choice, and the
current catalogue has no concept of a customer choice anywhere between the product page and the
baker's email.

## Available flavours

`vanilla`, `coconut`, `strawberry`, `lemon`, `chocolate`, `mocha`, `red-velvet`, `blueberry`,
`bubble-gum`, `banana`, `orange`, `mint-chocolate`.

## Recommended design

Three pieces, in dependency order.

### 1. A flavour registry (static, typed, closed)

A new `lib/flavours.ts` in the same shape as the existing `lib/categories.ts` and
`lib/delivery-areas.ts`: an exported const array, a lookup by id, a slug normaliser.

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

export const FLAVOUR_IDS: FlavourId[];   // convenience for "this product offers all of them"
```

Static rather than a DynamoDB entity because the list is small, stable, and wanted at build time
for filters and SEO. It also makes `FlavourId` a real union type, so every downstream consumer is
checked by the compiler instead of by hope. If admins later need to add flavours without a deploy,
promote it to a repo using the existing `lib/addons-repo.ts` pattern — the shape above is already
the record shape, so that promotion is additive.

`status: 'inactive'` is the retirement path: a flavour that stops being offered is deactivated,
never deleted, so historical orders still resolve their label.

### 2. One field on `Product`

```ts
flavours?: FlavourId[];   // the flavours this product offers.
                          // absent or empty === this product has no flavour choice
```

That is the entire catalogue change. A product with a non-empty `flavours` array **requires**
exactly one flavour per cart line; a product without one takes none. Most cupcake products will be
seeded as `flavours: FLAVOUR_IDS`, but the array is per-product so a vendor who cannot do
`bubble-gum` simply omits it.

Optional and absent-by-default is deliberate: every existing flower, hamper and gift basket stays
byte-identical in DynamoDB, and no migration or backfill job is needed.

Note what is *not* here: no count, no "picks", no mixed-box rules, no duplicate policy. The box
size is already expressed by the product's name and price, and the one-flavour-per-box rule is a
domain invariant rather than a per-product setting, so neither needs a field.

### 3. Flavour-aware cart line identity (the one true architectural change)

This is the change that everything else depends on, and the only one that touches existing working
code rather than adding to it.

Today a cart line **is** a product. `components/add-to-cart-button.tsx:44`,
`components/cart-client.tsx:49`, `components/cart-client.tsx:56`,
`components/gift-addons.tsx:14` and `components/gift-addons.tsx:37` all locate a line with
`item.productId === x`. Under that assumption, "one vanilla box and one chocolate box" is
unrepresentable — the second add collapses into the first and silently becomes two vanilla boxes.

So the line key stops being the product id and becomes a derived line id:

```ts
export type CartItem = {
  lineId: string;        // productId, or `${productId}#${flavour}`
  productId: string;
  flavour?: FlavourId;
  // ...unchanged fields
};

export function buildCartLineId(productId: string, flavour?: FlavourId) {
  return flavour ? `${productId}#${flavour}` : productId;
}
```

Adding vanilla twice merges into one line of quantity 2 (two vanilla boxes), which is correct.
Adding vanilla then chocolate produces two lines, which is also correct.

Non-flavoured products and add-ons get `lineId === productId`, so their behaviour is unchanged by
construction. Every `find`/`filter`/`map` in the five call sites above switches from `productId` to
`lineId`.

Migration of live carts is free: `isCartItem` in `lib/cart-storage.ts:20` already sanitises on read,
so a stored pre-flavour cart is backfilled with `lineId = productId` on the next read, and a flavour
that is no longer active in the registry is dropped there rather than reaching checkout. Nobody
loses a cart.

Quantity keeps meaning **boxes**, not cupcakes. The cart and checkout line should say so
(`Chocolate · 12 cupcakes`), because "Qty 2" against a cupcake product is otherwise ambiguous.

## Server-side revalidation

`app/api/orders/route.ts:128-143` already refuses to trust the client — it reloads each product and
recomputes name, price and vendor. Flavour must join that discipline, not bypass it. In the same
loop, for each non-add-on line:

- if the product has no `flavours`, reject a line that carries one;
- if the product has `flavours`, reject a line with no flavour (it is required, not optional);
- reject a flavour outside the product's array, or one that is `inactive` in the registry.

Same error style as the existing `Product ${id} is no longer available.` responses.

The resolved result is then **snapshotted onto the order line**, the way `applyVendorSnapshot`
(`lib/products-repo.ts:102`) already snapshots vendor details:

```ts
export type OrderItem = {
  // ...unchanged
  flavourId?: string;
  flavourLabel?: string;   // snapshot, so a reprint next year still reads 'Red Velvet'
};
```

Two flat fields rather than a nested object, matching how `OrderItem` already carries its vendor
snapshot — and DynamoDB is happier with them.

## Full list of touch points

| Area | File | Change |
| --- | --- | --- |
| Registry | `lib/flavours.ts` | New. The 12 flavours, lookup, `FLAVOUR_IDS`. |
| Types | `lib/types.ts` | `FlavourId`; `Product.flavours?`; `OrderItem.flavourId?` / `flavourLabel?`. |
| Cart | `lib/cart-storage.ts` | `lineId` + `flavour` on `CartItem`, validated in `isCartItem`, backfilled on read. |
| Cart writes | `components/add-to-cart-button.tsx` | Key on `lineId`; take the selected flavour; block add until one is chosen. |
| Cart writes | `components/gift-addons.tsx` | Key on `lineId` (no behaviour change — add-ons have no flavour). |
| Cart UI | `components/cart-client.tsx` | Key on `lineId`; show the flavour under the name, beside the existing add-on badge at line 71. |
| Checkout | `components/checkout-client.tsx` | Key on `lineId`; send `flavour` in the payload; show it in the summary at line 234. |
| Picker | `components/flavour-picker.tsx` | New client component. A single-select chip row with radio semantics — 12 chips, one active. |
| Product page | `app/shop/[slug]/page.tsx` | Render the picker above `AddToCartButton` when `product.flavours?.length`. |
| Validation | `lib/validators.ts` | `productSchema.flavours` as an optional enum array; `orderSchema.items[].flavour` optional enum. |
| Order API | `app/api/orders/route.ts` | Revalidate as above; snapshot id + label onto the line. |
| Baker email | `lib/send-order-email.ts` | Flavour beside the line name (lines 55 and 132). This is the path the vendor actually reads. |
| Admin order view | `components/admin/order-detail-drawer.tsx` | Show the flavour. |
| Order PDF | `components/download-order-pdf-button.tsx` | Show the flavour. |
| Admin editor | `components/admin-products-client.tsx` | Flavour checkbox row in the item form, with a "select all" for the common case. |
| CSV | `lib/catalogue-csv-schema.ts` | One additive `flavours` column using the existing `\|` list separator. |
| SEO | `lib/seo.tsx` | List available flavours in the product JSON-LD. One canonical URL per product — see below. |
| Shop filter | `lib/products-repo.ts` | Optional `flavour` filter reading `product.flavours`. |

Eighteen files: thirteen additive, five are the `productId` → `lineId` rekey.

## Things this design deliberately protects

**Delivery fee does not change.** `countOrderVendors` (`lib/delivery-fee.ts:10`) counts a `Set` of
vendor ids, not lines. A vanilla box and a chocolate box from the same bakery are two lines with one
vendor id, so the customer is still charged one UGX 5,000 fee. Worth a regression test, because
"ordering a second flavour doubled my delivery fee" is the obvious way to get this wrong.

**Preparation days do not change.** `getRequiredPreparationDays` (`lib/preparation-days.ts:11`)
resolves by `productId`, which flavour does not affect. Note the knock-on: the same-day eligibility
check at `app/api/orders/route.ts:88-95` requires `giftItems.length === 1 && quantity === 1`, so a
customer ordering two flavours is two lines and loses same-day eligibility. That is arguably correct
(two boxes is more work) but it is a behaviour change and should be a deliberate decision, not a
side effect discovered in production.

**Slugs and canonical URLs do not change.** One product, one slug, one canonical URL. The
`legacySlugs` machinery, the `SLUG#` GSI and the `permanentRedirect` in
`app/shop/[slug]/page.tsx:68` are all untouched, because no flavour ever mints a URL.

## Three designs rejected, and why

**Flavour as a tag.** Zero schema change, and tempting. But `filterProducts`
(`lib/products-repo.ts:168`) folds `tags` into category matching, so a `chocolate` tag would start
matching category queries and quietly pollute the occasion taxonomy. It is also unenforceable —
nothing stops a customer ordering a flavour the baker does not make, because tags are free text and
the order API has nothing to validate against.

**Flavour as a separate product.** Twelve products per cupcake box, twelve slugs, twelve image
uploads, twelve rows in every admin list, near-duplicate descriptions competing for the same search
terms, and `getRelatedProducts` (`app/shop/[slug]/page.tsx:46`) returning three colours of the same
box as "You may also like". The catalogue becomes unmaintainable at roughly the third product.

This one deserves a fair hearing, because one-flavour-per-box makes it *almost* work — a product
genuinely is a single flavour of a single box. It still fails on catalogue weight and on SEO
cannibalisation, and it puts the flavour list in the hands of whoever last copy-pasted a product
rather than in one validated place.

**Flavour as an add-on.** The `Addon` entity already exists and is close in shape, so this looks
like reuse. It is not: add-ons are separately priced things that ride along with a gift, are
explicitly excluded from vendor delivery-fee counting and from preparation-day maths, and carry no
vendor. A flavour is an attribute of the gift itself, and modelling it as an add-on would put
"vanilla" on the invoice as a line item with its own price.

## Suggested phasing

**Phase 1 — the spine.** Registry, `Product.flavours`, `lineId` cart migration, picker on the
product page, server revalidation, flavour on the baker email and admin order view. No pricing
change, no new admin editing UI — seed the first cupcake products' flavour arrays directly.

**Phase 2 — administration.** Flavour checkboxes in the admin item form, CSV column, so the
catalogue team owns flavours without a deploy.

**Phase 3 — merchandising.** `?flavour=` filter on the shop, flavours in JSON-LD, optional
per-flavour surcharge (a `flavourSurcharges?: Partial<Record<FlavourId, number>>` on `Product`,
applied in the server re-price loop — the only correct place for it), optional per-flavour
availability so a baker can mark `bubble-gum` unavailable without pulling the product.

Phase 1 holds the only irreversible decision — the cart line key. Phases 2 and 3 are additive.
