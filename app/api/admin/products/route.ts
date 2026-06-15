import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/admin-auth';
import {
  deleteProduct,
  getActiveVendorForProduct,
  getProductBySlug,
  listProducts,
  ProductSaveError,
  upsertProduct
} from '@/lib/products-repo';
import { uploadNewProductImagesToS3 } from '@/lib/product-image-storage';
import { productSchema } from '@/lib/validators';

type AdminProductErrorCode =
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | 'VENDOR_REQUIRED'
  | 'VENDOR_NOT_FOUND'
  | 'VENDOR_INACTIVE'
  | 'DUPLICATE_SLUG'
  | 'IMAGE_UPLOAD_FAILED'
  | 'SAVE_FAILED'
  | 'DELETE_FAILED';

function errorResponse(error: string, code: AdminProductErrorCode, status: number, details: Record<string, unknown> = {}) {
  return NextResponse.json({ error, code, details }, { status });
}

function serializeServerError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return { message: String(error) };
  }

  const candidate = error as {
    message?: unknown;
    name?: unknown;
    code?: unknown;
    stack?: unknown;
    $metadata?: unknown;
  };

  return {
    message: typeof candidate.message === 'string' ? candidate.message : String(error),
    name: typeof candidate.name === 'string' ? candidate.name : undefined,
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    stack: typeof candidate.stack === 'string' ? candidate.stack : undefined,
    awsMetadata: candidate.$metadata
  };
}

function logServerError(context: string, error: unknown) {
  console.error(context, serializeServerError(error));
}

export const runtime = 'nodejs';


export async function GET(req: NextRequest) {
  try {
    try { await requireAdminApiAccess(req); } catch {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const products = await listProducts({ includeInactive: true });

    return NextResponse.json(
      { products },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      }
    );
  } catch (error) {
    logServerError('GET /api/admin/products failed', error);
    return errorResponse('Failed to list products. Please try again.', 'SAVE_FAILED', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('POST /api/admin/products called');

    try { await requireAdminApiAccess(req); } catch {
      console.log('Unauthorized admin request');
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const body = await req.json();
    console.log('Request body received');
    console.log('Product name:', body?.name);
    console.log('Product slug:', body?.slug);
    console.log('Image count:', body?.imageUrls?.length ?? 0);
    console.log('First image length:', body?.imageUrls?.[0]?.length ?? 0);

    const parsed = productSchema.safeParse(body);

    if (!parsed.success) {
      console.log('Validation failed:', parsed.error.issues);
      return errorResponse('Please check the product details and try again.', 'VALIDATION_ERROR', 400, {
        issues: parsed.error.issues
      });
    }

    if (!parsed.data.vendorId) {
      return errorResponse('Please select an active vendor before saving this product.', 'VENDOR_REQUIRED', 400);
    }

    try {
      await getActiveVendorForProduct(parsed.data);
    } catch (error) {
      if (error instanceof ProductSaveError) {
        return errorResponse(error.message, error.code, error.status, error.details);
      }
      throw error;
    }

    const existingSlugProduct = await getProductBySlug(parsed.data.slug, { includeInactive: true });
    if (existingSlugProduct && existingSlugProduct.id !== parsed.data.id) {
      return errorResponse('Another product already uses this slug. Please rename the product or edit the existing item.', 'DUPLICATE_SLUG', 409, {
        slug: parsed.data.slug,
        existingProductId: existingSlugProduct.id
      });
    }

    console.log('Validation passed');

    let productToSave = parsed.data;
    try {
      productToSave = await uploadNewProductImagesToS3(parsed.data);
    } catch (error) {
      logServerError('POST /api/admin/products image upload failed', error);
      return errorResponse('Product image upload failed. Please choose a valid image and try saving again.', 'IMAGE_UPLOAD_FAILED', 500);
    }

    try {
      await upsertProduct(productToSave);
      console.log('upsertProduct succeeded');
    } catch (error) {
      if (error instanceof ProductSaveError) {
        return errorResponse(error.message, error.code, error.status, error.details);
      }

      logServerError('POST /api/admin/products save failed', error);
      return errorResponse('Failed to save product. Please try again or contact support if the problem continues.', 'SAVE_FAILED', 500);
    }

    const products = await listProducts({ includeInactive: true });
    console.log('listProducts succeeded');

    return NextResponse.json({ ok: true, products });
  } catch (error) {
    logServerError('POST /api/admin/products failed', error);

    return errorResponse('Failed to save product. Please try again or contact support if the problem continues.', 'SAVE_FAILED', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    console.log('DELETE /api/admin/products called');

    try { await requireAdminApiAccess(req); } catch {
      console.log('Unauthorized delete request');
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return errorResponse('Missing id', 'VALIDATION_ERROR', 400);
    }

    console.log('Deleting product id:', id);
    await deleteProduct(id);
    console.log('deleteProduct succeeded');

    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError('DELETE /api/admin/products failed', error);

    return errorResponse('Failed to delete product. Please try again.', 'DELETE_FAILED', 500);
  }
}
