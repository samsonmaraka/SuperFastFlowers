'use client';

import { useEffect } from 'react';
import { queueProductEvent, resetPageImpressions } from '@/lib/product-events';
import { RANKING_SEED_COOKIE, RANKING_SEED_MAX_AGE_SECONDS } from '@/lib/product-ranking';

// Counts an impression when a product card is at least half on screen, and
// stores the ranking seed the server used so this visitor keeps the same order
// while they browse. Render once per page that shows a product grid.
export function ProductImpressionTracker({ seed, pageKey }: { seed: number; pageKey: string }) {
  useEffect(() => {
    try {
      if (!document.cookie.split('; ').some((part) => part.startsWith(`${RANKING_SEED_COOKIE}=`))) {
        document.cookie = `${RANKING_SEED_COOKIE}=${seed}; Max-Age=${RANKING_SEED_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
      }
    } catch {
      // Cookies blocked: the visitor just gets a fresh order each page load.
    }
  }, [seed]);

  useEffect(() => {
    resetPageImpressions();
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const productId = (entry.target as HTMLElement).dataset.productId;
          if (productId) queueProductEvent('impression', productId);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.5 }
    );

    document.querySelectorAll<HTMLElement>('[data-product-id]').forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [pageKey]);

  return null;
}
