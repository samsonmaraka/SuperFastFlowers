'use client';

import { Product } from '@/lib/types';
import { useState } from 'react';

export function AdminProductsClient({ initial }: { initial: Product[] }) {
  const [products, setProducts] = useState(initial);
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');

  const save = async (product: Product) => {
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify(product)
    });
    setMessage(res.ok ? 'Saved product.' : 'Failed to save product.');
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products);
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

  return (
    <div className="space-y-6">
      <label className="block text-sm">
        Admin token
        <input value={token} onChange={(e) => setToken(e.target.value)} className="mt-1 w-full rounded border p-2" />
      </label>

      <button
        onClick={() =>
          save({
            id: crypto.randomUUID(),
            name: 'New Gift Product',
            slug: `gift-${Date.now()}`,
            description: 'Update me in DynamoDB-backed admin flow.',
            price: 25,
            category: 'General',
            tags: ['gift'],
            imageUrls: ['https://images.unsplash.com/photo-1513883049090-d0b7439799bf?w=1200&q=80'],
            stockStatus: 'in_stock',
            featured: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        }
        className="rounded bg-ink px-3 py-2 text-white"
      >
        Add sample product
      </button>

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
