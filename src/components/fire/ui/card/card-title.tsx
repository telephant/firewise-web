'use client';

import * as React from 'react';
import { colors } from '../theme';
import { cn } from '@/lib/utils';

export interface CardTitleProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const CardTitle = React.forwardRef<HTMLParagraphElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        className={cn('font-bold', className)}
        style={{ color: colors.text }}
        ref={ref}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CardTitle.displayName = 'CardTitle';
