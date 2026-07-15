import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/admin-auth';
import { isSuperAdminContext } from '@/lib/vendor-permissions';
import { deleteAddon, listAddons, upsertAddon } from '@/lib/addons-repo';
import { uploadNewAddonImageToS3 } from '@/lib/product-image-storage';
import { addonSchema } from '@/lib/validators';

export async function GET(req: NextRequest) {
  let access;
  try {
    access = await requireAdminApiAccess(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSuperAdminContext(access)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    return NextResponse.json({ addons: await listAddons({ includeInactive: true }) });
  } catch {
    return NextResponse.json({ error: 'Failed to list add-ons' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let access;
  try {
    access = await requireAdminApiAccess(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSuperAdminContext(access)) return NextResponse.json({ error: 'Only super admins can manage add-ons.' }, { status: 403 });
  try {
    const parsed = addonSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

    let addonToSave = parsed.data;
    try {
      addonToSave = await uploadNewAddonImageToS3(addonToSave);
    } catch (error) {
      console.error('POST /api/admin/addons image upload failed', error);
      return NextResponse.json(
        { error: 'Add-on image upload failed. Please choose a valid image and try saving again.' },
        { status: 500 }
      );
    }

    await upsertAddon(addonToSave);
    return NextResponse.json({ ok: true, addons: await listAddons({ includeInactive: true }) });
  } catch {
    return NextResponse.json({ error: 'Failed to save add-on' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  let access;
  try {
    access = await requireAdminApiAccess(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSuperAdminContext(access)) return NextResponse.json({ error: 'Only super admins can manage add-ons.' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  try {
    await deleteAddon(id);
    return NextResponse.json({ ok: true, addons: await listAddons({ includeInactive: true }) });
  } catch {
    return NextResponse.json({ error: 'Failed to delete add-on' }, { status: 500 });
  }
}
