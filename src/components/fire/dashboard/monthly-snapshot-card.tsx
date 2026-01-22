'use client';

import { useState } from 'react';
import { retro, retroStyles, Loader } from '@/components/fire/ui';
import { formatCurrency } from '@/lib/fire/utils';
import { useFlowFreedom } from '@/hooks/fire/use-fire-data';

interface MonthlySnapshotCardProps {
  currency?: string;
}

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
}

function Tooltip({ children, content }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className="absolute z-50 bottom-full left-0 mb-1 p-2 rounded-sm text-[10px] whitespace-nowrap"
          style={{
            ...retroStyles.raised,
            backgroundColor: retro.surface,
            minWidth: '120px',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

/**
 * Monthly Snapshot Card
 * Simple visual comparison of Income vs Expenses (with debt breakdown)
 */
export function MonthlySnapshotCard({ currency = 'USD' }: MonthlySnapshotCardProps) {
  const { data, isLoading, error } = useFlowFreedom();

  // Use currency from API response (all values are converted to this currency)
  const dataCurrency = data?.currency || currency;

  if (isLoading) {
    return (
      <div className="p-4 rounded-sm" style={retroStyles.raised}>
        <div className="py-6 flex items-center justify-center">
          <Loader size="sm" variant="bar" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 rounded-sm" style={retroStyles.raised}>
        <div className="py-4 text-center">
          <p className="text-sm" style={{ color: retro.muted }}>
            Track income & expenses to see monthly snapshot
          </p>
        </div>
      </div>
    );
  }

  const income = data.passiveIncome.monthly;
  const totalExpenses = data.expenses.monthly;
  const livingExpenses = data.expenses.living / 12; // Convert annual to monthly
  const debtPayments = data.expenses.debtPayments / 12; // Convert annual to monthly
  const gap = totalExpenses - income;
  const maxValue = Math.max(income, totalExpenses);

  // Calculate bar widths as percentage of max
  const incomeWidth = maxValue > 0 ? (income / maxValue) * 100 : 0;
  // For expenses, show living + debt as stacked segments
  const livingWidth = maxValue > 0 ? (livingExpenses / maxValue) * 100 : 0;
  const debtWidth = maxValue > 0 ? (debtPayments / maxValue) * 100 : 0;

  return (
    <div className="p-4 rounded-sm" style={retroStyles.raised}>
      <h3
        className="text-xs font-bold uppercase tracking-wider mb-4"
        style={{ color: retro.text }}
      >
        Monthly Snapshot
      </h3>

      <div className="space-y-3">
        {/* Passive Income Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: retro.muted }}>Passive Income</span>
            <span className="font-bold tabular-nums" style={{ color: retro.positive }}>
              {formatCurrency(income, { currency: dataCurrency, compact: true })}
            </span>
          </div>
          <Tooltip
            content={
              <div className="space-y-1">
                <div className="font-bold mb-1" style={{ color: retro.text }}>Passive Income Breakdown</div>
                {data.passiveIncome.breakdown.dividends > 0 && (
                  <div className="flex justify-between gap-3">
                    <span style={{ color: retro.muted }}>Dividends</span>
                    <span className="tabular-nums" style={{ color: retro.positive }}>
                      {formatCurrency(data.passiveIncome.breakdown.dividends, { currency: dataCurrency, compact: true })}
                    </span>
                  </div>
                )}
                {data.passiveIncome.breakdown.rental > 0 && (
                  <div className="flex justify-between gap-3">
                    <span style={{ color: retro.muted }}>Rental</span>
                    <span className="tabular-nums" style={{ color: retro.positive }}>
                      {formatCurrency(data.passiveIncome.breakdown.rental, { currency: dataCurrency, compact: true })}
                    </span>
                  </div>
                )}
                {data.passiveIncome.breakdown.interest > 0 && (
                  <div className="flex justify-between gap-3">
                    <span style={{ color: retro.muted }}>Interest</span>
                    <span className="tabular-nums" style={{ color: retro.positive }}>
                      {formatCurrency(data.passiveIncome.breakdown.interest, { currency: dataCurrency, compact: true })}
                    </span>
                  </div>
                )}
                {data.passiveIncome.breakdown.other > 0 && (
                  <div className="flex justify-between gap-3">
                    <span style={{ color: retro.muted }}>Other</span>
                    <span className="tabular-nums" style={{ color: retro.positive }}>
                      {formatCurrency(data.passiveIncome.breakdown.other, { currency: dataCurrency, compact: true })}
                    </span>
                  </div>
                )}
                {income === 0 && (
                  <div style={{ color: retro.muted }}>No passive income recorded</div>
                )}
              </div>
            }
          >
            <div
              className="h-6 rounded-sm overflow-hidden cursor-pointer"
              style={retroStyles.sunken}
            >
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${incomeWidth}%`,
                  backgroundColor: retro.positive,
                  minWidth: income > 0 ? '4px' : '0',
                }}
              />
            </div>
          </Tooltip>
        </div>

        {/* Expenses Bar (stacked: living + debt) */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: retro.muted }}>Total Expenses</span>
            <span className="font-bold tabular-nums" style={{ color: retro.negative }}>
              {formatCurrency(totalExpenses, { currency: dataCurrency, compact: true })}
            </span>
          </div>
          <Tooltip
            content={
              <div className="space-y-1">
                <div className="font-bold mb-1" style={{ color: retro.text }}>Expense Breakdown</div>
                <div className="flex justify-between gap-3">
                  <span style={{ color: retro.muted }}>
                    <span style={{ color: retro.negative }}>■</span> Living
                  </span>
                  <span className="tabular-nums" style={{ color: retro.negative }}>
                    {formatCurrency(livingExpenses, { currency: dataCurrency, compact: true })}
                  </span>
                </div>
                {debtPayments > 0 && (
                  <>
                    <div className="border-t my-1" style={{ borderColor: retro.border }} />
                    <div className="font-bold" style={{ color: retro.text }}>
                      <span style={{ color: retro.warning }}>■</span> Debt Payments
                    </div>
                    {data.expenses.debtBreakdown.map((debt, idx) => (
                      <div key={idx} className="flex justify-between gap-3 pl-2">
                        <span style={{ color: retro.muted }}>{debt.name}</span>
                        <span className="tabular-nums" style={{ color: retro.warning }}>
                          {formatCurrency(debt.monthlyPayment, { currency: dataCurrency, compact: true })}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            }
          >
            <div
              className="h-6 rounded-sm overflow-hidden flex cursor-pointer"
              style={retroStyles.sunken}
            >
              {/* Living expenses segment */}
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${livingWidth}%`,
                  backgroundColor: retro.negative,
                  minWidth: livingExpenses > 0 ? '4px' : '0',
                }}
              />
              {/* Debt payments segment */}
              {debtPayments > 0 && (
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${debtWidth}%`,
                    backgroundColor: retro.warning,
                    minWidth: '4px',
                  }}
                />
              )}
            </div>
          </Tooltip>
          {/* Expense breakdown labels */}
          <div className="flex justify-between text-[10px] mt-1">
            <span style={{ color: retro.muted }}>
              <span style={{ color: retro.negative }}>■</span> Living: {formatCurrency(livingExpenses, { currency: dataCurrency, compact: true })}
            </span>
            {debtPayments > 0 && (
              <span style={{ color: retro.muted }}>
                <span style={{ color: retro.warning }}>■</span> Debt: {formatCurrency(debtPayments, { currency: dataCurrency, compact: true })}
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t pt-3" style={{ borderColor: retro.border }}>
          {/* Gap/Surplus */}
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium" style={{ color: retro.text }}>
              {gap > 0 ? 'Monthly Gap' : 'Monthly Surplus'}
            </span>
            <span
              className="text-lg font-bold tabular-nums"
              style={{ color: gap > 0 ? retro.negative : retro.positive }}
            >
              {gap > 0 ? '-' : '+'}{formatCurrency(Math.abs(gap), { currency: dataCurrency, compact: true })}
            </span>
          </div>
          <p className="text-[10px] mt-1" style={{ color: retro.muted }}>
            {gap > 0
              ? 'Amount withdrawn from savings each month'
              : 'Amount added to savings each month'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
