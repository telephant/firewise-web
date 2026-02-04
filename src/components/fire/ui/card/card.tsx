'use client';

import * as React from 'react';
import { colors } from '../theme';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  variant?: 'default' | 'flat';
  /** Fixed height for the card content area (e.g., '280px') */
  contentHeight?: string;
  /** Optional action element to render in the title bar (e.g., add button) */
  action?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, title, variant = 'default', contentHeight, action, children, ...props }, ref) => {
    const contentStyle: React.CSSProperties = contentHeight
      ? { minHeight: contentHeight, height: contentHeight, maxHeight: contentHeight, overflowY: 'auto' }
      : {};

    return (
      <div
        className={cn('rounded-lg overflow-hidden flex flex-col transition-colors duration-150', className)}
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
        }}
        ref={ref}
        {...props}
      >
        {title && (
          <div
            className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
            style={{ borderBottom: `1px solid ${colors.border}` }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: colors.text }}>{title}</span>
              {action}
            </div>
          </div>
        )}
        <div className={cn('p-4', !contentHeight && 'flex-1')} style={contentStyle}>
          {children}
        </div>
      </div>
    );
  }
);

Card.displayName = 'Card';
