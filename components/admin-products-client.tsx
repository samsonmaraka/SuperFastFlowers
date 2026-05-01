'use client';

import Image from 'next/image';
import { Product } from '@/lib/types';
import { ChangeEvent, FormEvent, useMemo, useState } from 'react';

const ADMIN_LOGIN_CODE = 'samsonmaraka';

type AdminProductsResponse = {
  ok?: boolean;
  products?: Product[];
  error?: string | { message?: string } | Array<{ message?: string }>;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function formatApiError(error: AdminProductsResponse['error']) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (Array.isArray(error)) {
    return error
      .map((issue) => issue?.message)
      .filter(Boolean)
      .join(', ');
  }
  return error.message || JSON.stringify(error);
}

export function AdminProductsClient({ initial }: { initial: Product[] }) {
  const [products, setProducts] = useState(initial);
  const [token, setToken] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [vendorContactName1, setVendorContactName1] = useState('');
  const [vendorContact1, setVendorContact1] = useState('');
  const [vendorContactName2, setVendorContactName2] = useState('');
  const [vendorContact2, setVendorContact2] = useState('');

  const isFormValid = useMemo(
    () => name.trim().length >= 2 && description.trim().length >= 10 && Number(price) >= 0 && imageUrl.trim().length > 0,
    [description, imageUrl, name, price]
  );

  const save = async (product: Product) => {
    setIsSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify(product)
      });

      let data: AdminProductsResponse | null = null;

      try {
        const json = (await res.json()) as unknown;
        if (typeof json === 'object' && json !== null) {
          data = json as AdminProductsResponse;
        }
      } catch {
        data = null;
      }

      if (!res.ok) {
        const apiError = formatApiError(data?.error);
        setMessage(`Failed to save product. Status: ${res.status}.${apiError ? ` ${apiError}` : ''}`);
        return;
      }

      setMessage('Saved product.');
      if (data?.products) {
        setProducts(data.products);
      }
    } catch (error) {
      setMessage(`Failed to save product. ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/admin/products?id=${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': token }
    });
    setMessage(res.ok ? 'Deleted product.' : 'Failed to delete product.');
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const login = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loginCode !== ADMIN_LOGIN_CODE) {
      setMessage('Invalid admin login code.');
      return;
    }

    setToken(ADMIN_LOGIN_CODE);
    setIsLoggedIn(true);
    setMessage('Admin login successful.');
  };

  const onImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      setImageUrl(value);
      setImagePreview(value);
    };
    reader.readAsDataURL(file);
  };

  const submitProduct = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isFormValid) {
      setMessage('Please fill all fields correctly before saving.');
      return;
    }

    const now = new Date().toISOString();
    const productName = name.trim();

    await save({
      id: editingId || crypto.randomUUID(),
      name: productName,
      slug: editingId ? products.find((p) => p.id === editingId)?.slug || `${slugify(productName)}-${Date.now()}` : `${slugify(productName)}-${Date.now()}`,
      description: description.trim(),
      price: Number(price),
      category: 'General',
      tags: ['admin-added'],
      imageUrls: [imageUrl.trim()],
      stockStatus: 'in_stock',
      featured: editingId ? products.find((p) => p.id === editingId)?.featured || false : false,
      vendorName: vendorName.trim(),
      vendorContactName1: vendorContactName1.trim(),
      vendorContact1: vendorContact1.trim(),
      vendorContactName2: vendorContactName2.trim(),
      vendorContact2: vendorContact2.trim(),
      createdAt: editingId ? products.find((p) => p.id === editingId)?.createdAt || now : now,
      updatedAt: now
    });

    resetForm();
  };


  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setDescription(product.description);
    setPrice(String(product.price));
    setImageUrl(product.imageUrls[0] || '');
    setImagePreview(product.imageUrls[0] || '');
    setVendorName(product.vendorName || '');
    setVendorContactName1(product.vendorContactName1 || '');
    setVendorContact1(product.vendorContact1 || '');
    setVendorContactName2(product.vendorContactName2 || '');
    setVendorContact2(product.vendorContact2 || '');
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setPrice('0');
    setImageUrl('');
    setImagePreview('');
    setVendorName('');
    setVendorContactName1('');
    setVendorContact1('');
    setVendorContactName2('');
    setVendorContact2('');
  };

  if (!isLoggedIn) {
    return (
      <form onSubmit={login} className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Admin login</h2>
        <label className="block text-sm">
          Enter admin code
          <input
            type="password"
            value={loginCode}
            onChange={(e) => setLoginCode(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        <button className="rounded bg-ink px-3 py-2 text-white">Login</button>
        {message ? <p className="text-sm text-gray-600">{message}</p> : null}
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submitProduct} className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">{editingId ? 'Edit listing' : 'Add a product'}</h2>
        <label className="block text-sm">
          Product name
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="block text-sm">
          Full description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        <label className="block text-sm">
          Price (UGX)
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        <label className="block text-sm">
          Vendor name (company)
          <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="block text-sm">
          Vendor contact name 1
          <input value={vendorContactName1} onChange={(e) => setVendorContactName1(e.target.value)} className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="block text-sm">
          Vendor contact 1
          <input value={vendorContact1} onChange={(e) => setVendorContact1(e.target.value)} className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="block text-sm">
          Vendor contact name 2
          <input value={vendorContactName2} onChange={(e) => setVendorContactName2(e.target.value)} className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="block text-sm">
          Vendor contact 2
          <input value={vendorContact2} onChange={(e) => setVendorContact2(e.target.value)} className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="block text-sm">
          Upload image
          <input type="file" accept="image/*" onChange={onImageUpload} className="mt-1 w-full rounded border p-2" />
        </label>
        {imagePreview ? (
          <Image
            src={imagePreview}
            alt="Uploaded preview"
            width={640}
            height={320}
            className="h-40 w-full rounded border object-cover"
            unoptimized
          />
        ) : null}
        <button disabled={!isFormValid || isSaving} className="rounded bg-ink px-3 py-2 text-white disabled:opacity-50">
          {isSaving ? 'Saving...' : editingId ? 'Update listing' : 'Save product'}
        </button>
      </form>

      <p className="text-sm text-gray-600">{message}</p>

      {products.map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded border bg-white p-3">
          <div>
            <p className="font-medium">{p.name}</p>
            <p className="text-sm text-gray-600">
              {p.category} · UGX {p.price}
            </p>
            <p className="text-xs text-gray-500">
              Vendor: {p.vendorName || '—'}
            </p>
          </div>
          <div className="flex gap-3">
            <button className="text-sm text-blue-700" onClick={() => startEditing(p)}>
              Edit
            </button>
            <button className="text-sm text-red-700" onClick={() => remove(p.id)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
