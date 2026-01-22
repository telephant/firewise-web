'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { retro, retroStyles } from './theme';
import { cn } from '@/lib/utils';
import { IconChevronDown } from './icons';

export interface SelectProps {
  label?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  disabled?: boolean;
  className?: string;
  error?: string;
  hint?: string;
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ className, label, options, placeholder, value, onChange, disabled, error, hint }, ref) => {
    const hasError = !!error;

    const handleValueChange = (newValue: string) => {
      onChange?.({ target: { value: newValue } });
    };

    return (
      <div className="w-full">
        {label && (
          <label
            className="text-xs uppercase tracking-wide block mb-1 font-medium"
            style={{ color: hasError ? '#c53030' : retro.text }}
          >
            {label}
          </label>
        )}
        <SelectPrimitive.Root value={value} onValueChange={handleValueChange} disabled={disabled}>
          <SelectPrimitive.Trigger
            ref={ref}
            className={cn(
              'w-full px-3 py-2 rounded-sm text-sm text-left flex items-center justify-between gap-2',
              'focus:outline-none focus:ring-1',
              disabled && 'opacity-50 cursor-not-allowed',
              hasError && 'animate-shake',
              className
            )}
            style={{
              ...retroStyles.sunken,
              color: value ? retro.text : retro.muted,
              ...(hasError ? {
                borderColor: '#c53030',
                boxShadow: 'inset 2px 2px 0 rgba(197, 48, 48, 0.2)',
              } : {}),
            }}
          >
            <SelectPrimitive.Value placeholder={placeholder || 'Select...'} />
            <SelectPrimitive.Icon asChild>
              <span style={{ color: retro.muted }}>
                <IconChevronDown size={12} />
              </span>
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              className="z-[9999] rounded-sm overflow-hidden max-h-48 overflow-y-auto"
              style={{
                backgroundColor: retro.surface,
                border: `2px solid ${retro.border}`,
                boxShadow: `3px 3px 0 ${retro.bevelDark}`,
              }}
              position="popper"
              sideOffset={4}
            >
              <SelectPrimitive.Viewport>
                {options.length === 0 ? (
                  <div
                    className="px-3 py-2 text-xs"
                    style={{ color: retro.muted }}
                  >
                    No options available
                  </div>
                ) : (
                  options.map((option) => (
                    <SelectPrimitive.Item
                      key={option.value}
                      value={option.value}
                      className={cn(
                        'px-3 py-2 text-sm cursor-pointer transition-colors outline-none',
                        'data-[highlighted]:bg-[var(--accent)] data-[highlighted]:text-white',
                        'data-[state=checked]:bg-[var(--surface-light)]'
                      )}
                      style={{
                        '--accent': retro.accent,
                        '--surface-light': retro.surfaceLight,
                        color: retro.text,
                      } as React.CSSProperties}
                    >
                      <div className="flex items-center gap-2">
                        <SelectPrimitive.ItemIndicator>
                          <span className="text-xs">✓</span>
                        </SelectPrimitive.ItemIndicator>
                        <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                      </div>
                    </SelectPrimitive.Item>
                  ))
                )}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>

        {/* Error message */}
        {hasError && (
          <div className="mt-1.5 flex items-start gap-1.5 text-xs">
            <span
              className="flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[9px] font-bold mt-0.5"
              style={{ backgroundColor: '#c53030' }}
            >
              !
            </span>
            <span style={{ color: '#c53030' }}>{error}</span>
          </div>
        )}
        {/* Hint text */}
        {hint && !hasError && (
          <p className="mt-1 text-xs" style={{ color: retro.muted }}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
