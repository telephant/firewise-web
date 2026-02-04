'use client';

import { colors } from './theme';
import { cn } from '@/lib/utils';
import { IconTriangleUp, IconTriangleDown } from './icons';
import { Loader } from './loader';

interface StatCardProps {
  label: string;
  value: string;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  valueColor?: 'default' | 'positive' | 'negative';
  className?: string;
  isLoading?: boolean;
}

export function StatCard({
  label,
  value,
  trend,
  valueColor = 'default',
  className,
  isLoading = false,
}: StatCardProps) {
  const valueColors = {
    default: colors.text,
    positive: colors.positive,
    negative: colors.negative,
  };

  const trendColors = {
    up: colors.positive,
    down: colors.negative,
    neutral: colors.muted,
  };

  const TrendIcon = trend?.direction === 'up'
    ? IconTriangleUp
    : trend?.direction === 'down'
      ? IconTriangleDown
      : null;

  if (isLoading) {
    return (
      <div
        className={cn('rounded-lg overflow-hidden', className)}
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
        }}
      >
        <div className="px-3 py-3 text-center">
          <p
            className="text-[10px] uppercase tracking-wider font-medium mb-1"
            style={{ color: colors.muted }}
          >
            {label}
          </p>
          <div className="py-2">
            <Loader size="sm" variant="dots" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('rounded-lg overflow-hidden', className)}
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div className="px-3 py-3 text-center">
        {/* Label */}
        <p
          className="text-[10px] uppercase tracking-wider font-medium mb-1"
          style={{ color: colors.muted }}
        >
          {label}
        </p>

        {/* Value */}
        <p
          className="text-xl font-bold"
          style={{ color: valueColors[valueColor] }}
        >
          {value}
        </p>

        {/* Trend (optional) */}
        {trend && (
          <p
            className="text-[10px] mt-1 font-medium inline-flex items-center justify-center gap-0.5"
            style={{ color: trendColors[trend.direction] }}
          >
            {TrendIcon && <TrendIcon size={8} />}
            {!TrendIcon && <span>-</span>}
            {trend.value}
          </p>
        )}
      </div>
    </div>
  );
}
