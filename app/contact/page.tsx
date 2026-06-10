export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <h1 className="text-3xl font-semibold">Contact us</h1>
      <p className="text-gray-700">
        Email:{' '}
        <a href="mailto:maramson@gmail.com" className="text-pink-700">
          maramson@gmail.com
        </a>
      </p>
      <p className="text-gray-700">
        Phone:{' '}
        <a href="tel:+256774924285" className="text-pink-700">
          +256774924285
        </a>
      </p>
    </div>
  );
}
