'use client';

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react';
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
  const [dragging, setDragging] = useState(false);
  // dragenter/dragleave fire for every child element; count them so the
  // highlight doesn't flicker while the pointer moves across the box.
  const dragDepth = useRef(0);
  const remaining = REFERENCE_IMAGES_MAX - value.length;

  // A file dropped just outside the box would make the browser open it and
  // throw away unsaved edits in the product form, so swallow those drops.
  useEffect(() => {
    const blockFileDrop = (event: globalThis.DragEvent) => {
      // Leave native file inputs (e.g. the product image picker) working.
      if (event.target instanceof HTMLInputElement && event.target.type === 'file') return;
      if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
    };
    window.addEventListener('dragover', blockFileDrop);
    window.addEventListener('drop', blockFileDrop);
    return () => {
      window.removeEventListener('dragover', blockFileDrop);
      window.removeEventListener('drop', blockFileDrop);
    };
  }, []);

  async function addFileList(fileList: FileList | File[]) {
    const all = Array.from(fileList);
    const files = all.filter((file) => file.type.startsWith('image/'));
    if (!all.length) return;
    if (!files.length) return setError('Only image files can be added as a reference.');
    if (remaining <= 0) return setError(`Only ${REFERENCE_IMAGES_MAX} reference images per product.`);
    setError(files.length > remaining ? `Only ${REFERENCE_IMAGES_MAX} reference images per product; extra files were skipped.` : files.length < all.length ? 'Non-image files were skipped.' : '');
    const dataUrls = await Promise.all(files.slice(0, remaining).map(readAsDataUrl));
    onChange([...value, ...dataUrls.filter(Boolean)]);
  }

  async function addFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    await addFileList(files);
  }

  function onDragEnter(e: DragEvent) {
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = remaining > 0 ? 'copy' : 'none';
  }

  async function onDrop(e: DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (e.dataTransfer.files.length) return addFileList(e.dataTransfer.files);
    // An image dragged from another browser tab arrives as a link, not a file.
    const droppedUrl = (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')).split('\n').map((line) => line.trim()).find((line) => line && !line.startsWith('#'));
    if (droppedUrl) addUrl(droppedUrl);
  }

  function addUrl(input = urlInput) {
    const url = input.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) return setError('Reference URL must start with http:// or https://');
    if (remaining <= 0) return setError(`Only ${REFERENCE_IMAGES_MAX} reference images per product.`);
    if (value.includes(url)) return setError('That reference image is already added.');
    setError('');
    onChange([...value, url]);
    if (input === urlInput) setUrlInput('');
  }

  return (
    <fieldset
      className={`rounded border-2 border-dashed p-3 transition-colors md:col-span-2 ${dragging ? 'border-amber-500 bg-amber-100' : 'border-amber-400 bg-amber-50/60'}`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <legend className="px-1 text-sm font-medium">
        Reference image <span className="ml-1 rounded bg-amber-200 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900">Internal only</span>
      </legend>
      <p className="text-xs text-gray-600">
        The photo you used to create the product image (supplier photo, inspiration, etc.). Admins only - customers never see it. Up to {REFERENCE_IMAGES_MAX}.
      </p>
      <div
        className={`mt-2 flex flex-col items-center justify-center rounded-lg border border-dashed px-3 py-5 text-center text-sm ${dragging ? 'border-amber-600 bg-white text-amber-900' : 'border-amber-300 bg-white/70 text-gray-600'}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="mb-1 h-7 w-7 text-amber-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4m0 0-4 4m4-4 4 4" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        {remaining <= 0 ? (
          <span>Maximum of {REFERENCE_IMAGES_MAX} reached - remove one to add another.</span>
        ) : dragging ? (
          <span className="font-semibold">Drop to add as reference image</span>
        ) : (
          <span>
            <span className="font-semibold text-ink">Drag &amp; drop</span> reference image(s) here, or use the buttons below
          </span>
        )}
      </div>
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
        <button type="button" className="rounded border bg-white px-3 py-2 text-sm disabled:opacity-50" onClick={() => addUrl()} disabled={remaining <= 0}>
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
