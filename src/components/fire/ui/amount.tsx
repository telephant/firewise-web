'use client';

import { colors } from './theme';

export type AmountSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AmountVariant = 'default' | 'positive' | 'negative' | 'muted' | 'auto';

export interface AmountProps {
  value: number;
  currency?: string;
  size?: AmountSize;
  variant?: AmountVariant;
  compact?: boolean;
  showSign?: boolean;
  className?: string;
}

function formatAmount(value: number, currency = 'USD', compact = false): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    minimumFractionDigits: 2,
    maximumFractionDigits: compact ? 1 : 2,
  }).format(value);
}

const sizeStyles: Record<AmountSize, { fontSize: string; fontWeight: number }> = {
  xs: { fontSize: '11px', fontWeight: 500 },
  sm: { fontSize: '13px', fontWeight: 500 },
  md: { fontSize: '15px', fontWeight: 600 },
  lg: { fontSize: '20px', fontWeight: 700 },
  xl: { fontSize: '28px', fontWeight: 700 },
};

function resolveColor(variant: AmountVariant, value: number): string {
  switch (variant) {
    case 'positive':
      return colors.positive;
    case 'negative':
      return colors.negative;
    case 'muted':
      return colors.muted;
    case 'auto':
      return value >= 0 ? colors.positive : colors.negative;
    default:
      return colors.text;
  }
}

export function Amount({
  value,
  currency = 'USD',
  size = 'md',
  variant = 'default',
  compact = false,
  showSign = false,
  className = '',
}: AmountProps) {
  const formatted = formatAmount(Math.abs(value), currency, compact);
  const sign = showSign || variant === 'auto'
    ? value >= 0
      ? '+'
      : '−'
    : value < 0
      ? '−'
      : '';
  const displayValue = value < 0 && !showSign && variant !== 'auto'
    ? `−${formatted}`
    : `${sign}${formatted}`;

  const { fontSize, fontWeight } = sizeStyles[size];
  const color = resolveColor(variant, value);

  return (
    <span
      className={`tabular-nums ${className}`}
      style={{ fontSize, fontWeight, color }}
    >
      {displayValue}
    </span>
  );
}
