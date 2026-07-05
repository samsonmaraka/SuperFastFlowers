import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/admin-auth';
import { productsToCatalogueCsv } from '@/lib/catalogue-csv-schema';
import { listProducts } from '@/lib/products-repo';
import { filterProductsForAdmin } from '@/lib/vendor-permissions';

export const runtime = 'nodejs';

function csvFilename(date = new Date()) {
  return `sendagift-catalogue-${date.toISOString().slice(0, 10)}.csv`;
}

export async function GET(req: NextRequest) {
  let access;
  try {
    access = await requireAdminApiAccess(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const products = filterProductsForAdmin(access, await listProducts({ includeInactive: true }));
  const csv = productsToCatalogueCsv(products);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${csvFilename()}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    }
  });
}
