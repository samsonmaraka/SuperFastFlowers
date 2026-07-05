'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Product, ProductStatus, Vendor } from '@/lib/types';
import { buildProductSlug } from '@/lib/slug';
import { ProductStatusBadge } from './status-badges';
import { ProductImagePreview } from './product-image-preview';

function err(e: unknown) {
  return Array.isArray(e)
    ? e.map((x) => (typeof x === 'object' && x && 'message' in x ? String((x as { message?: unknown }).message) : String(x))).join(', ')
    : typeof e === 'string'
      ? e
      : 'Request failed';
}

function buildFormFromProduct(product: Product) {
  return {
    name: product.name,
    description: product.description,
    price: String(product.price),
    preparationDays: String(product.preparationDays ?? 2),
    imageUrl: product.imageUrls?.[0] || '',
    vendorId: product.vendorId || '',
    categories: (product.categories || []).join(', '),
    tagsInput: (product.tags || []).join(', '),
    status: product.status ?? 'active',
    featured: product.featured
  };
}

export function ProductsTable({
  initialProducts,
  vendors,
  mode
}: {
  initialProducts: Product[];
  vendors: Vendor[];
  mode: 'super-admin' | 'admin-token' | 'vendor-admin';
}) {
  const searchParams = useSearchParams();
  const isVendor = mode === 'vendor-admin';
  const [products, setProducts] = useState(initialProducts);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState({ q: '', vendor: '', status: '', featured: '' });
  const empty = {
    name: '',
    description: '',
    price: '',
    preparationDays: '2',
    imageUrl: '',
    vendorId: vendors.length === 1 ? vendors[0].id : '',
    categories: '',
    tagsInput: '',
    status: 'active' as ProductStatus,
    featured: false
  };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const activeVendors = vendors.filter((v) => v.status === 'active');
  const selected = activeVendors.find((v) => v.id === form.vendorId);
  const rows = useMemo(
    () =>
      products.filter(
        (p) =>
          (!filter.q || `${p.name} ${p.description}`.toLowerCase().includes(filter.q.toLowerCase())) &&
          (!filter.vendor || p.vendorId === filter.vendor) &&
          (!filter.status || (p.status ?? 'active') === filter.status) &&
          (!filter.featured || String(p.featured) === filter.featured)
      ),
    [products, filter]
  );

  function startEditing(product: Product) {
    setEditing(product.id);
    setForm(buildFormFromProduct(product));
    requestAnimationFrame(() => document.getElementById('product-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId || editing === editId) return;
    const product = products.find((p) => p.id === editId);
    if (product) startEditing(product);
  }, [searchParams, products, editing]);

  async function refresh() {
    const r = await fetch('/api/admin/products', { cache: 'no-store' });
    const d = await r.json();
    if (r.ok) setProducts(d.products || []);
  }

  function image(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setForm((x) => ({ ...x, imageUrl: String(reader.result || '') }));
    reader.readAsDataURL(f);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    if (!form.name.trim()) return setMessage('Name is required.');
    if (form.description.trim().length < 10) return setMessage('Description must be at least 10 characters.');
    if (!form.vendorId) return setMessage('Select an active vendor.');
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return setMessage('Price must be a valid UGX amount.');
    const prep = Number(form.preparationDays);
    if (!Number.isInteger(prep) || prep < 0 || prep > 30) return setMessage('Preparation days must be 0-30.');
    if (!form.imageUrl.trim()) return setMessage('Add an image URL or upload an image.');
    const now = new Date().toISOString();
    const existing = products.find((p) => p.id === editing);
    const payload: Product = {
      id: editing || crypto.randomUUID(),
      name: form.name,
      slug: buildProductSlug(form.name),
      description: form.description,
      price,
      preparationDays: prep,
      category: (form.categories.split(',')[0] || 'General').trim(),
      categories: form.categories.split(',').map((s) => s.trim()).filter(Boolean),
      tags: form.tagsInput.split(',').map((s) => s.trim()).filter(Boolean),
      imageUrls: [form.imageUrl],
      stockStatus: 'in_stock',
      featured: !isVendor && form.featured,
      status: form.status,
      vendorId: form.vendorId,
      vendorName: selected?.name,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    const r = await fetch('/api/admin/products', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const d = await r.json();
    if (!r.ok) return setMessage(`Could not save product: ${err(d.error)}`);
    setProducts(d.products || []);
    setForm(empty);
    setEditing(null);
    setMessage('Product saved.');
  }

  return (
    <div className="space-y-5">
      <section id="product-editor" className="rounded-xl border bg-white p-4">
        <h2 className="text-xl font-semibold">{editing ? 'Edit product' : 'Create product'}</h2>
        <p className="mb-3 text-sm text-gray-600">Prices are in UGX. Vendor admins can only use assigned vendors; with one assigned vendor it is selected automatically.</p>
        <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
          <input className="rounded border p-2" placeholder="Product name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="rounded border p-2" type="number" placeholder="Price in UGX *" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <textarea className="rounded border p-2 md:col-span-2" placeholder="Description (at least 10 characters) *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className="rounded border p-2" value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })} disabled={isVendor && vendors.length === 1}>
            <option value="">Select active vendor *</option>
            {activeVendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <input className="rounded border p-2" placeholder="Categories, comma-separated" value={form.categories} onChange={(e) => setForm({ ...form, categories: e.target.value })} />
          <input className="rounded border p-2" placeholder="Tags, comma-separated" value={form.tagsInput} onChange={(e) => setForm({ ...form, tagsInput: e.target.value })} />
          <label className="text-sm">
            Preparation days
            <input className="mt-1 w-full rounded border p-2" type="number" min="0" max="30" value={form.preparationDays} onChange={(e) => setForm({ ...form, preparationDays: e.target.value })} />
            <span className="text-xs text-gray-500">How many days before delivery this item needs.</span>
          </label>
          <select className="rounded border p-2" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProductStatus })}>
            <option value="active">Active - visible</option>
            <option value="inactive">Inactive - hidden</option>
          </select>
          {!isVendor && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured</label>}
          <input className="rounded border p-2 md:col-span-2" placeholder="Hosted HTTPS image URL *" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          <input className="rounded border p-2" type="file" accept="image/*" onChange={image} />
          <ProductImagePreview src={form.imageUrl} />
          <div className="flex gap-2 md:col-span-2">
            <button className="rounded bg-ink px-4 py-2 font-semibold text-white">Save product</button>
            {editing && <button type="button" className="rounded border px-4 py-2" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</button>}
          </div>
        </form>
        {message && <p className="mt-3 text-sm font-medium">{message}</p>}
      </section>

      <section className="rounded-xl border bg-white p-4">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold">Catalogue</h2>
            <p className="text-sm text-gray-600">Download the current product catalogue as a CSV for offline review and editing.</p>
          </div>
          <a className="rounded bg-ink px-4 py-2 text-center text-sm font-semibold text-white hover:bg-gray-800" href="/api/admin/catalogue/export">Download catalogue CSV</a>
        </div>
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <input className="rounded border p-2" placeholder="Search products" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} />
          {!isVendor && <select className="rounded border p-2" value={filter.vendor} onChange={(e) => setFilter({ ...filter, vendor: e.target.value })}><option value="">All vendors</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>}
          <select className="rounded border p-2" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
          {!isVendor && <select className="rounded border p-2" value={filter.featured} onChange={(e) => setFilter({ ...filter, featured: e.target.value })}><option value="">Featured/all</option><option value="true">Featured</option><option value="false">Not featured</option></select>}
        </div>
        {rows.length === 0 ? <p className="rounded border border-dashed p-6 text-center text-gray-600">No products match this view.</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-3 font-semibold">{p.name}<p className="text-xs font-normal text-gray-500">{p.vendorName || vendors.find((v) => v.id === p.vendorId)?.name || 'No vendor'}</p></td>
                    <td>UGX {p.price.toLocaleString()}</td>
                    <td><ProductStatusBadge status={p.status} /></td>
                    <td className="text-right">
                      <button className="text-blue-700" onClick={() => startEditing(p)}>Edit</button>
                      <button className="ml-3 text-red-700" onClick={async () => { if (!confirm('Delete product?')) return; const r = await fetch(`/api/admin/products?id=${p.id}`, { method: 'DELETE' }); if (!r.ok) { setMessage('Delete failed.'); return; } await refresh(); setMessage('Product deleted.'); }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
