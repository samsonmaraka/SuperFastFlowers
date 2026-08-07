import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/admin-auth';
import {
  parseCatalogueBoolean,
  parseCatalogueCsv,
  parseCatalogueFlavours,
  parseCatalogueListValue,
  parseCatalogueStockStatus,
  parsePreparationDaysFromDeliveryNotes,
  type ParsedCatalogueCsvRow
} from '@/lib/catalogue-csv-schema';
import { listProducts, ProductSaveError, upsertProduct } from '@/lib/products-repo';
import { buildProductSlug } from '@/lib/slug';
import { productSchema } from '@/lib/validators';
import { writeAuditLog } from '@/lib/audit-repo';
import { canManageProduct, canManageVendor, filterProductsForAdmin } from '@/lib/vendor-permissions';
import type { Product } from '@/lib/types';

export const runtime = 'nodejs';

const MAX_CSV_BYTES = 5 * 1024 * 1024;

type RowError = { line: number; productId: string; error: string };

function rowError(row: ParsedCatalogueCsvRow, error: string): RowError {
  return { line: row.line, productId: row.values.product_id || '(new)', error };
}

async function auditImport(access: Awaited<ReturnType<typeof requireAdminApiAccess>>, action: string, productId: string, vendorId?: string) {
  if (access.mode !== 'vendor-admin') return;
  try { await writeAuditLog({ auditId: crypto.randomUUID(), actorUserId: access.current.user.userId, actorEmail: access.current.user.email, action, targetType: 'PRODUCT', targetId: productId, vendorId, createdAt: new Date().toISOString() }); } catch (error) { console.error('[AUDIT_LOG_FAILED]', error); }
}

export async function POST(req: NextRequest) {
  let access;
  try { access = await requireAdminApiAccess(req); } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Attach a catalogue CSV file in the "file" field.' }, { status: 400 });
    }
    if (file.size > MAX_CSV_BYTES) {
      return NextResponse.json({ error: 'Catalogue CSV is too large (5 MB maximum).' }, { status: 400 });
    }

    const parsed = parseCatalogueCsv(await file.text());
    if (parsed.errors.length > 0) {
      return NextResponse.json({ error: parsed.errors.join(' ') }, { status: 400 });
    }

    const existingProducts = await listProducts({ includeInactive: true });
    const productsById = new Map(existingProducts.map((product) => [product.id, product]));
    const slugOwners = new Map(existingProducts.map((product) => [product.slug, product.id]));

    let created = 0;
    let updated = 0;
    const errors: RowError[] = [];

    for (const row of parsed.rows) {
      const values = row.values;
      const id = values.product_id?.trim() || crypto.randomUUID();
      const existing = productsById.get(id);
      const isUpdate = Boolean(existing);

      const name = values.title?.trim() || existing?.name || '';
      const description = values.description?.trim() || existing?.description || '';
      const priceText = values.price?.trim();
      const price = priceText ? Number(priceText.replace(/[,\s]/g, '')) : existing?.price;
      const categories = values.categories ? parseCatalogueListValue(values.categories) : existing?.categories || [];
      const tags = values.tags ? parseCatalogueListValue(values.tags) : existing?.tags || [];
      const flavours = values.flavours !== undefined ? parseCatalogueFlavours(values.flavours) : existing?.flavours || [];
      const imageUrls = values.image_urls ? parseCatalogueListValue(values.image_urls) : existing?.imageUrls || [];
      const isActive = parseCatalogueBoolean(values.is_active);
      const isFeatured = parseCatalogueBoolean(values.is_featured);
      const stockStatus = parseCatalogueStockStatus(values.stock_status) || existing?.stockStatus || 'in_stock';
      const preparationDays = parsePreparationDaysFromDeliveryNotes(values.delivery_notes) ?? existing?.preparationDays;
      const vendorId = values.vendor_id?.trim() || existing?.vendorId;

      if (price === undefined || !Number.isFinite(price) || price < 0) {
        errors.push(rowError(row, 'Price must be a valid UGX amount.'));
        continue;
      }
      if (!vendorId) {
        errors.push(rowError(row, 'vendor_id is required for new products.'));
        continue;
      }
      if (existing && !canManageProduct(access, existing)) {
        errors.push(rowError(row, 'You do not have access to this product’s vendor.'));
        continue;
      }
      if (!canManageVendor(access, vendorId)) {
        errors.push(rowError(row, 'You do not have access to this vendor.'));
        continue;
      }
      if (access.mode === 'vendor-admin' && existing?.vendorId && existing.vendorId !== vendorId) {
        errors.push(rowError(row, 'Vendor admins cannot move products between vendors.'));
        continue;
      }

      const cleanSlug = buildProductSlug(name);
      const slugOwner = slugOwners.get(cleanSlug);
      const finalSlug = slugOwner && slugOwner !== id ? buildProductSlug(name, id.slice(0, 8)) : cleanSlug;
      const now = new Date().toISOString();
      const legacySlugs = existing && existing.slug !== finalSlug
        ? Array.from(new Set([...(existing.legacySlugs ?? []), existing.slug]))
        : existing?.legacySlugs;

      // updated_at from the CSV is intentionally ignored; the import stamps its own timestamp.
      const candidate: Product = {
        ...existing,
        id,
        name,
        slug: finalSlug,
        ...(legacySlugs?.length ? { legacySlugs } : {}),
        description,
        price,
        category: categories[0] || existing?.category || 'General',
        categories,
        tags,
        flavours: flavours.length ? flavours : undefined,
        imageUrls,
        stockStatus,
        featured: isFeatured ?? existing?.featured ?? false,
        status: isActive === undefined ? existing?.status ?? 'active' : isActive ? 'active' : 'inactive',
        vendorId,
        preparationDays,
        createdAt: existing?.createdAt || now,
        updatedAt: now
      };

      const validation = productSchema.safeParse(candidate);
      if (!validation.success) {
        const issues = validation.error.issues.map((issue) => `${issue.path.join('.') || 'row'}: ${issue.message}`).join('; ');
        errors.push(rowError(row, issues));
        continue;
      }

      try {
        await upsertProduct(candidate);
      } catch (error) {
        if (error instanceof ProductSaveError) {
          errors.push(rowError(row, error.message));
          continue;
        }
        console.error('POST /api/admin/catalogue/import row save failed', error);
        errors.push(rowError(row, 'Failed to save this product. Please try again.'));
        continue;
      }

      productsById.set(id, candidate);
      slugOwners.set(finalSlug, id);
      if (isUpdate) updated += 1; else created += 1;
      await auditImport(access, isUpdate ? 'VENDOR_ADMIN_PRODUCT_UPDATED' : 'VENDOR_ADMIN_PRODUCT_CREATED', id, vendorId);
    }

    const products = filterProductsForAdmin(access, await listProducts({ includeInactive: true }));

    return NextResponse.json({
      ok: errors.length === 0,
      created,
      updated,
      failed: errors.length,
      errors,
      products
    });
  } catch (error) {
    console.error('POST /api/admin/catalogue/import failed', error);
    return NextResponse.json({ error: 'Failed to import catalogue CSV. Please try again.' }, { status: 500 });
  }
}
