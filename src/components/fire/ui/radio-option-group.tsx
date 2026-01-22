'use client';

import { retro } from './theme';
import { Label } from './label';

export interface RadioOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  content?: React.ReactNode; // Extra content shown when this option is selected
}

interface RadioOptionGroupProps<T extends string> {
  label: string;
  value: T | null;
  options: RadioOption<T>[];
  onChange: (value: T) => void;
  error?: string;
}

export function RadioOptionGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
}: RadioOptionGroupProps<T>) {
  return (
    <div
      className="p-3 rounded-sm space-y-3"
      style={{
        backgroundColor: retro.surfaceLight,
        border: `1px solid ${error ? '#c53030' : retro.border}`,
      }}
    >
      <Label variant="muted" className="block text-xs uppercase tracking-wide">
        {label}
      </Label>

      {options.map((option, index) => (
        <div key={option.value}>
          {index > 0 && (
            <div
              className="mb-3"
              style={{ borderTop: `1px solid ${retro.border}`, marginTop: '-4px' }}
            />
          )}

          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => onChange(option.value)}
              className="flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 mt-0.5"
              style={{
                backgroundColor: value === option.value ? retro.accent : 'transparent',
                border: `2px solid ${value === option.value ? retro.accent : retro.border}`,
              }}
            >
              {value === option.value && (
                <span className="w-2 h-2 rounded-full bg-white" />
              )}
            </button>
            <div
              className="flex-1 cursor-pointer"
              onClick={() => onChange(option.value)}
            >
              <p className="text-sm font-medium" style={{ color: retro.text }}>
                {option.label}
              </p>
              {option.description && (
                <p className="text-xs" style={{ color: retro.muted }}>
                  {option.description}
                </p>
              )}
            </div>
          </div>

          {/* Show extra content when this option is selected */}
          {value === option.value && option.content && (
            <div className="pl-8 pt-2">
              {option.content}
            </div>
          )}
        </div>
      ))}

      {error && (
        <p className="text-xs" style={{ color: '#c53030' }}>
          {error}
        </p>
      )}
    </div>
  );
}
