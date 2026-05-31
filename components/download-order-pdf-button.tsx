'use client';

export function DownloadOrderPdfButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded border border-ink px-4 py-2 text-ink hover:bg-ink hover:text-white print:hidden"
    >
      Download / save PDF receipt
    </button>
  );
}
