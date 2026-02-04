'use client';

import * as React from 'react';
import { colors } from '../theme';
import { cn } from '@/lib/utils';

export interface CardValueProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const CardValue = React.forwardRef<HTMLParagraphElement, CardValueProps>(
  ({ className, size = 'lg', children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'text-sm font-medium',
      md: 'text-lg font-bold',
      lg: 'text-xl font-bold',
      xl: 'text-3xl font-bold',
    };

    return (
      <p
        className={cn(sizeClasses[size], className)}
        style={{ color: colors.text }}
        ref={ref}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CardValue.displayName = 'CardValue';
