'use client';

import { useEffect } from 'react';
import { trackEcommerce } from '@/lib/analytics';

export function TrackViewItem({ id, name, price, category }: { id: string; name: string; price: number; category?: string }) {
  useEffect(() => {
    trackEcommerce('view_item', {
      items: [{ item_id: id, item_name: name, price, quantity: 1, ...(category ? { item_category: category } : {}) }]
    });
  }, [id, name, price, category]);

  return null;
}
