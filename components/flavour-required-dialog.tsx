'use client';

import { useEffect, useRef } from 'react';
import type { Flavour } from '@/lib/flavours';

type FlavourRequiredDialogProps = {
  open: boolean;
  onClose: () => void;
  options: Flavour[];
  productName: string;
};

// Shown when someone tries to send a gift before picking a flavour. The dialog
// repeats the flavour picker as a non-interactive preview so the message points at
// the exact control they need, then hands focus back to the real picker on close.
export function FlavourRequiredDialog({ open, onClose, options, productName }: FlavourRequiredDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    confirmRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      // Keep tabbing inside the dialog while it is open.
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])');
      if (!focusables?.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="flavour-required-title"
        aria-describedby="flavour-required-description"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-blush bg-white p-6 shadow-2xl shadow-ink/20"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-50 text-xl"
          >
            🧁
          </span>
          <div className="min-w-0">
            <h2 id="flavour-required-title" className="text-lg font-semibold text-ink">
              Pick a flavour first
            </h2>
            <p id="flavour-required-description" className="mt-1 text-sm text-gray-600">
              Every box of {productName} is a single flavour, so we need to know which one before we can send it.
            </p>
          </div>
        </div>

        {/* A picture of the control to look for, not a working copy of it. */}
        <figure className="mt-5">
          <div aria-hidden="true" className="rounded-xl border border-dashed border-pink-700/50 bg-cream/60 p-3">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-pink-700">Choose your flavour</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {options.slice(0, 8).map((flavour) => (
                <span
                  key={flavour.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-blush bg-white px-2 py-1 text-xs text-ink"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                    style={{ backgroundColor: flavour.swatch }}
                  />
                  {flavour.label}
                </span>
              ))}
              {options.length > 8 ? (
                <span className="inline-flex items-center rounded-full border border-blush bg-white px-2 py-1 text-xs text-gray-500">
                  +{options.length - 8} more
                </span>
              ) : null}
            </div>
          </div>
          <figcaption className="mt-2 text-xs text-gray-600">
            Look for this panel on the page, tap one of the chips, then send your gift.
          </figcaption>
        </figure>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/40 focus:outline-none focus:ring-2 focus:ring-pink-700/40 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onClose}
            className="rounded-md bg-pink-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-700/20 transition hover:bg-ink focus:outline-none focus:ring-2 focus:ring-pink-700/40 focus:ring-offset-2"
          >
            Take me to the flavours
          </button>
        </div>
      </div>
    </div>
  );
}
