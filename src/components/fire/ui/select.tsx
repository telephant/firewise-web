'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { colors } from './theme';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

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
            style={{ color: hasError ? colors.negative : colors.text }}
          >
            {label}
          </label>
        )}
        <SelectPrimitive.Root value={value} onValueChange={handleValueChange} disabled={disabled}>
          <SelectPrimitive.Trigger
            ref={ref}
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm text-left flex items-center justify-between gap-2',
              'outline-none transition-all duration-150',
              'border bg-[#1C1C1E]',
              hasError
                ? 'border-[#F87171]'
                : 'border-white/[0.08] hover:border-white/[0.15]',
              'focus:border-[#5E6AD2]/60 focus:ring-2 focus:ring-[#5E6AD2]/20',
              'data-[state=open]:border-[#5E6AD2]/60 data-[state=open]:ring-2 data-[state=open]:ring-[#5E6AD2]/20',
              disabled && 'opacity-50 cursor-not-allowed',
              hasError && 'animate-shake',
              className
            )}
            style={{
              color: value ? colors.text : colors.muted,
            }}
          >
            <SelectPrimitive.Value placeholder={placeholder || 'Select...'} />
            <SelectPrimitive.Icon asChild>
              <ChevronDown size={14} strokeWidth={1.5} className="text-[#7C7C82] transition-transform duration-150" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              className="z-[9999] rounded-lg"
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                boxShadow: '0 8px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
                width: 'var(--radix-select-trigger-width)',
                maxHeight: 'var(--radix-select-content-available-height, 240px)',
              }}
              position="popper"
              sideOffset={4}
            >
              <SelectPrimitive.Viewport className="p-1 max-h-[240px] overflow-y-auto">
                {options.length === 0 ? (
                  <div
                    className="px-3 py-2 text-xs"
                    style={{ color: colors.muted }}
                  >
                    No options available
                  </div>
                ) : (
                  options.map((option) => (
                    <SelectPrimitive.Item
                      key={option.value}
                      value={option.value}
                      className={cn(
                        'px-3 py-2 text-sm cursor-pointer rounded-md mx-0.5 outline-none',
                        'transition-colors duration-100',
                        'data-[highlighted]:bg-white/[0.06]',
                        'data-[state=checked]:text-white',
                      )}
                      style={{ color: colors.text }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-4 flex-shrink-0 flex items-center justify-center">
                          <SelectPrimitive.ItemIndicator>
                            <Check size={12} strokeWidth={2} style={{ color: colors.accent }} />
                          </SelectPrimitive.ItemIndicator>
                        </span>
                        <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                      </div>
                    </SelectPrimitive.Item>
                  ))
                )}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>

        {hasError && (
          <p className="mt-1 text-xs" style={{ color: colors.negative }}>{error}</p>
        )}
        {hint && !hasError && (
          <p className="mt-1 text-xs" style={{ color: colors.muted }}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
