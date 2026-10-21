'use client';

import { countGraphemes, truncateGraphemes, type ResolvedCustomField } from '@/lib/customization';

type CustomFieldsFormProps = {
  fields: ResolvedCustomField[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
};

export function customFieldInputId(index: number) {
  return `custom-field-${index}`;
}

export function CustomFieldsForm({ fields, values, onChange }: CustomFieldsFormProps) {
  if (!fields.length) return null;

  return (
    <fieldset className="rounded-xl border border-blush bg-white p-5">
      <legend className="px-1 text-lg font-semibold text-ink">Personalise it</legend>
      <p className="mt-1 text-sm text-gray-600">Type the message for each part exactly as you want it to appear.</p>

      <div className="mt-4 space-y-3">
        {fields.map((field, index) => {
          const id = customFieldInputId(index);
          const value = values[field.name] ?? '';
          const used = countGraphemes(value);
          const isFull = used >= field.maxLength;

          return (
            <div key={field.name}>
              <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-sm font-medium text-ink">
                <span>
                  {field.name}
                  {field.required ? (
                    <span className="text-pink-700" aria-hidden="true">
                      {' '}
                      *
                    </span>
                  ) : (
                    <span className="font-normal text-gray-500"> (optional)</span>
                  )}
                </span>
                <span id={`${id}-count`} className={`text-xs tabular-nums ${isFull ? 'font-semibold text-pink-700' : 'text-gray-500'}`}>
                  {used}/{field.maxLength}
                </span>
              </label>
              <input
                id={id}
                type="text"
                value={value}
                placeholder={field.placeholder}
                required={field.required}
                aria-required={field.required}
                aria-describedby={`${id}-count`}
                autoComplete="off"
                onChange={(e) => onChange(field.name, truncateGraphemes(e.target.value, field.maxLength))}
                className="mt-1 w-full rounded-md border border-blush px-3 py-2 text-ink focus:border-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-700/30"
              />
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
