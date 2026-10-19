'use client';

import { useEffect } from 'react';
import { trackPurchaseOnce, type GaItem } from '@/lib/analytics';

export function TrackPurchase({ transactionId, items, value, shipping }: { transactionId: string; items: GaItem[]; value: number; shipping: number }) {
  useEffect(() => {
    trackPurchaseOnce(transactionId, { items, value, shipping });
    // Fire once per order; items is a fresh array on every server render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);

  return null;
}
