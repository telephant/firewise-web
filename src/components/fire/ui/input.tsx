'use client';

import * as React from 'react';
import { retro, retroStyles } from './theme';
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
            style={{ color: hasError ? '#c53030' : retro.text }}
          >
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'w-full px-3 py-2 rounded-sm text-sm outline-none',
            hasError && 'animate-shake',
            className
          )}
          style={{
            ...retroStyles.sunken,
            ...(hasError ? {
              borderColor: '#c53030',
              boxShadow: 'inset 2px 2px 0 rgba(197, 48, 48, 0.2)',
            } : {}),
          }}
          ref={ref}
          {...props}
        />
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

Input.displayName = 'Input';
