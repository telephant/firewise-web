'use client';

import Link from 'next/link';
import { colors, Loader, SimpleProgressBar } from '@/components/fire/ui';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { formatCurrency } from '@/lib/fire/utils';
import { useFlowFreedom } from '@/hooks/fire/use-fire-data';

interface FlowFreedomCardProps {
  currency?: string;
}

export function FlowFreedomCard({ currency = 'USD' }: FlowFreedomCardProps) {
  const { data, isLoading, error } = useFlowFreedom();

  if (isLoading) {
    return (
      <div className="rounded-md p-4" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px' }}>
        <div className="py-8 flex items-center justify-center">
          <Loader size="sm" variant="bar" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-md p-4" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px' }}>
        <div className="py-6 text-center">
          <p className="text-sm" style={{ color: colors.muted }}>
            Start tracking passive income to see Flow Freedom
          </p>
        </div>
      </div>
    );
  }

  const currentPercent = Math.round(data.flowFreedom.current * 100);
  const afterDebtsPercent = Math.round(data.flowFreedom.afterDebtsPaid * 100);
  const hasDebts = data.expenses.debtPayments > 0;
  const gap = data.expenses.monthly - data.passiveIncome.monthly;
  const isAchieved = currentPercent >= 100;

  return (
    <div className="rounded-md p-4" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px' }}>
      {/* Header with big percentage */}
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: colors.text }}
        >
          Flow Freedom
        </h3>
        <div className="flex items-center gap-2">
          {isAchieved && (
            <span
              className="text-xs px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: colors.positive + '20',
                color: colors.positive,
                border: `1px solid ${colors.positive}40`,
              }}
            >
              Achieved!
            </span>
          )}
          <span
            className="text-2xl font-bold tabular-nums"
            style={{ color: isAchieved ? colors.positive : colors.text }}
          >
            {currentPercent}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <SimpleProgressBar
          value={currentPercent}
          color={isAchieved ? colors.positive : colors.accent}
        />
      </div>

      {/* Stats Rows */}
      <div className="space-y-2 mb-4">
        {/* Passive Income Row */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: colors.muted }}>
            Passive Income
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold tabular-nums" style={{ color: colors.positive }}>
              {formatCurrency(data.passiveIncome.monthly, { currency, compact: true })}/mo
            </span>
            <span className="text-xs tabular-nums" style={{ color: colors.muted }}>
              ({formatCurrency(data.passiveIncome.annual, { currency, compact: true })}/yr)
            </span>
          </div>
        </div>

        {/* Expenses Row with Tooltip */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: colors.muted }}>
            Expenses
            {hasDebts && (
              <TooltipPrimitive.Provider delayDuration={0}>
                <TooltipPrimitive.Root>
                  <TooltipPrimitive.Trigger asChild>
                    <span
                      className="ml-1 cursor-help underline decoration-dotted"
                      style={{ color: colors.muted }}
                    >
                      (incl. debt)
                    </span>
                  </TooltipPrimitive.Trigger>
                  <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                      sideOffset={6}
                      className="p-2 text-xs z-50 rounded-md animate-in fade-in-0 zoom-in-95"
                      style={{
                        backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px',
                        color: colors.text,
                      }}
                    >
                      <div className="space-y-1 min-w-[180px]">
                        <div className="flex justify-between gap-4">
                          <span>Living expenses:</span>
                          <span className="font-bold tabular-nums">
                            {formatCurrency(data.expenses.living / 12, { currency, compact: true })}/mo
                          </span>
                        </div>
                        <div
                          className="border-t pt-1 mt-1"
                          style={{ borderColor: colors.border }}
                        >
                          <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: colors.muted }}>
                            Debt Payments
                          </div>
                          {data.expenses.debtBreakdown.map((debt, idx) => (
                            <div key={idx} className="flex justify-between gap-4">
                              <span className="truncate max-w-[120px]">{debt.name}</span>
                              <span className="font-bold tabular-nums">
                                {formatCurrency(debt.monthlyPayment, { currency, compact: true })}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div
                          className="border-t pt-1 mt-1 flex justify-between gap-4"
                          style={{ borderColor: colors.border }}
                        >
                          <span className="font-medium">Total:</span>
                          <span className="font-bold tabular-nums">
                            {formatCurrency(data.expenses.monthly, { currency, compact: true })}/mo
                          </span>
                        </div>
                      </div>
                    </TooltipPrimitive.Content>
                  </TooltipPrimitive.Portal>
                </TooltipPrimitive.Root>
              </TooltipPrimitive.Provider>
            )}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold tabular-nums" style={{ color: colors.negative }}>
              {formatCurrency(data.expenses.monthly, { currency, compact: true })}/mo
            </span>
            <span className="text-xs tabular-nums" style={{ color: colors.muted }}>
              ({formatCurrency(data.expenses.annual, { currency, compact: true })}/yr)
            </span>
          </div>
        </div>

        {/* Divider */}
        <div
          className="border-t my-2"
          style={{ borderColor: colors.border }}
        />

        {/* Gap/Surplus Row */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: colors.text }}>
            {gap > 0 ? 'Monthly Gap' : 'Monthly Surplus'}
          </span>
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: gap > 0 ? colors.warning : colors.positive }}
          >
            {gap > 0 ? '-' : '+'}{formatCurrency(Math.abs(gap), { currency, compact: true })}
          </span>
        </div>
      </div>

      {/* Secondary Info Box */}
      <div
        className="p-3 rounded-md space-y-1.5"
        style={{ backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}`, borderRadius: '6px' }}
      >
        {/* After Debts */}
        {hasDebts && (
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: colors.muted }}>
              After debts paid {data.flowFreedom.debtPayoffYear && `(${data.flowFreedom.debtPayoffYear})`}
            </span>
            <span
              className="text-xs font-bold tabular-nums"
              style={{ color: afterDebtsPercent >= 100 ? colors.positive : colors.info }}
            >
              {afterDebtsPercent}% Freedom
            </span>
          </div>
        )}

        {/* Time to Freedom */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: colors.muted }}>
            Time to 100%
          </span>
          <span className="text-xs font-bold" style={{ color: colors.text }}>
            {data.timeToFreedom.years !== null ? (
              data.timeToFreedom.years <= 0 ? (
                'Now!'
              ) : (
                `~${data.timeToFreedom.years} years`
              )
            ) : (
              'Need more data'
            )}
          </span>
        </div>

        {/* Data confidence */}
        {data.timeToFreedom.dataMonths > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-[10px]" style={{ color: colors.muted }}>
              Based on {data.timeToFreedom.dataMonths} months data
            </span>
            {data.timeToFreedom.trend.direction !== 'stable' && (
              <span
                className="text-[10px]"
                style={{
                  color: data.timeToFreedom.trend.direction === 'up' ? colors.positive : colors.negative,
                }}
              >
                {data.timeToFreedom.trend.direction === 'up' ? '↑ Growing' : '↓ Declining'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Excluded Flows Warning */}
      {data.pendingReview.count > 0 && (
        <Link
          href="/fire/transactions?needs_review=true"
          className="mt-3 p-2 rounded-md flex items-center justify-between text-xs hover:opacity-80 transition-opacity"
          style={{
            backgroundColor: colors.warning + '15',
            border: `1px solid ${colors.warning}40`,
          }}
        >
          <span style={{ color: colors.warning }}>
            {data.pendingReview.count} flow{data.pendingReview.count > 1 ? 's' : ''} excluded
            {data.pendingReview.hasPassiveIncome && data.pendingReview.hasExpenses
              ? ' (income & expenses)'
              : data.pendingReview.hasPassiveIncome
                ? ' (income)'
                : ' (expenses)'}{' '}
            - needs review
          </span>
          <span style={{ color: colors.warning }}>Review →</span>
        </Link>
      )}
    </div>
  );
}
