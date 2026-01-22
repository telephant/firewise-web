'use client';

import { useState, useEffect, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { TrendingUpIcon, TrendingDownIcon, CoinsIcon } from '@/components/icons';
import { MonthlyChart } from './monthly-chart';
import { CurrencyFilter } from './currency-filter';
import { useExpenseStats } from '@/hooks/use-expense-stats';
import { useMonthlyStats } from '@/hooks/use-monthly-stats';
import { useExpenseData } from '@/contexts/expense-data-context';
import { getCategoryColor } from '@/lib/category-colors';
import { formatCurrency } from '@/lib/format';
import { format, startOfMonth, endOfMonth, parse } from 'date-fns';

interface ExpenseStatsProps {
  ledgerId: string;
  defaultCurrencyId?: string | null;
}

export function ExpenseStats({ ledgerId, defaultCurrencyId }: ExpenseStatsProps) {
  const { currencies, onCategoryChange, onCurrencyChange, onPaymentMethodChange } = useExpenseData();
  const [userSelectedCurrencyId, setUserSelectedCurrencyId] = useState<string | null>(null);
  // Excluded categories (unchecked) - empty means all categories are included
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<Set<string>>(new Set());

  // Selected month in 'YYYY-MM' format, defaults to current month
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  // Toggle category inclusion/exclusion
  const toggleCategory = (categoryKey: string) => {
    setExcludedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
  };

  // Compute effective currency ID: user selection > default > USD > first available
  const selectedCurrencyId = useMemo(() => {
    if (userSelectedCurrencyId) return userSelectedCurrencyId;
    if (defaultCurrencyId) return defaultCurrencyId;
    if (currencies.length === 0) return '';
    const usd = currencies.find((c) => c.code === 'USD');
    return usd?.id || currencies[0].id;
  }, [userSelectedCurrencyId, defaultCurrencyId, currencies]);

  // Fetch monthly stats for chart
  const monthlyFilters = useMemo(
    () => ({
      currency_id: selectedCurrencyId || undefined,
      months: 6,
    }),
    [selectedCurrencyId]
  );

  const {
    monthlyStats,
    loading: monthlyLoading,
    refetch: refetchMonthly,
  } = useMonthlyStats(selectedCurrencyId ? ledgerId : null, monthlyFilters);

  // Compute filtered months based on excluded categories
  const filteredMonths = useMemo(() => {
    if (!monthlyStats?.months) return [];

    return monthlyStats.months.map((m) => {
      if (excludedCategoryIds.size === 0) {
        // No exclusions - show total
        return { month: m.month, total: m.total, by_category: m.by_category };
      }
      // Sum only included categories (not in excluded set)
      const includedTotal = m.by_category
        .filter((c) => {
          const categoryKey = c.category_id || 'uncategorized';
          return !excludedCategoryIds.has(categoryKey);
        })
        .reduce((sum, c) => sum + c.amount, 0);

      return {
        month: m.month,
        total: Math.round(includedTotal * 100) / 100,
        by_category: m.by_category,
      };
    });
  }, [monthlyStats, excludedCategoryIds]);

  // Get selected month date range
  const filters = useMemo(() => {
    const monthDate = parse(selectedMonth, 'yyyy-MM', new Date());
    const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');
    return {
      start_date: monthStart,
      end_date: monthEnd,
      currency_id: selectedCurrencyId || undefined,
    };
  }, [selectedMonth, selectedCurrencyId]);

  // Use the stats API - only fetch when currency is selected
  const { stats, loading, error, refetch } = useExpenseStats(selectedCurrencyId ? ledgerId : null, filters);

  // We have data if stats or monthlyStats exist (means we've loaded at least once)
  const hasData = Boolean(stats || monthlyStats);

  // Calculate comparison with previous month (using filtered data)
  const comparison = useMemo(() => {
    if (!filteredMonths || filteredMonths.length < 2) return null;

    const selectedIndex = filteredMonths.findIndex((m) => m.month === selectedMonth);
    if (selectedIndex <= 0) return null; // No previous month to compare

    const currentTotal = filteredMonths[selectedIndex].total;
    const previousTotal = filteredMonths[selectedIndex - 1].total;
    const previousMonth = filteredMonths[selectedIndex - 1].month;

    if (previousTotal === 0) return null;

    const percentChange = ((currentTotal - previousTotal) / previousTotal) * 100;
    const previousMonthLabel = format(parse(previousMonth, 'yyyy-MM', new Date()), 'MMM');

    return {
      percentChange,
      previousMonthLabel,
      isIncrease: percentChange > 0,
    };
  }, [filteredMonths, selectedMonth]);

  // Subscribe to category, currency, and payment method changes to refresh stats
  useEffect(() => {
    const unsubscribeCategory = onCategoryChange(() => {
      refetch();
      refetchMonthly();
    });
    const unsubscribeCurrency = onCurrencyChange(() => {
      refetch();
      refetchMonthly();
    });
    const unsubscribePaymentMethod = onPaymentMethodChange(() => {
      refetch();
      refetchMonthly();
    });
    return () => {
      unsubscribeCategory();
      unsubscribeCurrency();
      unsubscribePaymentMethod();
    };
  }, [onCategoryChange, onCurrencyChange, onPaymentMethodChange, refetch, refetchMonthly]);

  // Format amount with selected currency
  const formatAmount = (amount: number) => {
    const currencyCode = stats?.currency_code || currencies.find((c) => c.id === selectedCurrencyId)?.code;
    if (!currencyCode) return '';
    return formatCurrency(amount, currencyCode);
  };

  // Format selected month for display
  const selectedMonthLabel = useMemo(() => {
    const monthDate = parse(selectedMonth, 'yyyy-MM', new Date());
    return format(monthDate, 'MMMM yyyy');
  }, [selectedMonth]);

  // Show skeleton only for initial load (no data yet)
  if (!hasData && (loading || monthlyLoading)) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-28 w-full rounded-2xl" />
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

  // Show overlay when refreshing (have data but loading new data)
  const isRefreshing = hasData && (loading || monthlyLoading);

  return (
    <div className="space-y-3 relative">
      {/* Loading overlay for currency/filter changes */}
      {isRefreshing && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-start justify-center pt-24">
          <div className="flex items-center gap-2 text-muted-foreground bg-background/80 px-4 py-2 rounded-full shadow-sm">
            <Spinner variant="fire" />
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      )}

      {/* Header with Currency selector */}
      <div className="flex items-center justify-between px-4">
        <span className="text-sm font-medium text-muted-foreground">Last 6 Months</span>
        <CurrencyFilter
          value={selectedCurrencyId}
          currencies={currencies}
          onChange={setUserSelectedCurrencyId}
        />
      </div>

      {/* Monthly Chart */}
      {filteredMonths.length > 0 && (
        <MonthlyChart
          months={filteredMonths}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
          currencyCode={monthlyStats?.currency_code}
        />
      )}

      {/* Selected Month Details */}
      <div className="px-4 pb-4 space-y-2">
        {/* Month label and Total */}
        <div className="p-3 rounded-2xl border-0 shadow-sm bg-card/80 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-muted-foreground">{selectedMonthLabel}</span>
            {comparison && (
              <span
                className={`flex items-center gap-0.5 text-xs font-medium ${
                  comparison.isIncrease ? 'text-red-500' : 'text-green-500'
                }`}
              >
                {comparison.isIncrease ? (
                  <TrendingUpIcon className="h-3 w-3" />
                ) : (
                  <TrendingDownIcon className="h-3 w-3" />
                )}
                {Math.abs(comparison.percentChange).toFixed(0)}% vs {comparison.previousMonthLabel}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CoinsIcon className="h-4 w-4" />
              <span className="text-sm font-medium">Total Spending</span>
            </div>
            <p className="text-lg font-semibold tabular-nums">
              {formatAmount(
                excludedCategoryIds.size === 0
                  ? stats?.total || 0
                  : (stats?.by_category || [])
                      .filter((c) => !excludedCategoryIds.has(c.category_id || 'uncategorized'))
                      .reduce((sum, c) => sum + c.amount, 0)
              )}
            </p>
          </div>
        </div>

        {/* Category Breakdown */}
        {!stats || stats.by_category.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground text-sm">No expenses this month</p>
          </div>
        ) : (
          stats.by_category.map((cat) => {
            const colors = getCategoryColor(cat.category_name);
            const categoryKey = cat.category_id || 'uncategorized';
            const isExcluded = excludedCategoryIds.has(categoryKey);

            return (
              <button
                key={categoryKey}
                onClick={() => toggleCategory(categoryKey)}
                className={`w-full text-left p-3 rounded-2xl border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 bg-card/80 backdrop-blur-sm ${
                  isExcluded ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Category Color Indicator */}
                  <div
                    className={`w-1 self-stretch rounded-full transition-colors duration-200 ${
                      isExcluded ? 'bg-muted-foreground/30' : colors.bar
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`font-semibold text-[15px] transition-colors duration-200 ${
                          isExcluded ? 'text-muted-foreground' : ''
                        }`}
                      >
                        {cat.category_name}
                      </span>
                      <span
                        className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full transition-colors duration-200 ${
                          isExcluded ? 'bg-muted text-muted-foreground' : colors.badge
                        }`}
                      >
                        {cat.percentage.toFixed(1)}%
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isExcluded ? 'bg-muted-foreground/30' : colors.bar
                        }`}
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>

                  <p
                    className={`font-semibold text-[15px] tabular-nums shrink-0 transition-colors duration-200 ${
                      isExcluded ? 'text-muted-foreground line-through' : ''
                    }`}
                  >
                    {formatAmount(cat.amount)}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
