'use client';

import { Product } from '@/lib/types';
import { ChangeEvent, FormEvent, useMemo, useState } from 'react';

const ADMIN_LOGIN_CODE = 'samsonmaraka';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
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

  const isFormValid = useMemo(
    () => name.trim().length >= 2 && description.trim().length >= 10 && Number(price) >= 0 && imageUrl.trim().length > 0,
    [description, imageUrl, name, price]
  );
  const save = async (product: Product) => {
  setIsSaving(true);
  setMessage('');

  try {
    console.log('Submitting product:', product);
    console.log('Image URL length:', product.imageUrls?.[0]?.length);

    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify(product)
    });

    let data: any = null;

    try {
      data = await res.json();
    } catch {
      data = null;
    }

    console.log('Save product status:', res.status);
    console.log('Save product response:', data);

    if (!res.ok) {
      setMessage(`Failed to save product. Status: ${res.status}. ${data?.error ? JSON.stringify(data.error) : ''}`);
      return;
    }

    setMessage('Saved product.');
    if (data?.products) {
      setProducts(data.products);
    }
  } catch (error) {
    console.error('Save product crashed:', error);
    setMessage(`Failed to save product. ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    setIsSaving(false);
  }
};

  // const save = async (product: Product) => {
  //   setIsSaving(true);
  //   const res = await fetch('/api/admin/products', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
  //     body: JSON.stringify(product)
  //   });
  //   setMessage(res.ok ? 'Saved product.' : 'Failed to save product.');
  //   if (res.ok) {
  //     const data = await res.json();
  //     setProducts(data.products);
  //   }
  //   setIsSaving(false);
  // };

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
      id: crypto.randomUUID(),
      name: productName,
      slug: `${slugify(productName)}-${Date.now()}`,
      description: description.trim(),
      price: Number(price),
      category: 'General',
      tags: ['admin-added'],
      imageUrls: [imageUrl.trim()],
      stockStatus: 'in_stock',
      featured: false,
      createdAt: now,
      updatedAt: now
    });

    setName('');
    setDescription('');
    setPrice('0');
    setImageUrl('');
    setImagePreview('');
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
        <h2 className="text-lg font-semibold">Add a product</h2>
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
          Price (USD)
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
          Upload image
          <input type="file" accept="image/*" onChange={onImageUpload} className="mt-1 w-full rounded border p-2" />
        </label>
        {imagePreview ? (
          <img src={imagePreview} alt="Uploaded preview" className="h-40 w-full rounded border object-cover" />
        ) : null}
        <button disabled={!isFormValid || isSaving} className="rounded bg-ink px-3 py-2 text-white disabled:opacity-50">
          {isSaving ? 'Saving...' : 'Save product'}
        </button>
      </form>

      <p className="text-sm text-gray-600">{message}</p>

      {products.map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded border bg-white p-3">
          <div>
            <p className="font-medium">{p.name}</p>
            <p className="text-sm text-gray-600">{p.category} · ${p.price}</p>
          </div>
          <button className="text-sm text-red-700" onClick={() => remove(p.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
