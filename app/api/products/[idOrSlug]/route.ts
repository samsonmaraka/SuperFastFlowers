import { NextResponse } from 'next/server';
import { getProductByIdOrSlug } from '@/lib/products-repo';

export async function GET(_: Request, { params }: { params: { idOrSlug: string } }) {
  const product = await getProductByIdOrSlug(params.idOrSlug);

  if (!product) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ product });
}
