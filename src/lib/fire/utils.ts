// Shared utility functions for FIRE management

import type { Asset, AssetWithBalance, Debt } from '@/types/fire';

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currency: string): string {
  // Use Intl to extract just the symbol
  const parts = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).formatToParts(0);

  const symbolPart = parts.find(part => part.type === 'currency');
  return symbolPart?.value || currency;
}

/**
 * Format amount with currency symbol (simplified version)
 * Use this for inline display where you want "¥1,234" format
 */
export function formatAmount(
  amount: number,
  currency: string = 'USD',
  options: { compact?: boolean; decimals?: number } = {}
): string {
  const { compact = false, decimals = 0 } = options;
  const symbol = getCurrencySymbol(currency);

  if (compact && Math.abs(amount) >= 1000) {
    const formatted = new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
    return `${symbol}${formatted}`;
  }

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  return `${symbol}${formatted}`;
}

/**
 * Format currency with optional compact notation
 */
export function formatCurrency(
  amount: number,
  options: {
    currency?: string;
    compact?: boolean;
    decimals?: number;
  } = {}
): string {
  const { currency = 'USD', compact = false, decimals } = options;

  if (amount === 0) {
    // Use Intl to get the correct currency symbol
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0);
  }

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
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 0,
  }).format(amount);
}

/**
 * Format currency with 2 decimal places (for prices)
 */
export function formatPrice(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number of shares
 */
export function formatShares(amount: number): string {
  if (amount === 0) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage with sign
 */
export function formatPercent(value: number | null | undefined): string {
  if (value == null) return '';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Calculate net worth from assets and debts
 *
 * Assets: All positive value items (cash, deposits, investments, real estate, etc.)
 * Debts: Separate debts table with current_balance
 */
export function calculateNetWorth(
  assets: (Asset | AssetWithBalance)[],
  debts?: Debt[]
): {
  totalAssets: number;
  totalDebts: number;
  netWorth: number;
} {
  // Use converted balance when available (for currency conversion)
  const getAssetBalance = (a: Asset | AssetWithBalance) =>
    (a as AssetWithBalance).converted_balance ?? a.balance;

  const getDebtBalance = (d: Debt) =>
    d.converted_balance ?? d.current_balance;

  const totalAssets = assets.reduce(
    (sum, a) => {
      const balance = getAssetBalance(a);
      return sum + (balance > 0 ? balance : 0);
    },
    0
  );

  const totalDebts = debts
    ? debts.reduce((sum, d) => {
        const balance = getDebtBalance(d);
        // Only count debts with positive balance
        return sum + (balance > 0 ? balance : 0);
      }, 0)
    : 0;

  return {
    totalAssets,
    totalDebts,
    netWorth: totalAssets - totalDebts,
  };
}
