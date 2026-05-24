import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { deleteProduct, listProducts, upsertProduct } from '@/lib/products-repo';
import { productSchema } from '@/lib/validators';

export const runtime = 'nodejs';

function isAuthorized(req: NextRequest) {
  const token = req.headers.get('x-admin-token');
  return token === getEnv().adminToken;
}

export async function GET(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const products = await listProducts();

    return NextResponse.json(
      { products },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      }
    );
  } catch (error) {
    console.error('GET /api/admin/products failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('POST /api/admin/products called');

    if (!isAuthorized(req)) {
      console.log('Unauthorized admin request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json(
        { error: parsed.error.issues },
        { status: 400 }
      );
    }

    console.log('Validation passed');

    await upsertProduct(parsed.data);
    console.log('upsertProduct succeeded');

    const products = await listProducts();
    console.log('listProducts succeeded');

    return NextResponse.json({ ok: true, products });
  } catch (error) {
    console.error('POST /api/admin/products failed:', error);

    return NextResponse.json(
      {
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    console.log('DELETE /api/admin/products called');

    if (!isAuthorized(req)) {
      console.log('Unauthorized delete request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    console.log('Deleting product id:', id);
    await deleteProduct(id);
    console.log('deleteProduct succeeded');

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/admin/products failed:', error);

    return NextResponse.json(
      {
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
