import { NextRequest, NextResponse } from 'next/server';
import { listProducts } from '@/lib/products-repo';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || undefined;
  const category = req.nextUrl.searchParams.get('category') || undefined;
  const featured = req.nextUrl.searchParams.get('featured');

  const products = await listProducts({
    q,
    category,
    featured: featured ? featured === 'true' : undefined
  });

  return NextResponse.json({ products });
}
