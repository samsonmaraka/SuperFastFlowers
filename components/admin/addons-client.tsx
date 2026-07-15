'use client';

import { FormEvent, useMemo, useState } from 'react';
import type { Addon } from '@/lib/types';
import { formatUgx } from '@/lib/format';

const emptyAddon: Addon = {
  id: '',
  name: '',
  description: '',
  price: 0,
  imageUrl: '',
  status: 'active',
  sortOrder: undefined,
  createdAt: '',
  updatedAt: ''
};

export function AddonsClient({ initialAddons }: { initialAddons: Addon[] }) {
  const [addons, setAddons] = useState(initialAddons);
  const [q, setQ] = useState('');
  const [form, setForm] = useState<Addon>(emptyAddon);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const rows = useMemo(
    () => addons.filter((addon) => !q || `${addon.name} ${addon.description || ''}`.toLowerCase().includes(q.toLowerCase())),
    [addons, q]
  );

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMsg('');

    const now = new Date().toISOString();
    const payload: Addon = {
      ...form,
      id: form.id || crypto.randomUUID(),
      price: Number(form.price) || 0,
      createdAt: form.createdAt || now,
      updatedAt: now
    };

    const res = await fetch('/api/admin/addons', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.ok) {
      setAddons(data.addons || []);
      setForm(emptyAddon);
      setMsg('Add-on saved.');
    } else {
      setMsg(
        Array.isArray(data.error)
          ? data.error
              .map((issue: unknown) =>
                typeof issue === 'object' && issue && 'message' in issue ? String((issue as { message?: unknown }).message) : String(issue)
              )
              .join(', ')
          : data.error || 'Save failed.'
      );
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm('Delete this add-on? It will disappear from product pages immediately.')) return;
    const res = await fetch(`/api/admin/addons?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      setAddons(data.addons || []);
      setMsg('Add-on deleted.');
    } else {
      setMsg(data.error || 'Delete failed.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-4">
        <h1 className="text-2xl font-semibold">Gift add-ons</h1>
        <p className="text-sm text-gray-600">
          Optional extras (wine, chocolates, cards…) that customers can attach to any gift on the product page. Only active add-ons
          are shown to customers.
        </p>
        <input
          className="mt-3 w-full rounded border p-2 md:w-80"
          placeholder="Search add-ons"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <section id="addon-editor" className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold">{form.id ? 'Edit add-on' : 'Create add-on'}</h2>
        <form onSubmit={save} className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            className="rounded border p-2"
            placeholder="Name * (e.g. J.P. Chenet ICE Edition Pink 750ml)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="rounded border p-2"
            type="number"
            min={0}
            step="any"
            placeholder="Price (UGX) *"
            value={form.price || ''}
            onChange={(e) => setForm({ ...form, price: e.target.value === '' ? 0 : Number(e.target.value) })}
            required
          />
          <input
            className="rounded border p-2 md:col-span-2"
            placeholder="Image URL (hosted URL or /images/… path)"
            value={form.imageUrl || ''}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          />
          <textarea
            className="rounded border p-2 md:col-span-2"
            placeholder="Short description shown to customers"
            value={form.description || ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select
            className="rounded border p-2"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
          >
            <option value="active">Active (visible to customers)</option>
            <option value="inactive">Inactive (hidden)</option>
          </select>
          <input
            className="rounded border p-2"
            type="number"
            min={0}
            placeholder="Sort order (lower shows first)"
            value={form.sortOrder ?? ''}
            onChange={(e) => setForm({ ...form, sortOrder: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
          <div className="flex gap-3 md:col-span-2">
            <button disabled={saving} className="rounded bg-ink px-4 py-2 font-semibold text-white disabled:opacity-60">
              {saving ? 'Saving…' : 'Save add-on'}
            </button>
            {form.id ? (
              <button type="button" className="rounded border px-4 py-2" onClick={() => setForm(emptyAddon)}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
        {msg && <p className="mt-2 text-sm font-medium">{msg}</p>}
      </section>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-white p-8 text-center text-gray-600">No add-ons yet. Create your first one above.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((addon) => (
            <article key={addon.id} className="flex gap-4 rounded-xl border bg-white p-4">
              {addon.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={addon.imageUrl} alt={addon.name} className="h-24 w-16 shrink-0 rounded object-contain" />
              ) : (
                <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded bg-pink-50 text-2xl">🎁</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{addon.name}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      addon.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {addon.status}
                  </span>
                </div>
                <p className="text-sm font-semibold text-ink">UGX {formatUgx(addon.price)}</p>
                {addon.description ? <p className="mt-1 text-sm text-gray-600">{addon.description}</p> : null}
                <div className="mt-2 flex gap-3 text-sm">
                  <button
                    className="text-blue-700"
                    onClick={() => {
                      setForm(addon);
                      requestAnimationFrame(() =>
                        document.getElementById('addon-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      );
                    }}
                  >
                    Edit
                  </button>
                  <button className="text-red-700" onClick={() => remove(addon.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
