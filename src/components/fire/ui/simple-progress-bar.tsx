'use client';

import { colors } from './theme';
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
  color = colors.accent,
  className,
}: SimpleProgressBarProps) {
  const height = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';

  // Build segments array
  const segmentList: Segment[] = segments || [{ value: value || 0, color }];

  return (
    <div
      className={cn('rounded-full overflow-hidden', height, className)}
      style={{
        backgroundColor: colors.surfaceLight,
      }}
    >
      <div className="h-full flex overflow-hidden rounded-full">
        {segmentList.map((segment, idx) => {
          const clampedValue = Math.min(100, Math.max(0, segment.value));
          return (
            <div
              key={idx}
              className="h-full transition-all duration-300"
              style={{
                width: `${clampedValue}%`,
                backgroundColor: segment.color,
                minWidth: clampedValue > 0 ? '2px' : '0',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
