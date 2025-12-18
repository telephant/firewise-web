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
import { useExpenses } from '@/hooks/use-expenses';
import { useExpenseData } from '@/contexts/expense-data-context';
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

  // Format amount with currency
  const formatAmount = (amount: number) => {
    if (!selectedCurrency) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: selectedCurrency.code,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-32" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
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
    <div className="space-y-4 p-4">
      {/* Currency Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Currency:</span>
        <Select value={selectedCurrencyId} onValueChange={setSelectedCurrencyId}>
          <SelectTrigger className="w-32">
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

      {/* Month Header */}
      <h2 className="text-lg font-semibold">{format(now, 'MMMM yyyy')}</h2>

      {/* Stats by Category */}
      {stats.byCategory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">No expenses this month</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Total */}
          <div className="flex items-center justify-between px-3 py-2.5 bg-primary/5 rounded-lg border-2 border-primary/20 mb-1">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold text-primary">{formatAmount(stats.total)}</span>
          </div>

          {stats.byCategory.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between px-3 py-2.5 bg-card rounded-lg border shadow-sm"
            >
              <span className="font-medium">{cat.name}</span>
              <span className="font-semibold">{formatAmount(cat.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
