'use client';
import Image from 'next/image';
export function ProductImagePreview({src}:{src?:string}){ if(!src) return <div className="flex h-28 items-center justify-center rounded border border-dashed text-sm text-gray-500">Image preview</div>; return <Image src={src} alt="Product preview" width={220} height={140} unoptimized className="max-h-36 rounded object-cover"/>; }
