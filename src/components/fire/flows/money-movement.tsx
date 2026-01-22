'use client';

import { retro, Card, Loader, SimpleProgressBar, Tag } from '@/components/fire/ui';
import { formatCurrency } from '@/lib/fire/utils';

interface MoneySource {
  name: string;
  amount: number;
}

interface MoneyDestination {
  name: string;
  amount: number;
  percentage: number;
}

interface MoneyMovementProps {
  sources: MoneySource[];
  destinations: MoneyDestination[];
  totalIn: number;
  totalSpent: number;
  totalAllocated: number;
  currency?: string;
  isLoading?: boolean;
  pendingReviewCount?: number;
}

export function MoneyMovement({
  sources,
  destinations,
  totalIn,
  totalSpent,
  totalAllocated,
  currency = 'USD',
  isLoading = false,
  pendingReviewCount = 0,
}: MoneyMovementProps) {
  // Net Saved = Income - Expenses (what you kept after spending)
  const netSaved = totalIn - totalSpent;

  if (isLoading) {
    return (
      <Card title="Money Movement This Month">
        <div className="h-[200px] flex items-center justify-center">
          <Loader size="md" variant="bar" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Money Movement This Month"
      action={
        pendingReviewCount > 0 ? (
          <Tag variant="warning">
            {pendingReviewCount} pending review
          </Tag>
        ) : undefined
      }
    >
      <div className="flex gap-6">
        {/* Left Side - Where It Came From */}
        <div className="flex-1">
          <p
            className="text-xs uppercase tracking-wide font-medium mb-3"
            style={{ color: retro.muted }}
          >
            Where It Came From
          </p>
          <div className="space-y-2">
            {sources.length === 0 ? (
              <p className="text-xs" style={{ color: retro.muted }}>
                No income this month
              </p>
            ) : (
              sources.map((source, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: retro.text }}>
                    {source.name}
                  </span>
                  <span
                    className="text-sm font-medium tabular-nums"
                    style={{ color: retro.positive }}
                  >
                    {formatCurrency(source.amount, { currency })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center - Flow Arrow */}
        <div className="flex flex-col items-center justify-center px-4">
          <div
            className="text-2xl"
            style={{ color: retro.muted }}
          >
            →
          </div>
        </div>

        {/* Right Side - How You Allocated It */}
        <div className="flex-1">
          <p
            className="text-xs uppercase tracking-wide font-medium mb-3"
            style={{ color: retro.muted }}
          >
            How You Allocated It
          </p>
          <div className="space-y-2">
            {destinations.length === 0 ? (
              <p className="text-xs" style={{ color: retro.muted }}>
                No outflows this month
              </p>
            ) : (
              destinations.map((dest, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: retro.text }}>
                      {dest.name}
                    </span>
                    <span className="text-xs" style={{ color: retro.muted }}>
                      {dest.percentage}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <SimpleProgressBar
                        value={dest.percentage}
                        size="sm"
                        color={
                          dest.name === 'Investments'
                            ? retro.info
                            : dest.name === 'Savings'
                            ? retro.positive
                            : dest.name === 'Debt Payoff'
                            ? retro.warning
                            : dest.name === 'Spent'
                            ? retro.negative
                            : retro.muted
                        }
                      />
                    </div>
                    <span
                      className="text-xs font-medium tabular-nums min-w-[70px] text-right"
                      style={{ color: retro.text }}
                    >
                      {formatCurrency(dest.amount, { currency })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Summary Line */}
      <div
        className="mt-4 pt-3 flex items-center justify-between flex-wrap gap-y-2"
        style={{ borderTop: `1px solid ${retro.border}` }}
      >
        <div className="flex items-center gap-4">
          <div>
            <span className="text-xs" style={{ color: retro.muted }}>
              In:{' '}
            </span>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: retro.positive }}
            >
              {formatCurrency(totalIn, { currency })}
            </span>
          </div>
          <div>
            <span className="text-xs" style={{ color: retro.muted }}>
              Allocated:{' '}
            </span>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: retro.info }}
            >
              {formatCurrency(totalAllocated, { currency })}
            </span>
          </div>
          <div>
            <span className="text-xs" style={{ color: retro.muted }}>
              Spent:{' '}
            </span>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: retro.negative }}
            >
              {formatCurrency(totalSpent, { currency })}
            </span>
          </div>
        </div>
        <div>
          <span className="text-xs" style={{ color: retro.muted }}>
            Net Saved:{' '}
          </span>
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: netSaved >= 0 ? retro.positive : retro.negative }}
          >
            {netSaved >= 0 ? '+' : ''}
            {formatCurrency(netSaved, { currency })}
          </span>
        </div>
      </div>
    </Card>
  );
}
