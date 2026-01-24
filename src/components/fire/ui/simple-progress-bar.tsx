'use client';

import { retro } from './theme';
import { cn } from '@/lib/utils';

interface Segment {
  value: number; // 0-100 (percentage of bar)
  color: string;
}

interface SimpleProgressBarProps {
  value?: number; // 0-100 (single segment mode)
  segments?: Segment[]; // Multiple segments mode
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export function SimpleProgressBar({
  value,
  segments,
  size = 'md',
  color = retro.accent,
  className,
}: SimpleProgressBarProps) {
  const height = size === 'sm' ? 'h-3' : size === 'lg' ? 'h-6' : 'h-4';

  // Build segments array
  const segmentList: Segment[] = segments || [{ value: value || 0, color }];

  return (
    <div
      className={cn('rounded-sm', height, className)}
      style={{
        backgroundColor: retro.surfaceLight,
        border: `2px solid ${retro.border}`,
        boxShadow: `inset 2px 2px 0 ${retro.bevelMid}, inset -1px -1px 0 #fff`,
        padding: '2px',
      }}
    >
      <div className="h-full flex overflow-hidden rounded-[4px]">
        {segmentList.map((segment, idx) => {
          const clampedValue = Math.min(100, Math.max(0, segment.value));
          const lighterColor = segment.color + '99';
          return (
            <div
              key={idx}
              className="h-full transition-all duration-300"
              style={{
                width: `${clampedValue}%`,
                backgroundColor: segment.color,
                backgroundImage: `repeating-linear-gradient(
                  90deg,
                  ${segment.color} 0px,
                  ${segment.color} 4px,
                  ${lighterColor} 4px,
                  ${lighterColor} 8px
                )`,
                boxShadow: clampedValue > 0 ? `inset -1px -1px 0 rgba(0,0,0,0.2), inset 1px 1px 0 rgba(255,255,255,0.3)` : 'none',
                minWidth: clampedValue > 0 ? '4px' : '0',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
