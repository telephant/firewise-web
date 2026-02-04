'use client';

import * as React from 'react';
import { colors } from './theme';
import { cn } from '@/lib/utils';

type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost' | 'outline';
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
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-md',
          'transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6AD2]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#141415]',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'active:scale-[0.97]',
          // Variant-specific hover/style via data attribute
          variant === 'default' && [
            'bg-[#1C1C1E] text-[#EDEDEF] border border-white/[0.08]',
            !disabled && 'hover:bg-[#252528] hover:border-white/[0.12]',
          ],
          variant === 'primary' && [
            'bg-[#5E6AD2] text-white',
            !disabled && 'hover:bg-[#6B76DB]',
          ],
          variant === 'danger' && [
            'bg-[#F87171] text-white',
            !disabled && 'hover:bg-[#FB8A8A]',
          ],
          variant === 'ghost' && [
            'bg-transparent text-[#EDEDEF]',
            !disabled && 'hover:bg-white/[0.06]',
          ],
          variant === 'outline' && [
            'bg-transparent text-[#EDEDEF] border border-white/[0.08]',
            !disabled && 'hover:bg-white/[0.06] hover:border-white/[0.12]',
          ],
          sizeClasses[size],
          className
        )}
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
