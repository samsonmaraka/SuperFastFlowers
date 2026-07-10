import Image from 'next/image';

// Mirrors images.remotePatterns in next.config.mjs. Sources outside these
// hosts (data: URI placeholders, admin-entered hosts) must bypass the image
// optimizer or next/image rejects them at request time.
const OPTIMIZABLE_HOST_PATTERNS = [/\.amazonaws\.com$/, /^images\.unsplash\.com$/, /\.googleusercontent\.com$/];

function isOptimizableSrc(src: string) {
  if (!src.startsWith('https://')) {
    return false;
  }

  try {
    const { hostname } = new URL(src);
    return OPTIMIZABLE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
}

type ProductImageProps = {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

export function ProductImage({ src, alt, sizes, priority, className }: ProductImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!isOptimizableSrc(src)}
      className={className}
    />
  );
}
