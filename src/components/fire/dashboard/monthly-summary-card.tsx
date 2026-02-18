'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, colors, Loader, Button, IconChevronLeft, IconChevronRight } from '@/components/fire/ui';
import { formatCurrency } from '@/lib/fire/utils';
import { monthlySummaryApi, MonthlySummaryStats } from '@/lib/fire/api';
import { useSnapshots } from '@/hooks/fire';

// Month names
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  salary: 'Salary',
  bonus: 'Bonus',
  freelance: 'Freelance',
  gift: 'Gift',
  dividend: 'Dividends',
  interest: 'Interest',
  rental: 'Rental',
  passive_other: 'Passive',
  other: 'Other',
};

interface WaterfallBar {
  id: string;
  label: string;
  value: number;
  color: string;
  start: number; // left offset (percentage)
  width: number; // bar width (percentage)
  runningTotal: number;
  isNegative?: boolean;
  isTotal?: boolean;
}

export function MonthlySummaryCard() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<MonthlySummaryStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  // Get last snapshot for comparison with current data
  const { snapshots } = useSnapshots({ limit: 1 });

  // Month/year navigation
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12

  const goToPrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrentMonth) return;

    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await monthlySummaryApi.get({ year, month });
        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.error || 'Failed to fetch summary');
        }
      } catch (err) {
        setError('Failed to fetch summary');
        console.error('Monthly summary error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [year, month]);

  // Build waterfall bars
  const { waterfallBars, totalIncome, totalExpenses, net, minValue, range } = useMemo(() => {
    if (!data) return { waterfallBars: [], totalIncome: 0, totalExpenses: 0, net: 0, minValue: 0, range: 0 };

    const bars: WaterfallBar[] = [];
    let runningTotal = 0;

    // Active income categories (each as separate bar)
    data.income.active.breakdown.forEach((item) => {
      const start = runningTotal;
      runningTotal += item.amount;
      bars.push({
        id: `income-${item.category}`,
        label: CATEGORY_LABELS[item.category] || item.category,
        value: item.amount,
        color: colors.positive,
        start,
        width: item.amount,
        runningTotal,
      });
    });

    // Passive income (grouped as one bar)
    if (data.income.passive.total > 0) {
      const start = runningTotal;
      runningTotal += data.income.passive.total;
      bars.push({
        id: 'income-passive',
        label: 'Passive',
        value: data.income.passive.total,
        color: '#10B981',
        start,
        width: data.income.passive.total,
        runningTotal,
      });
    }

    const incomeTotal = runningTotal;

    // Linked ledger expenses (each as separate bar)
    data.expenses.ledgers.breakdown.forEach((ledger) => {
      runningTotal -= ledger.amount;
      bars.push({
        id: `expense-ledger-${ledger.ledger_id}`,
        label: ledger.ledger_name,
        value: ledger.amount,
        color: colors.negative,
        start: runningTotal,
        width: ledger.amount,
        runningTotal,
        isNegative: true,
      });
    });

    // Local expenses (expenses not from linked ledgers)
    if (data.expenses.local.total > 0) {
      runningTotal -= data.expenses.local.total;
      bars.push({
        id: 'expense-local',
        label: 'Local',
        value: data.expenses.local.total,
        color: colors.negative,
        start: runningTotal,
        width: data.expenses.local.total,
        runningTotal,
        isNegative: true,
      });
    }

    // Debt payments
    if (data.debtPayments.total > 0) {
      runningTotal -= data.debtPayments.total;
      bars.push({
        id: 'expense-debt',
        label: 'Debt',
        value: data.debtPayments.total,
        color: '#F59E0B',
        start: runningTotal,
        width: data.debtPayments.total,
        runningTotal,
        isNegative: true,
      });
    }

    const expenseTotal = data.expenses.total + data.debtPayments.total;
    const netAmount = incomeTotal - expenseTotal;

    // Net bar (from 0 to net, or net to 0 if negative)
    bars.push({
      id: 'net',
      label: 'Net',
      value: Math.abs(netAmount),
      color: netAmount >= 0 ? colors.positive : colors.negative,
      start: netAmount >= 0 ? 0 : netAmount,
      width: Math.abs(netAmount),
      runningTotal: netAmount,
      isTotal: true,
    });

    // Calculate scale: need to handle negative values when expenses > income
    // minValue is the lowest point (could be negative)
    // maxValue is the highest point (total income)
    const allValues = bars.flatMap(b => [b.start, b.start + b.width, b.runningTotal]);
    const minVal = Math.min(0, ...allValues);
    const maxVal = Math.max(...allValues);
    const rangeVal = maxVal - minVal;

    return {
      waterfallBars: bars,
      totalIncome: incomeTotal,
      totalExpenses: expenseTotal,
      net: netAmount,
      minValue: minVal,
      range: rangeVal,
    };
  }, [data]);

  const currency = data?.currency || 'USD';
  const monthYearLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const hasData = waterfallBars.length > 1;

  // Calculate comparison: current net (income - expenses) vs last snapshot
  const comparison = useMemo(() => {
    if (!snapshots || snapshots.length < 1 || net === 0) return null;
    const lastSnapshot = snapshots[0];
    // Compare net savings (income - expenses)
    const snapshotIncome = lastSnapshot.converted_total_income ?? lastSnapshot.total_income;
    const snapshotExpenses = lastSnapshot.converted_total_expenses ?? lastSnapshot.total_expenses;
    const snapshotNet = snapshotIncome - snapshotExpenses;
    const change = net - snapshotNet;
    const changePercent = snapshotNet !== 0 ? (change / Math.abs(snapshotNet)) * 100 : 0;
    const monthName = new Date(lastSnapshot.year, lastSnapshot.month - 1).toLocaleDateString('en-US', { month: 'short' });
    return { change, changePercent, monthName };
  }, [snapshots, net]);

  // Convert value to percentage position (accounting for negative values)
  const toPosition = (value: number) => range > 0 ? ((value - minValue) / range) * 100 : 0;
  // Convert value to percentage width (no offset needed)
  const toWidth = (value: number) => range > 0 ? (value / range) * 100 : 0;

  return (
    <Card
      title="Monthly Snapshot"
      className="h-full"
      action={
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={goToPrevMonth}
            className="p-1 h-6 w-6"
          >
            <IconChevronLeft size={14} />
          </Button>
          <span
            className="text-xs font-medium min-w-[70px] text-center"
            style={{ color: colors.text }}
          >
            {monthYearLabel}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            className="p-1 h-6 w-6"
          >
            <IconChevronRight size={14} />
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <span className="text-xs" style={{ color: colors.negative }}>{error}</span>
        </div>
      ) : !hasData ? (
        <div className="text-center py-8">
          <span className="text-xs" style={{ color: colors.muted }}>No transactions this month</span>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Waterfall rows */}
          {waterfallBars.map((bar, index) => {
            const isHovered = hoveredBar === bar.id;
            const prevBar = index > 0 ? waterfallBars[index - 1] : null;
            const showConnector = prevBar && !bar.isTotal;

            return (
              <div key={bar.id}>
                {/* Connector line (horizontal dashed line showing where previous bar ended) */}
                {showConnector && (
                  <div
                    className="relative h-2 mb-0.5"
                    style={{ marginLeft: `${toPosition(bar.start)}%` }}
                  >
                    <div
                      className="absolute left-0 top-1/2 w-px h-2 -translate-y-1/2"
                      style={{ backgroundColor: colors.border }}
                    />
                  </div>
                )}

                {/* Bar row */}
                <div
                  className="flex items-center gap-2 cursor-pointer group"
                  onMouseEnter={() => setHoveredBar(bar.id)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {/* Label */}
                  <div
                    className="w-16 flex-shrink-0 text-right pr-1"
                    style={{
                      fontSize: bar.isTotal ? 11 : 10,
                      fontWeight: bar.isTotal ? 600 : 400,
                      color: isHovered || bar.isTotal ? colors.text : colors.muted,
                    }}
                  >
                    {bar.label}
                  </div>

                  {/* Bar container */}
                  <div
                    className="flex-1 h-5 relative rounded overflow-hidden"
                    style={{ backgroundColor: colors.surfaceLight }}
                  >
                    {/* Bar */}
                    <div
                      className="absolute h-full rounded transition-all duration-200"
                      style={{
                        left: `${toPosition(bar.start)}%`,
                        width: `${Math.max(toWidth(bar.width), 1)}%`,
                        backgroundColor: bar.color,
                        opacity: hoveredBar && !isHovered ? 0.4 : bar.isTotal ? 1 : 0.85,
                        boxShadow: bar.isTotal ? `0 1px 4px ${bar.color}50` : 'none',
                      }}
                    />

                    {/* Running total marker (vertical line at end of running total) */}
                    {!bar.isTotal && (
                      <div
                        className="absolute top-0 bottom-0 w-px transition-opacity"
                        style={{
                          left: `${toPosition(bar.runningTotal)}%`,
                          backgroundColor: colors.text,
                          opacity: isHovered ? 0.5 : 0.15,
                        }}
                      />
                    )}
                  </div>

                  {/* Amount */}
                  <div
                    className="w-20 flex-shrink-0 text-right tabular-nums"
                    style={{
                      fontSize: bar.isTotal ? 11 : 10,
                      fontWeight: bar.isTotal ? 700 : 500,
                      color: bar.color,
                    }}
                  >
                    {bar.isNegative ? '-' : bar.isTotal ? (net >= 0 ? '+' : '-') : '+'}
                    {formatCurrency(bar.value, { currency, compact: true })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Summary footer */}
          <div
            className="flex items-center justify-between pt-2 mt-1 text-xs"
            style={{ borderTop: `1px solid ${colors.border}` }}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: colors.positive }} />
                <span style={{ color: colors.muted }}>Income</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: colors.negative }} />
                <span style={{ color: colors.muted }}>Expense</span>
              </div>
              {data?.debtPayments.total && data.debtPayments.total > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#F59E0B' }} />
                  <span style={{ color: colors.muted }}>Debt</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div style={{ color: colors.muted }}>
                In <span style={{ color: colors.positive }}>+{formatCurrency(totalIncome, { currency, compact: true })}</span>
                {' · '}
                Out <span style={{ color: colors.negative }}>-{formatCurrency(totalExpenses, { currency, compact: true })}</span>
              </div>
              {comparison && comparison.change !== 0 && (
                <div className="mt-0.5" style={{ color: colors.muted }}>
                  Net{' '}
                  <span style={{ color: comparison.change > 0 ? colors.positive : colors.negative }}>
                    {comparison.change > 0 ? '↑' : '↓'} {comparison.change > 0 ? '+' : ''}{comparison.changePercent.toFixed(1)}%
                  </span>
                  {' '}vs {comparison.monthName}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default MonthlySummaryCard;
