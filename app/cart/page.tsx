import { CartClient } from '@/components/cart-client';

export const metadata = {
  title: 'Cart',
  robots: { index: false, follow: false }
};

export default function CartPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Your cart</h1>
      <CartClient />
    </div>
  );
}
