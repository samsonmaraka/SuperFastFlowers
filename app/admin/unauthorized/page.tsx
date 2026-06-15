import Link from 'next/link';

export default function AdminUnauthorizedPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-3 text-3xl font-semibold">Unauthorized</h1>
      <p className="mb-6 text-ink/70">A SUPER_ADMIN role is required to access the admin backend.</p>
      <Link href="/" className="rounded bg-ink px-4 py-2 font-semibold text-white">Return to shop</Link>
    </div>
  );
}
