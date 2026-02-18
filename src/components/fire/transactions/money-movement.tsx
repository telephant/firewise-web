'use client';

import { colors, Card, Loader, SimpleProgressBar, Tag, Amount } from '@/components/fire/ui';

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
            style={{ color: colors.muted }}
          >
            Where It Came From
          </p>
          <div className="space-y-2">
            {sources.length === 0 ? (
              <p className="text-xs" style={{ color: colors.muted }}>
                No income this month
              </p>
            ) : (
              sources.map((source, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: colors.text }}>
                    {source.name}
                  </span>
                  <span
                    className="text-sm font-medium tabular-nums"
                    style={{ color: colors.positive }}
                  >
                    <Amount value={source.amount} currency={currency} size="sm" weight="medium" color="positive" />
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
            style={{ color: colors.muted }}
          >
            →
          </div>
        </div>

        {/* Right Side - How You Allocated It */}
        <div className="flex-1">
          <p
            className="text-xs uppercase tracking-wide font-medium mb-3"
            style={{ color: colors.muted }}
          >
            How You Allocated It
          </p>
          <div className="space-y-2">
            {destinations.length === 0 ? (
              <p className="text-xs" style={{ color: colors.muted }}>
                No outflows this month
              </p>
            ) : (
              destinations.map((dest, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: colors.text }}>
                      {dest.name}
                    </span>
                    <span className="text-xs" style={{ color: colors.muted }}>
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
                            ? colors.info
                            : dest.name === 'Savings'
                            ? colors.positive
                            : dest.name === 'Debt Payoff'
                            ? colors.warning
                            : dest.name === 'Spent'
                            ? colors.negative
                            : colors.muted
                        }
                      />
                    </div>
                    <span
                      className="text-xs font-medium tabular-nums min-w-[70px] text-right"
                      style={{ color: colors.text }}
                    >
                      <Amount value={dest.amount} currency={currency} size="xs" weight="medium" />
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
        style={{ borderTop: `1px solid ${colors.border}` }}
      >
        <div className="flex items-center gap-4">
          <div>
            <span className="text-xs" style={{ color: colors.muted }}>
              In:{' '}
            </span>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: colors.positive }}
            >
              <Amount value={totalIn} currency={currency} size="sm" weight="bold" color="positive" />
            </span>
          </div>
          <div>
            <span className="text-xs" style={{ color: colors.muted }}>
              Allocated:{' '}
            </span>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: colors.info }}
            >
              <Amount value={totalAllocated} currency={currency} size="sm" weight="bold" color="info" />
            </span>
          </div>
          <div>
            <span className="text-xs" style={{ color: colors.muted }}>
              Spent:{' '}
            </span>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: colors.negative }}
            >
              <Amount value={totalSpent} currency={currency} size="sm" weight="bold" color="negative" />
            </span>
          </div>
        </div>
        <div>
          <span className="text-xs" style={{ color: colors.muted }}>
            Net Saved:{' '}
          </span>
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: netSaved >= 0 ? colors.positive : colors.negative }}
          >
            {netSaved >= 0 ? '+' : ''}<Amount value={netSaved} currency={currency} size="sm" weight="bold" color={netSaved >= 0 ? 'positive' : 'negative'} />
          </span>
        </div>
      </div>
    </Card>
  );
}
