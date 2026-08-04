import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-blush bg-white py-8 text-center text-sm text-gray-600">
      <nav className="mb-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <Link href="/about" className="hover:text-pink-700 hover:underline">
          About Us
        </Link>
        <Link href="/contact" className="hover:text-pink-700 hover:underline">
          Contact
        </Link>
        <Link href="/cancellation-refund-policy" className="hover:text-pink-700 hover:underline">
          Cancellation &amp; Refund Policy
        </Link>
      </nav>
      <p>© {new Date().getFullYear()} Sendagift UG. Thoughtful gifting made simple.</p>
    </footer>
  );
}
