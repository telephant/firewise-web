'use client';

import * as React from 'react';
import { retro } from './theme';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'muted';
}

export function Label({
  className,
  variant = 'default',
  children,
  ...props
}: LabelProps) {
  const color = variant === 'muted' ? retro.muted : retro.text;

  return (
    <span
      className={cn('text-xs uppercase tracking-wide font-medium', className)}
      style={{ color }}
      {...props}
    >
      {children}
    </span>
  );
}
