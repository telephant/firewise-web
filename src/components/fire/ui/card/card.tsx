'use client';

import * as React from 'react';
import { retro, retroStyles } from '../theme';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  variant?: 'default' | 'flat';
  /** Fixed height for the card content area (e.g., '280px') */
  contentHeight?: string;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, title, variant = 'default', contentHeight, children, ...props }, ref) => {
    // Use minHeight to prevent shrinking, height to fix size, overflow for scrolling
    const contentStyle: React.CSSProperties = contentHeight
      ? { minHeight: contentHeight, height: contentHeight, maxHeight: contentHeight, overflowY: 'auto' }
      : {};

    // Flat variant: no 3D effect, just border
    if (variant === 'flat') {
      return (
        <div
          className={cn('rounded-sm overflow-hidden flex flex-col', className)}
          style={{
            backgroundColor: retro.surface,
            border: `2px solid ${retro.border}`,
          }}
          ref={ref}
          {...props}
        >
          {title && (
            <div
              className="flex items-center justify-between px-2 py-1 flex-shrink-0"
              style={retroStyles.titleBar}
            >
              <span className="text-xs font-medium" style={{ color: retro.text }}>{title}</span>
            </div>
          )}
          <div className={cn('p-4', !contentHeight && 'flex-1')} style={contentStyle}>{children}</div>
        </div>
      );
    }

    // Default: Retro 3D raised card with optional title bar
    return (
      <div
        className={cn('rounded-sm overflow-hidden flex flex-col', className)}
        style={retroStyles.raised}
        ref={ref}
        {...props}
      >
        {/* Title bar */}
        {title && (
          <div
            className="flex items-center justify-between px-2 py-1 flex-shrink-0"
            style={retroStyles.titleBar}
          >
            <span className="text-xs font-medium" style={{ color: retro.text }}>{title}</span>
            {/* Decorative window buttons (disabled) */}
            <div className="flex gap-1 pointer-events-none select-none opacity-50">
              <div
                className="w-4 h-4 flex items-center justify-center text-[10px]"
                style={retroStyles.windowButton}
              >
                &#95;
              </div>
              <div
                className="w-4 h-4 flex items-center justify-center text-[10px]"
                style={retroStyles.windowButton}
              >
                &#9633;
              </div>
              <div
                className="w-4 h-4 flex items-center justify-center text-[10px]"
                style={retroStyles.windowButton}
              >
                &#215;
              </div>
            </div>
          </div>
        )}
        {/* Content */}
        <div className={cn('p-4', !contentHeight && 'flex-1')} style={contentStyle}>
          {children}
        </div>
      </div>
    );
  }
);

Card.displayName = 'Card';
