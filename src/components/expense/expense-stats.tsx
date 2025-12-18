'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUpIcon, CoinsIcon } from '@/components/icons';
import { useExpenses } from '@/hooks/use-expenses';
import { useExpenseData } from '@/contexts/expense-data-context';
import { getCategoryColor } from '@/lib/category-colors';
import { formatCurrency, formatMonth } from '@/lib/format';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface ExpenseStatsProps {
  ledgerId: string;
  defaultCurrencyId?: string | null;
}

export function ExpenseStats({ ledgerId, defaultCurrencyId }: ExpenseStatsProps) {
  const { currencies, categories } = useExpenseData();
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<string>('');

  // Get current month date range - memoize to prevent infinite loops
  const filters = useMemo(() => {
    const now = new Date();
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
    return {
      start_date: monthStart,
      end_date: monthEnd,
      limit: 1000, // Get all expenses for the month
    };
  }, []);

  const { expenses, loading, error } = useExpenses(ledgerId, filters);
  const now = new Date();

  // Set default currency when currencies load or defaultCurrencyId changes
  useEffect(() => {
    if (currencies.length > 0 && !selectedCurrencyId) {
      if (defaultCurrencyId) {
        setSelectedCurrencyId(defaultCurrencyId);
      } else {
        // Default to USD or first currency
        const usd = currencies.find((c) => c.code === 'USD');
        setSelectedCurrencyId(usd?.id || currencies[0].id);
      }
    }
  }, [currencies, defaultCurrencyId, selectedCurrencyId]);

  // Get selected currency details
  const selectedCurrency = useMemo(() => {
    return currencies.find((c) => c.id === selectedCurrencyId);
  }, [currencies, selectedCurrencyId]);

  // Calculate stats by category
  const stats = useMemo(() => {
    if (!selectedCurrency || !expenses.length) {
      return { byCategory: [], total: 0 };
    }

    const categoryTotals: Record<string, number> = {};

    expenses.forEach((expense) => {
      const categoryId = expense.category_id || 'uncategorized';
      const expenseCurrency = currencies.find((c) => c.id === expense.currency_id);

      if (!expenseCurrency) return;

      // Convert to selected currency
      // Formula: amount / sourceRate * targetRate
      const convertedAmount =
        (expense.amount / expenseCurrency.rate) * selectedCurrency.rate;

      categoryTotals[categoryId] = (categoryTotals[categoryId] || 0) + convertedAmount;
    });

    // Convert to array and sort by amount
    const byCategory = Object.entries(categoryTotals)
      .map(([categoryId, amount]) => {
        const category = categories.find((c) => c.id === categoryId);
        return {
          id: categoryId,
          name: category?.name || 'Uncategorized',
          amount,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const total = byCategory.reduce((sum, cat) => sum + cat.amount, 0);

    return { byCategory, total };
  }, [expenses, selectedCurrency, currencies, categories]);

  // Format amount with selected currency
  const formatAmount = (amount: number) => {
    if (!selectedCurrency) return '';
    return formatCurrency(amount, selectedCurrency.code);
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        <p>Failed to load stats</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {/* Compact Header with Month and Currency */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{formatMonth(now)}</span>
        <Select value={selectedCurrencyId} onValueChange={setSelectedCurrencyId}>
          <SelectTrigger className="w-fit h-7 text-xs px-3 gap-1.5 border-0 bg-muted/50 rounded-full font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((currency) => (
              <SelectItem key={currency.id} value={currency.id}>
                {currency.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats by Category */}
      {stats.byCategory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <CoinsIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">No expenses this month</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Start tracking your spending!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Total Card - matching expense card style */}
          <div className="p-3 rounded-2xl border-0 shadow-sm bg-card/80 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUpIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Total Spending</span>
              </div>
              <p className="text-[15px] font-semibold tabular-nums">{formatAmount(stats.total)}</p>
            </div>
          </div>

          {/* Category Breakdown - matching expense card style */}
          {stats.byCategory.map((cat) => {
            const colors = getCategoryColor(cat.name);
            const percentage = (cat.amount / stats.total) * 100;

            return (
              <div
                key={cat.id}
                className="p-3 rounded-2xl border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 bg-card/80 backdrop-blur-sm"
              >
                <div className="flex items-center gap-4">
                  {/* Category Color Indicator - same as expense card */}
                  <div className={`w-1 self-stretch rounded-full ${colors.bar}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-[15px]">{cat.name}</span>
                      <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  <p className="font-semibold text-[15px] tabular-nums shrink-0">
                    {formatAmount(cat.amount)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
