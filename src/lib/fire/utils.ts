// Shared utility functions for FIRE management

/**
 * Format currency with optional compact notation
 */
export function formatCurrency(
  amount: number,
  options: {
    currency?: string;
    compact?: boolean;
  } = {}
): string {
  const { currency = 'USD', compact = false } = options;

  if (amount === 0) return '$0';

  if (compact && Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
