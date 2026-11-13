'use client';

import { ChangeEvent, useState } from 'react';
import Image from 'next/image';
import { isDataImageUrl, REFERENCE_IMAGES_MAX } from '@/lib/product-images';

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Admin-only: the photo(s) a product image was created from. Never shown to customers.
export function ReferenceImagesField({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState('');
  const remaining = REFERENCE_IMAGES_MAX - value.length;

  async function addFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setError('');
    if (files.length > remaining) setError(`Only ${REFERENCE_IMAGES_MAX} reference images per product; extra files were skipped.`);
    const dataUrls = await Promise.all(files.slice(0, Math.max(remaining, 0)).map(readAsDataUrl));
    onChange([...value, ...dataUrls.filter(Boolean)]);
  }

  function addUrl() {
    const url = urlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) return setError('Reference URL must start with http:// or https://');
    if (remaining <= 0) return setError(`Only ${REFERENCE_IMAGES_MAX} reference images per product.`);
    if (value.includes(url)) return setError('That reference image is already added.');
    setError('');
    onChange([...value, url]);
    setUrlInput('');
  }

  return (
    <fieldset className="rounded border border-dashed border-amber-400 bg-amber-50/60 p-3 md:col-span-2">
      <legend className="px-1 text-sm font-medium">
        Reference image <span className="ml-1 rounded bg-amber-200 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900">Internal only</span>
      </legend>
      <p className="text-xs text-gray-600">
        The photo you used to create the product image (supplier photo, inspiration, etc.). Admins only - customers never see it. Up to {REFERENCE_IMAGES_MAX}.
      </p>
      <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto_auto]">
        <input
          className="rounded border bg-white p-2"
          placeholder="Paste a reference image URL"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addUrl();
            }
          }}
        />
        <button type="button" className="rounded border bg-white px-3 py-2 text-sm disabled:opacity-50" onClick={addUrl} disabled={remaining <= 0}>
          Add URL
        </button>
        <label className={`rounded border bg-white px-3 py-2 text-center text-sm ${remaining <= 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'}`}>
          Upload file(s)
          <input type="file" accept="image/*" multiple className="hidden" onChange={addFiles} disabled={remaining <= 0} />
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      {value.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-3">
          {value.map((src, index) => {
            const pending = isDataImageUrl(src);
            return (
              <li key={`${index}-${src.slice(0, 64)}`} className="w-36 rounded border bg-white p-1.5 text-xs">
                {pending ? (
                  <Image src={src} alt={`Reference image ${index + 1}`} width={140} height={100} unoptimized className="h-24 w-full rounded object-cover" />
                ) : (
                  <a href={src} target="_blank" rel="noopener noreferrer" title="Open full size">
                    <Image src={src} alt={`Reference image ${index + 1}`} width={140} height={100} unoptimized className="h-24 w-full rounded object-cover" />
                  </a>
                )}
                <div className="mt-1 flex items-center justify-between gap-1">
                  {pending ? (
                    <span className="text-gray-500">Saves with product</span>
                  ) : (
                    <a href={src} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                      Open
                    </a>
                  )}
                  <button type="button" className="text-red-700 hover:underline" onClick={() => onChange(value.filter((_, i) => i !== index))}>
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-gray-500">No reference image yet.</p>
      )}
    </fieldset>
  );
}
