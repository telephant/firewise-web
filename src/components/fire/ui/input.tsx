'use client';

import * as React from 'react';
import { colors } from './theme';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, type, ...props }, ref) => {
    const hasError = !!error;

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
        <input
          type={type}
          className={cn(
            'w-full px-3 py-2 rounded-md text-sm outline-none',
            'transition-all duration-150',
            'border bg-[#1C1C1E] text-[#EDEDEF]',
            hasError
              ? 'border-[#F87171]'
              : 'border-white/[0.08] hover:border-white/[0.15]',
            'focus:border-[#5E6AD2]/60 focus:ring-2 focus:ring-[#5E6AD2]/20',
            'placeholder:text-[#7C7C82]',
            hasError && 'animate-shake',
            className
          )}
          ref={ref}
          {...props}
        />
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

Input.displayName = 'Input';
