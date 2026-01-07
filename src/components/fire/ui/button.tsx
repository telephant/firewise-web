'use client';

import * as React from 'react';
import { retro } from './theme';
import { cn } from '@/lib/utils';

type ButtonVariant = 'default' | 'primary' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', children, disabled, ...props }, ref) => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium transition-all duration-100 rounded-sm';

    const disabledClasses = disabled
      ? 'opacity-50 cursor-not-allowed'
      : 'active:translate-y-[1px]';

    // Primary: accent color button (stands out)
    if (variant === 'primary') {
      return (
        <button
          className={cn(baseClasses, disabledClasses, sizeClasses[size], className)}
          style={{
            color: '#ffffff',
            backgroundColor: retro.accent,
            border: `2px solid ${retro.border}`,
            boxShadow: disabled
              ? 'none'
              : `inset -1px -1px 0 rgba(0,0,0,0.3), inset 1px 1px 0 rgba(255,255,255,0.3), 2px 2px 0 ${retro.bevelDark}`,
          }}
          disabled={disabled}
          ref={ref}
          {...props}
        >
          {children}
        </button>
      );
    }

    // Ghost: minimal, no background
    if (variant === 'ghost') {
      return (
        <button
          className={cn(
            baseClasses,
            disabledClasses,
            'hover:bg-[#e5d5c5]',
            sizeClasses[size],
            className
          )}
          style={{
            color: retro.text,
            backgroundColor: 'transparent',
          }}
          disabled={disabled}
          ref={ref}
          {...props}
        >
          {children}
        </button>
      );
    }

    // Outline: bordered but not raised
    if (variant === 'outline') {
      return (
        <button
          className={cn(baseClasses, disabledClasses, sizeClasses[size], className)}
          style={{
            color: retro.text,
            backgroundColor: retro.surface,
            border: `1px solid ${retro.bevelMid}`,
            boxShadow: disabled ? 'none' : `1px 1px 0 ${retro.bevelDark}`,
          }}
          disabled={disabled}
          ref={ref}
          {...props}
        >
          {children}
        </button>
      );
    }

    // Default: Retro 3D raised button
    return (
      <button
        className={cn(baseClasses, disabledClasses, sizeClasses[size], className)}
        style={{
          color: retro.text,
          backgroundColor: retro.surface,
          border: `2px solid ${retro.border}`,
          boxShadow: disabled
            ? 'none'
            : `inset -1px -1px 0 ${retro.bevelDark}, inset 1px 1px 0 ${retro.bevelLight}, 2px 2px 0 ${retro.bevelDark}`,
        }}
        disabled={disabled}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
