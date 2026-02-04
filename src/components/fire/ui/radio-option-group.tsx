'use client';

import { colors } from './theme';
import { cn } from '@/lib/utils';
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
      className="p-3 rounded-lg space-y-3"
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${error ? colors.negative : colors.border}`,
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
              style={{ borderTop: `1px solid ${colors.border}`, marginTop: '-4px' }}
            />
          )}

          <div
            className={cn(
              'flex items-start gap-3 rounded-md p-2 -m-2 cursor-pointer',
              'transition-colors duration-150',
              value !== option.value && 'hover:bg-white/[0.03]',
            )}
            onClick={() => onChange(option.value)}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(option.value); }}
              className={cn(
                'flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 mt-0.5',
                'transition-all duration-150 outline-none',
                'focus-visible:ring-2 focus-visible:ring-[#5E6AD2]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#141415]',
                value !== option.value && 'hover:border-white/[0.25]',
              )}
              style={{
                backgroundColor: value === option.value ? colors.accent : 'transparent',
                border: `2px solid ${value === option.value ? colors.accent : 'rgba(255,255,255,0.15)'}`,
              }}
            >
              {value === option.value && (
                <span className="w-2 h-2 rounded-full bg-white" />
              )}
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: colors.text }}>
                {option.label}
              </p>
              {option.description && (
                <p className="text-xs" style={{ color: colors.muted }}>
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
        <p className="text-xs" style={{ color: colors.negative }}>
          {error}
        </p>
      )}
    </div>
  );
}
