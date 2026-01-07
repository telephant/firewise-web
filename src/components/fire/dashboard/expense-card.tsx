'use client';

import {
  retro,
  Card,
  retroStyles,
  Loader,
} from '@/components/fire/ui';
import { useExpenseStats } from '@/hooks/fire/use-fire-data';
import type { ExpenseCategoryBreakdown } from '@/types/fire';

interface ExpenseCardProps {
  className?: string;
}

export function ExpenseCard({ className }: ExpenseCardProps) {
  // Use SWR hook for data fetching
  const { stats, isLoading: loading } = useExpenseStats();

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = (direction: 'up' | 'down' | 'same') => {
    switch (direction) {
      case 'up':
        return '▲';
      case 'down':
        return '▼';
      default:
        return '─';
    }
  };

  // For expenses, "up" is bad (spending more), "down" is good (spending less)
  const getTrendColor = (direction: 'up' | 'down' | 'same') => {
    switch (direction) {
      case 'up':
        return retro.negative;
      case 'down':
        return retro.positive;
      default:
        return retro.muted;
    }
  };

  const CARD_HEIGHT = '280px';

  if (loading) {
    return (
      <Card title="Monthly Expenses" className={className} contentHeight={CARD_HEIGHT}>
        <div className="h-full flex items-center justify-center">
          <Loader size="md" variant="bar" />
        </div>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card title="Monthly Expenses" className={className} contentHeight={CARD_HEIGHT}>
        <div
          className="h-full flex items-center justify-center text-sm"
          style={{ color: retro.muted }}
        >
          Unable to load expense data
        </div>
      </Card>
    );
  }

  const { current_month, trend, income_this_month, expense_to_income_ratio } = stats;
  const topCategories = current_month.by_category.slice(0, 4);

  return (
    <Card title="Monthly Expenses" className={className} contentHeight={CARD_HEIGHT}>
      {/* Total Amount */}
      <div className="mb-3">
        <p
          className="text-2xl font-bold tabular-nums"
          style={{ color: retro.text }}
        >
          {formatCurrency(current_month.total)}
        </p>

        {/* Trend Indicator */}
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-xs font-medium"
            style={{ color: getTrendColor(trend.direction) }}
          >
            {getTrendIcon(trend.direction)} {formatCurrency(Math.abs(trend.amount_change))} ({trend.percentage_change > 0 ? '+' : ''}{trend.percentage_change}%)
          </span>
          <span className="text-xs" style={{ color: retro.muted }}>
            vs last month
          </span>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div
        className="flex gap-3 mb-3 py-2 px-2 rounded-sm"
        style={{
          backgroundColor: retro.surfaceLight,
          border: `1px solid ${retro.bevelMid}`,
        }}
      >
        <div className="flex-1">
          <p className="text-[10px] uppercase" style={{ color: retro.muted }}>
            Month Avg
          </p>
          <p className="text-xs font-bold tabular-nums" style={{ color: retro.text }}>
            {formatCurrency(current_month.monthly_average)}
          </p>
        </div>
        <div
          className="w-px"
          style={{ backgroundColor: retro.bevelMid }}
        />
        <div className="flex-1">
          <p className="text-[10px] uppercase" style={{ color: retro.muted }}>
            Exp/Income
          </p>
          <p
            className="text-xs font-bold tabular-nums"
            style={{
              color: expense_to_income_ratio !== null && expense_to_income_ratio > 100
                ? retro.negative
                : expense_to_income_ratio !== null && expense_to_income_ratio < 50
                ? retro.positive
                : retro.text,
            }}
          >
            {expense_to_income_ratio !== null ? `${expense_to_income_ratio}%` : '—'}
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      {topCategories.length > 0 ? (
        <div className="space-y-2">
          {topCategories.map((cat) => (
            <CategoryBar key={cat.category_id || 'uncategorized'} category={cat} />
          ))}
        </div>
      ) : (
        <p
          className="text-xs py-2 text-center"
          style={{ color: retro.muted }}
        >
          No expenses this month
        </p>
      )}

      {/* Source Indicator */}
      <div
        className="mt-3 pt-2 text-center"
        style={{ borderTop: `1px solid ${retro.bevelMid}` }}
      >
        <p className="text-[10px]" style={{ color: retro.muted }}>
          {current_month.source_count.manual_flows > 0 && (
            <span>{current_month.source_count.manual_flows} manual</span>
          )}
          {current_month.source_count.manual_flows > 0 && current_month.source_count.linked_ledgers > 0 && (
            <span> + </span>
          )}
          {current_month.source_count.linked_ledgers > 0 && (
            <span>{current_month.source_count.linked_ledgers} from ledgers</span>
          )}
          {current_month.source_count.manual_flows === 0 && current_month.source_count.linked_ledgers === 0 && (
            <span>No expense sources configured</span>
          )}
        </p>
      </div>
    </Card>
  );
}

// Category progress bar component
function CategoryBar({ category }: { category: ExpenseCategoryBreakdown }) {
  const formatCurrency = (amount: number) => {
    if (amount === 0) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm emoji-sepia">{category.category_icon}</span>
          <span className="text-xs font-medium" style={{ color: retro.text }}>
            {category.category_name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tabular-nums" style={{ color: retro.text }}>
            {formatCurrency(category.amount)}
          </span>
          <span
            className="text-[10px] tabular-nums w-8 text-right"
            style={{ color: retro.muted }}
          >
            {Math.round(category.percentage)}%
          </span>
        </div>
      </div>
      {/* Retro sunken progress bar */}
      <div
        className="h-2.5 rounded-sm p-[1px]"
        style={retroStyles.sunken}
      >
        <div
          className="h-full rounded-sm transition-all duration-300"
          style={{
            width: `${Math.min(100, category.percentage)}%`,
            backgroundColor: retro.accent,
            backgroundImage: `repeating-linear-gradient(
              90deg,
              ${retro.accent} 0px,
              ${retro.accent} 4px,
              ${retro.accentLight} 4px,
              ${retro.accentLight} 8px
            )`,
          }}
        />
      </div>
    </div>
  );
}
