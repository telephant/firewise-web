'use client';

import { retro, retroStyles } from './theme';
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
            style={{ color: retro.text }}
          >
            {label}
          </p>
          {sublabel && (
            <p className="text-xs" style={{ color: retro.muted }}>
              {sublabel}
            </p>
          )}
        </div>
        <p className="text-sm font-bold" style={{ color: retro.text }}>
          {displayValue}
        </p>
      </div>
      {/* Retro sunken progress track */}
      <div
        className="h-5 rounded-sm p-[2px]"
        style={retroStyles.sunken}
      >
        {/* Striped progress fill */}
        <div
          className="h-full rounded-sm transition-all duration-500"
          style={{
            width: `${clampedValue}%`,
            backgroundColor: retro.accent,
            backgroundImage: `repeating-linear-gradient(
              90deg,
              ${retro.accent} 0px,
              ${retro.accent} 8px,
              ${retro.accentLight} 8px,
              ${retro.accentLight} 16px
            )`,
          }}
        />
      </div>
    </div>
  );
}
