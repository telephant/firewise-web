'use client';

import { useMemo } from 'react';
import { retro, retroStyles, Loader, IconDollar, IconChart, IconCoin, IconArrow } from '@/components/fire/ui';
import { formatCurrency } from '@/lib/fire/utils';
import { useFlows, useExpenseStats } from '@/hooks/fire/use-fire-data';
import type { FlowWithDetails } from '@/types/fire';

// Helper to get effective amount for stats (use converted amount when available)
function getEffectiveAmount(flow: FlowWithDetails): number {
  return flow.converted_amount ?? flow.amount;
}

interface InsightCardProps {
  currency?: string;
}

// Get date range for current month
function getCurrentMonthRange() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const start = new Date(currentYear, currentMonth, 1);
  const end = new Date(currentYear, currentMonth + 1, 0);

  return { start, end };
}

function formatDateForApi(date: Date): string {
  // Use local date to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function InsightCard({ currency = 'USD' }: InsightCardProps) {
  const monthRange = useMemo(() => getCurrentMonthRange(), []);

  // Memoize filters to ensure stable reference
  const flowFilters = useMemo(() => ({
    start_date: formatDateForApi(monthRange.start),
    end_date: formatDateForApi(monthRange.end),
    exclude_category: 'adjustment' as const,
    limit: 500,
  }), [monthRange.start, monthRange.end]);

  // Fetch current month flows (excluding adjustments at SQL level)
  const { flows: currentMonthFlows, isLoading: flowsLoading } = useFlows(flowFilters);

  // Fetch expense stats (includes linked ledger expenses + historical average)
  const { stats: expenseStats, isLoading: expenseLoading } = useExpenseStats();

  const isLoading = flowsLoading || expenseLoading;

  // Calculate metrics
  const metrics = useMemo(() => {
    // Current month stats (adjustments already filtered at SQL level)
    const salary = currentMonthFlows
      .filter(f => f.type === 'income' && ['salary', 'bonus'].includes(f.category || ''))
      .reduce((sum, f) => sum + getEffectiveAmount(f), 0);

    // Passive income: income flows where from_asset_id is not null
    // (money coming from an owned asset - dividends, rental, etc.)
    const passiveIncome = currentMonthFlows
      .filter(f => f.type === 'income' && f.from_asset_id !== null)
      .reduce((sum, f) => sum + getEffectiveAmount(f), 0);

    const invested = currentMonthFlows
      .filter(f => f.category === 'invest')
      .reduce((sum, f) => sum + getEffectiveAmount(f), 0);

    // Use expense stats for spending data (includes linked ledger expenses)
    const currentExpense = expenseStats?.current_month?.total ?? 0;
    const avgMonthlySpending = expenseStats?.current_month?.monthly_average ?? currentExpense;
    const hasHistoricalData = (expenseStats?.previous_month?.total ?? 0) > 0;

    // Daily expense rate based on average
    const avgDailyExpense = avgMonthlySpending / 30;

    // How many days of expenses does passive income cover?
    const daysPassiveCovered = avgDailyExpense > 0 ? passiveIncome / avgDailyExpense : 0;

    // Coverage percentage (passive income vs average monthly spending)
    const coveragePercent = avgMonthlySpending > 0
      ? Math.round((passiveIncome / avgMonthlySpending) * 100)
      : 0;

    return {
      salary,
      passiveIncome,
      invested,
      currentExpense,
      avgMonthlySpending,
      hasHistoricalData,
      daysPassiveCovered,
      coveragePercent,
    };
  }, [currentMonthFlows, expenseStats]);

  // Generate human-readable summary
  const getSummary = () => {
    const { passiveIncome, avgMonthlySpending, daysPassiveCovered, coveragePercent, hasHistoricalData, salary, invested } = metrics;

    // No data yet
    if (salary === 0 && passiveIncome === 0 && invested === 0 && avgMonthlySpending === 0) {
      return {
        text: "Start recording your income and expenses to see insights here!",
        tone: 'neutral' as const,
      };
    }

    // Build the summary
    const parts: string[] = [];

    // Passive income coverage
    if (passiveIncome > 0 && avgMonthlySpending > 0) {
      if (coveragePercent >= 100) {
        parts.push("Your passive income covers all your expenses — you're financially independent!");
      } else if (daysPassiveCovered >= 7) {
        parts.push(`Passive income covers ${Math.floor(daysPassiveCovered)} days of expenses this month.`);
      } else if (daysPassiveCovered >= 1) {
        parts.push(`Passive income covers ${Math.floor(daysPassiveCovered)} day${Math.floor(daysPassiveCovered) !== 1 ? 's' : ''} of expenses.`);
      } else if (daysPassiveCovered > 0) {
        parts.push(`Passive income covers ${Math.round(daysPassiveCovered * 24)} hours of expenses.`);
      }
    }

    // Investment activity
    if (invested > 0) {
      parts.push(`You've invested ${formatCurrency(invested, { currency })} this month — growing your wealth!`);
    }

    // Income vs spending comparison
    const totalIncome = salary + passiveIncome;
    if (totalIncome > 0 && avgMonthlySpending > 0) {
      const surplus = totalIncome - avgMonthlySpending;
      if (surplus > 0) {
        parts.push(`Based on ${hasHistoricalData ? 'your average' : 'this month'}, you're on track to save ${formatCurrency(surplus, { currency })}.`);
      }
    }

    // Fallback
    if (parts.length === 0) {
      if (salary > 0) {
        parts.push("Keep tracking your expenses to see how your money flows!");
      } else {
        parts.push("Record your salary and expenses to get personalized insights.");
      }
    }

    const tone = coveragePercent >= 100 ? 'positive' : coveragePercent >= 30 ? 'good' : 'neutral';
    return { text: parts.join(' '), tone };
  };

  const summary = getSummary();

  if (isLoading) {
    return (
      <div className="rounded-sm p-4" style={retroStyles.raised}>
        <div className="py-4 flex items-center justify-center">
          <Loader size="sm" variant="bar" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-sm p-4" style={retroStyles.raised}>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {/* Salary */}
        <StatBox
          icon={<IconDollar size={16} />}
          label="Salary"
          value={formatCurrency(metrics.salary, { currency, compact: true })}
          color={retro.positive}
        />

        {/* Passive Income */}
        <StatBox
          icon={<IconChart size={16} />}
          label="Passive"
          value={formatCurrency(metrics.passiveIncome, { currency, compact: true })}
          color={retro.info}
        />

        {/* Invested */}
        <StatBox
          icon={<IconCoin size={16} />}
          label="Invested"
          value={formatCurrency(metrics.invested, { currency, compact: true })}
          color={retro.warning}
        />

        {/* Avg Spending */}
        <StatBox
          icon={<IconArrow size={16} className="rotate-90" />}
          label="Avg Spend"
          value={formatCurrency(metrics.avgMonthlySpending, { currency, compact: true })}
          sublabel={metrics.hasHistoricalData ? '/mo' : 'this mo'}
          color={retro.negative}
        />
      </div>

      {/* Human-readable Summary */}
      <div
        className="p-3 rounded-sm text-xs leading-relaxed"
        style={{
          ...retroStyles.sunken,
          color: summary.tone === 'positive' ? retro.positive :
                 summary.tone === 'good' ? retro.text : retro.muted,
        }}
      >
        {summary.text}
      </div>
    </div>
  );
}

// Stat Box Component
function StatBox({
  icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  color: string;
}) {
  return (
    <div className="p-2 rounded-sm" style={retroStyles.sunken}>
      <div className="flex items-center gap-1.5 mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wide" style={{ color: retro.muted }}>
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-bold tabular-nums" style={{ color: retro.text }}>
          {value}
        </span>
        {sublabel && (
          <span className="text-[10px]" style={{ color: retro.muted }}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
