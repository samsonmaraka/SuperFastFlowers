import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { deleteProduct, listProducts, upsertProduct } from '@/lib/products-repo';
import { productSchema } from '@/lib/validators';

function isAuthorized(req: NextRequest) {
  return req.headers.get('x-admin-token') === env.adminToken;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  await upsertProduct(parsed.data);
  const products = await listProducts();
  return NextResponse.json({ ok: true, products });
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  await deleteProduct(id);
  return NextResponse.json({ ok: true });
}
