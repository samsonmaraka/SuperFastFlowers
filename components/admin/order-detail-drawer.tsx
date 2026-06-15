import type { OrderRequest } from '@/lib/types';
export function OrderDetailDrawer({ order }: { order: OrderRequest }) {
  return <pre className="max-h-96 overflow-auto rounded bg-gray-50 p-3 text-xs">{JSON.stringify(order, null, 2)}</pre>;
}
