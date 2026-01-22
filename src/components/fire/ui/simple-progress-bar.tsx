'use client';

import { retro } from './theme';
import { cn } from '@/lib/utils';

interface SimpleProgressBarProps {
  value: number; // 0-100
  size?: 'sm' | 'md';
  color?: string;
  className?: string;
}

export function SimpleProgressBar({
  value,
  size = 'md',
  color = retro.accent,
  className,
}: SimpleProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const height = size === 'sm' ? 'h-3' : 'h-4';

  // Generate lighter shade for stripes
  const lighterColor = color + '99'; // 60% opacity version

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
      <div
        className="h-full transition-all duration-300"
        style={{
          width: `${clampedValue}%`,
          backgroundColor: color,
          backgroundImage: `repeating-linear-gradient(
            90deg,
            ${color} 0px,
            ${color} 4px,
            ${lighterColor} 4px,
            ${lighterColor} 8px
          )`,
          boxShadow: clampedValue > 0 ? `inset -1px -1px 0 rgba(0,0,0,0.2), inset 1px 1px 0 rgba(255,255,255,0.3)` : 'none',
        }}
      />
    </div>
  );
}
