'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Product, ProductStatus, Vendor, OrderRequest, OrderStatus, UserRole, UserRoleAssignment, AppUser } from '@/lib/types';
import { VendorLocationMap } from '@/components/vendor-location-map';

const activeStatuses: OrderStatus[] = ['new', 'reviewed', 'processing'];
const statusOptions: OrderStatus[] = ['new', 'processing', 'completed', 'cancelled'];

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''); }

function normalizeApiError(error: unknown) {
  if (typeof error === 'string') return error;
  if (Array.isArray(error)) {
    return error
      .map((issue) => {
        if (!issue || typeof issue !== 'object') return null;
        const path = Array.isArray((issue as { path?: unknown }).path) ? (issue as { path?: string[] }).path?.join('.') : '';
        const message = typeof (issue as { message?: unknown }).message === 'string' ? (issue as { message: string }).message : null;
        if (!message) return null;
        return path ? `${path}: ${message}` : message;
      })
      .filter(Boolean)
      .join(' | ');
  }
  return 'Validation or server error.';
}

function formatOrderDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}


export function AdminProductsClient({ initial }: { initial: Product[] }) {
  const [tab, setTab] = useState<'vendors'|'items'|'orders'|'users'>('vendors');
  const [products, setProducts] = useState(initial);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<OrderRequest[]>([]);
  const [users, setUsers] = useState<(AppUser & { roles: UserRoleAssignment[] })[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const emptyItemForm = { name:'', description:'', price:'', preparationDays:'2', imageUrl:'', vendorId:'', tagsInput:'', categories:'', status:'active' as ProductStatus };
  const [form, setForm] = useState(emptyItemForm);
  const [vendorForm, setVendorForm] = useState<Vendor>({ id:'', name:'', contactPerson:'', phone:'', email:'', location:'', vendorLatitude: undefined, vendorLongitude: undefined, notes:'', status:'active', createdAt:'', updatedAt:'' });

  const activeVendors = useMemo(()=> vendors.filter(v=>v.status==='active'),[vendors]);
  const selectedVendor = useMemo(()=>activeVendors.find(v=>v.id===form.vendorId),[activeVendors,form.vendorId]);

  async function handleImageUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setMessage('Image selected. It will be uploaded to S3 when you save the item.');
      setForm((prev) => ({ ...prev, imageUrl: result }));
    };
    reader.onerror = () => setMessage('Failed reading selected image file.');
    reader.readAsDataURL(file);
  }

  function onImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void handleImageUpload(file);
  }

  function getProductVendorLabel(product: Product) {
    if (product.vendorName) return product.vendorName;

    const matchedVendor = product.vendorId
      ? vendors.find((vendor) => vendor.id === product.vendorId)
      : undefined;

    if (matchedVendor?.name) return matchedVendor.name;

    return (
      product.vendorContactPerson ||
      product.vendorContactName1 ||
      product.vendorContact1 ||
      '—'
    );
  }



  async function refreshProducts() {
    const res = await fetch('/api/admin/products', {
      cache: 'no-store'
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || 'Failed to load products.');
    }

    setProducts(data.products || []);
  }

  async function fetchVendors(){ const res=await fetch('/api/admin/vendors'); if(res.ok){const d=await res.json();setVendors(d.vendors||[]);} }
  async function fetchOrders(group?:'active'|'closed'){ const q=group?`?statusGroup=${group}`:''; const res=await fetch(`/api/admin/orders${q}`); if(res.ok){const d=await res.json(); setOrders(d.orders||[]);} }
  const fetchUsers = useCallback(async () => { const q=userSearch.trim()?`?q=${encodeURIComponent(userSearch.trim())}`:''; const res=await fetch(`/api/admin/users${q}`); if(res.ok){const d=await res.json(); setUsers(d.users||[]);} }, [userSearch]);
  useEffect(()=>{ void fetchVendors(); void fetchOrders(); void fetchUsers(); },[fetchUsers]);

  async function saveItem(e:FormEvent){
    e.preventDefault();

    if (!form.name.trim()) { setMessage('Item name is required.'); return; }
    if (form.description.trim().length < 10) { setMessage('Description must be at least 10 characters.'); return; }
    if (!form.imageUrl.trim()) { setMessage('An image URL or uploaded image is required.'); return; }
    if (!form.vendorId || !selectedVendor) { setMessage('Please select an active vendor before saving this item.'); return; }

    if (!form.price.trim()) { setMessage('Price is required.'); return; }
    const priceValue = Number(form.price);
    if (!Number.isFinite(priceValue) || priceValue < 0) { setMessage('Price must be a valid number greater than or equal to 0.'); return; }

    const preparationDaysValue = Number(form.preparationDays);
    if (!Number.isInteger(preparationDaysValue) || preparationDaysValue < 0 || preparationDaysValue > 30) { setMessage('Days to prepare must be a whole number between 0 and 30.'); return; }

    const now=new Date().toISOString();
    const existing=products.find(p=>p.id===editingId);
    const payload:Product={id:editingId||crypto.randomUUID(),name:form.name,slug:existing?.slug||`${slugify(form.name)}-${Date.now()}`,description:form.description,price:priceValue,preparationDays:preparationDaysValue,category:'General',categories:form.categories.split(',').map(s=>s.trim()).filter(Boolean),tags:form.tagsInput.split(',').map(s=>s.trim()).filter(Boolean),imageUrls:[form.imageUrl],stockStatus:'in_stock',featured:existing?.featured||false,vendorId:form.vendorId||undefined,vendorName:selectedVendor?.name||existing?.vendorName,vendorContactPerson:selectedVendor?.contactPerson||existing?.vendorContactPerson,vendorPhone:selectedVendor?.phone||existing?.vendorPhone,vendorEmail:selectedVendor?.email||existing?.vendorEmail,vendorLocation:selectedVendor?.location||existing?.vendorLocation,vendorLatitude:selectedVendor?.vendorLatitude ?? existing?.vendorLatitude,vendorLongitude:selectedVendor?.vendorLongitude ?? existing?.vendorLongitude,createdAt:existing?.createdAt||now,updatedAt:now,status:form.status};

    const res=await fetch('/api/admin/products',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    const d=await res.json();
    if(res.ok){
      setProducts(d.products||[]);
      setMessage('Saved item.');
      setEditingId(null);
      setForm(emptyItemForm);
      return;
    }

    setMessage(`Failed saving item: ${normalizeApiError(d?.error)}`);
  }
  async function saveVendor(e:FormEvent){ e.preventDefault(); const now=new Date().toISOString(); const payload={...vendorForm,id:vendorForm.id||crypto.randomUUID(),createdAt:vendorForm.createdAt||now,updatedAt:now}; const res=await fetch('/api/admin/vendors',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}); const d=await res.json(); if(res.ok){setVendors(d.vendors||[]); setVendorForm({id:'',name:'',contactPerson:'',phone:'',email:'',location:'',vendorLatitude: undefined,vendorLongitude: undefined,notes:'',status:'active',createdAt:'',updatedAt:''});}}
  async function updateStatus(id:string,status:OrderStatus){ await fetch('/api/admin/orders',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,status})}); await fetchOrders(); }

  return <div className='space-y-4'>
    <div className='flex gap-2'>{(['vendors','items','orders','users'] as const).map(t=><button key={t} onClick={()=>setTab(t)} className={`rounded px-3 py-2 ${tab===t?'bg-ink text-white':'bg-white border'}`}>{t[0].toUpperCase()+t.slice(1)}</button>)}</div>
    {tab==='vendors' && <div className='grid gap-4 md:grid-cols-2'><form onSubmit={saveVendor} className='space-y-2 rounded border p-3 bg-white'>{(['name','contactPerson','phone','email','location','notes'] as const).map((k)=><input key={k} placeholder={k} value={vendorForm[k] || ''} onChange={e=>setVendorForm({...vendorForm,[k]:e.target.value})} className='w-full rounded border p-2'/>) }<VendorLocationMap latitude={vendorForm.vendorLatitude} longitude={vendorForm.vendorLongitude} onChange={(coords)=>setVendorForm((prev)=>({ ...prev, ...coords }))} /><div className='grid grid-cols-2 gap-2'><input type='number' step='any' placeholder='Latitude' value={vendorForm.vendorLatitude ?? ''} onChange={e=>setVendorForm({...vendorForm,vendorLatitude:e.target.value===''?undefined:Number(e.target.value)})} className='w-full rounded border p-2'/><input type='number' step='any' placeholder='Longitude' value={vendorForm.vendorLongitude ?? ''} onChange={e=>setVendorForm({...vendorForm,vendorLongitude:e.target.value===''?undefined:Number(e.target.value)})} className='w-full rounded border p-2'/></div><select value={vendorForm.status} onChange={e=>setVendorForm({...vendorForm,status:e.target.value as 'active' | 'inactive'})} className='w-full rounded border p-2'><option value='active'>active</option><option value='inactive'>inactive</option></select><button className='rounded bg-ink px-3 py-2 text-white'>Save vendor</button></form><div className='space-y-2'>{vendors.map(v=><div key={v.id} className='rounded border bg-white p-2 text-sm'><div className='flex justify-between'><b>{v.name}</b><span className={v.status==='active'?'text-green-600':'text-gray-500'}>{v.status}</span></div><p>{v.contactPerson} · {v.phone}</p><p className='text-xs text-gray-600'>Coords: {v.vendorLatitude ?? '—'}, {v.vendorLongitude ?? '—'}</p><div className='flex gap-3'><button onClick={()=>setVendorForm(v)} className='text-blue-700'>Edit</button><button onClick={async()=>{if(confirm('Delete vendor?')){await fetch(`/api/admin/vendors?id=${v.id}`,{method:'DELETE',});await fetchVendors();}}} className='text-red-700'>Delete</button></div></div>)}</div></div>}
    {tab==='items' && <div className='space-y-4'><form onSubmit={saveItem} className='space-y-2 rounded border bg-white p-3'><input placeholder='Item name' value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className='w-full rounded border p-2'/><textarea placeholder='Description' value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className='w-full rounded border p-2'/><input type='number' placeholder='Enter price in UGX' value={form.price} onChange={e=>setForm({...form,price:e.target.value})} className='w-full rounded border p-2'/><label className='block space-y-1'><span className='text-sm font-medium text-gray-700'>Days to prepare before delivery</span><input type='number' min='0' max='30' step='1' placeholder='Days to prepare' value={form.preparationDays} onChange={e=>setForm({...form,preparationDays:e.target.value})} className='w-full rounded border p-2'/></label><input placeholder='Hosted HTTPS image URL or selected uploaded image' value={form.imageUrl} onChange={e=>setForm({...form,imageUrl:e.target.value})} className='w-full rounded border p-2'/><p className='text-xs text-gray-600'>Use a hosted HTTPS image URL or choose an image file. Selected files are uploaded to S3 by the admin API when you save.</p><input type='file' accept='image/*' onChange={onImageFileChange} className='w-full rounded border p-2'/><input placeholder='Tags (comma-separated)' value={form.tagsInput} onChange={e=>setForm({...form,tagsInput:e.target.value})} className='w-full rounded border p-2'/><input placeholder='Categories (comma-separated)' value={form.categories} onChange={e=>setForm({...form,categories:e.target.value})} className='w-full rounded border p-2'/><label className='block space-y-1'><span className='text-sm font-medium text-gray-700'>Item status</span><select value={form.status} onChange={e=>setForm({...form,status:e.target.value as 'active' | 'inactive'})} className='w-full rounded border p-2'><option value='active'>active - show on platform</option><option value='inactive'>inactive - hide from platform</option></select></label><select value={form.vendorId} onChange={e=>setForm({...form,vendorId:e.target.value})} className='w-full rounded border p-2'><option value=''>Select active vendor</option>{activeVendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select>{selectedVendor&&<p className='text-sm text-gray-600'>{selectedVendor.contactPerson} · {selectedVendor.phone} · {selectedVendor.email} · {selectedVendor.location}</p>}<button className='rounded bg-ink px-3 py-2 text-white'>Save item</button></form>{form.imageUrl&&<Image src={form.imageUrl} alt='preview' width={200} height={100} unoptimized/>}<div className='space-y-2'>{products.map(p=><div key={p.id} className='rounded border bg-white p-2 flex justify-between'><div><b>{p.name}</b><p className='text-xs'>Vendor: {getProductVendorLabel(p)}</p><p className='text-xs text-gray-600'>Prepare: {p.preparationDays ?? 2} day(s)</p><p className={(p.status ?? 'active')==='active'?'text-xs text-green-700':'text-xs text-gray-500'}>Status: {p.status ?? 'active'}</p></div><div className='flex gap-2'><button onClick={()=>{setEditingId(p.id);setForm({name:p.name,description:p.description,price:String(p.price),preparationDays:String(p.preparationDays ?? 2),imageUrl:p.imageUrls[0]||'',vendorId:p.vendorId||'',tagsInput:(p.tags||[]).join(','),categories:(p.categories||[]).join(','),status:p.status ?? 'active'});}} className='text-blue-700'>Edit</button><button onClick={async()=>{if(!confirm('Delete item?')) return; const res = await fetch(`/api/admin/products?id=${p.id}`,{method:'DELETE',}); let body: { error?: string } | null = null; try { body = await res.json(); } catch { body = null; } if(!res.ok){ setMessage(body?.error ? `Failed deleting item: ${body.error}` : 'Failed deleting item.'); return; } setProducts(prev => prev.filter(x=>x.id!==p.id)); try { await refreshProducts(); setMessage('Item deleted.'); } catch (error) { setMessage(error instanceof Error ? `Item deleted, but refresh failed: ${error.message}` : 'Item deleted, but refresh failed.'); }} } className='text-red-700'>Delete</button></div></div>)}</div></div>}

    {tab==='users' && <div className='space-y-4 rounded border bg-white p-3'>
      <form className='flex gap-2' onSubmit={(e)=>{e.preventDefault(); void fetchUsers();}}><input value={userSearch} onChange={e=>setUserSearch(e.target.value)} placeholder='Search users by email or name' className='min-w-0 flex-1 rounded border p-2'/><button className='rounded bg-ink px-3 py-2 text-white'>Search</button></form>
      {users.map(user => <div key={user.userId} className='rounded border p-3 text-sm'><div className='flex flex-wrap items-start justify-between gap-3'><div><b>{user.name || user.email}</b><p className='text-xs text-gray-600'>{user.email}</p><p className='text-xs text-gray-600'>Status: {user.status}</p><p className='text-xs'>Roles: {user.roles.map(r=>r.role).join(', ') || 'USER'}</p></div><div className='flex flex-wrap gap-2'>{(['VENDOR_ADMIN','SUPER_ADMIN'] as UserRole[]).map(role => <button key={role} className='rounded border px-2 py-1' onClick={async()=>{await fetch('/api/admin/roles',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId:user.userId,role})}); await fetchUsers();}}>Grant {role}</button>)}{user.roles.map(role => <button key={role.role} className='rounded border border-red-300 px-2 py-1 text-red-700' onClick={async()=>{await fetch('/api/admin/roles',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({userId:user.userId,role:role.role})}); await fetchUsers();}}>Revoke {role.role}</button>)}</div></div></div>)}
    </div>}
    {tab==='orders' && <div className='space-y-4'><div className='flex gap-2'><button className='rounded border px-2 py-1' onClick={()=>fetchOrders('active')}>Active orders</button><button className='rounded border px-2 py-1' onClick={()=>fetchOrders('closed')}>Closed orders</button><button className='rounded border px-2 py-1' onClick={()=>fetchOrders()}>All</button></div>{orders.map(o=>{ return <div key={o.id} className='rounded border bg-white p-3 text-sm'><div className='mb-1 flex justify-between'><span><b>Order ID:</b> {o.id} · <b>Order datetime:</b> {formatOrderDateTime(o.createdAt)}</span><span>{o.status}</span></div><p><b>Recipient name:</b> {o.recipientName} · <b>Recipient contact:</b> {o.recipientPhone} · {o.email}</p><p><b>Recipient location:</b> {o.region}{o.cityId && o.cityId !== 'delivery-pin' ? `/${o.cityId}` : ''}{o.deliveryPinUrl ? ` · ${o.deliveryPinUrl}` : ''}</p><p><b>Order items:</b> {(o.items||[]).map(i=>`${i.name||i.productId} x${i.quantity}`).join(', ')||'No items'}</p>{/* Delivery fees are now factored into product prices. <p><b>Estimated delivery fee:</b> hidden</p> */}<p><b>Order total:</b> {o.totalAmount ?? 'N/A'}</p><select value={statusOptions.includes(o.status)?o.status:'new'} onChange={e=>updateStatus(o.id,e.target.value as OrderStatus)} className='rounded border p-1'>{statusOptions.map(s=><option key={s} value={s}>{s}</option>)}</select>{activeStatuses.includes(o.status)?<span className='ml-2 text-orange-600'>Active</span>:<span className='ml-2 text-green-700'>Closed</span>}</div>;})}</div>}
    <p className='text-sm text-gray-600'>{message}</p>
  </div>;
}
