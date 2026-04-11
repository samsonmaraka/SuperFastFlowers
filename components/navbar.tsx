import Link from 'next/link';

const links = [
  ['Shop', '/shop'],
  ['About', '/about'],
  ['Contact', '/contact'],
  ['Admin', '/admin'],
  ['Cart', '/cart']
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-blush bg-cream/95 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          Giftora
        </Link>
        <ul className="flex gap-4 text-sm font-medium">
          {links.map(([label, href]) => (
            <li key={href}>
              <Link href={href} className="hover:text-pink-700">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
