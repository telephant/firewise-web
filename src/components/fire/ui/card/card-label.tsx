'use client';

import * as React from 'react';
import { retro } from '../theme';
import { cn } from '@/lib/utils';

export interface CardLabelProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const CardLabel = React.forwardRef<HTMLParagraphElement, CardLabelProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        className={cn('text-xs uppercase tracking-wide', className)}
        style={{ color: retro.muted }}
        ref={ref}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CardLabel.displayName = 'CardLabel';
