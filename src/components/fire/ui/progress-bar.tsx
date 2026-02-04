'use client';

import { colors } from './theme';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  label: string;
  sublabel?: string;
  value: number; // 0-100
  displayValue: string;
  className?: string;
}

export function ProgressBar({
  label,
  sublabel,
  value,
  displayValue,
  className,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('', className)}>
      <div className="flex justify-between items-baseline mb-2">
        <div>
          <p
            className="text-xs uppercase tracking-wide font-medium"
            style={{ color: colors.text }}
          >
            {label}
          </p>
          {sublabel && (
            <p className="text-xs" style={{ color: colors.muted }}>
              {sublabel}
            </p>
          )}
        </div>
        <p className="text-sm font-bold" style={{ color: colors.text }}>
          {displayValue}
        </p>
      </div>
      {/* Progress track */}
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{
          backgroundColor: colors.surfaceLight,
        }}
      >
        {/* Progress fill */}
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${clampedValue}%`,
            backgroundColor: colors.accent,
          }}
        />
      </div>
    </div>
  );
}
