'use client';

import type { Flavour, FlavourId } from '@/lib/flavours';

type FlavourPickerProps = {
  options: Flavour[];
  value: FlavourId | null;
  onChange: (flavour: FlavourId) => void;
  name?: string;
};

export function FlavourPicker({ options, value, onChange, name = 'flavour' }: FlavourPickerProps) {
  if (!options.length) return null;

  return (
    <fieldset className="rounded-xl border border-blush bg-white p-5">
      <legend className="px-1 text-lg font-semibold text-ink">Choose your flavour</legend>
      <p className="mt-1 text-sm text-gray-600">
        Every box is a single flavour. Pick one to continue &mdash; nothing is chosen for you.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((flavour) => {
          const isSelected = value === flavour.id;

          return (
            <label
              key={flavour.id}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm transition focus-within:ring-2 focus-within:ring-pink-700/40 focus-within:ring-offset-2 ${
                isSelected
                  ? 'border-pink-700 bg-pink-700 font-semibold text-white'
                  : 'border-blush bg-white text-ink hover:border-pink-700 hover:text-pink-700'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={flavour.id}
                checked={isSelected}
                onChange={() => onChange(flavour.id)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className="h-4 w-4 shrink-0 rounded-full border border-black/10"
                style={{ backgroundColor: flavour.swatch }}
              />
              {flavour.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
