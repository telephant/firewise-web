'use client';

import { useMemo } from 'react';
import {
  colors,
  Card,
  Loader,
  IconTriangleUp,
  IconTriangleDown,
  IconPlus,
  Amount,
} from '@/components/fire/ui';
import { formatCurrency } from '@/lib/fire/utils';
import { useNetWorthStats, useTransactionStats, useSnapshots } from '@/hooks/fire/use-fire-data';

interface NetWorthCardProps {
  currency?: string;
  onAddAsset?: () => void;
}

export function NetWorthCard({ currency: _currency, onAddAsset }: NetWorthCardProps) {
  // Use dedicated net worth stats API (handles all currency conversion server-side)
  const { netWorth, totalAssets, totalDebts, currency, isLoading: netWorthLoading } = useNetWorthStats();
  const { stats, isLoading: statsLoading } = useTransactionStats();
  const { snapshots } = useSnapshots({ limit: 1 });

  const isLoading = netWorthLoading || statsLoading;
  const isEmpty = totalAssets === 0 && totalDebts === 0;

  // Calculate monthly cashflow
  const monthlyChange = useMemo(() => {
    if (!stats) return undefined;
    return (stats.total_income || 0) - (stats.total_expense || 0);
  }, [stats]);

  // Calculate comparison: current live data vs last month's snapshot
  const comparison = useMemo(() => {
    if (!snapshots || snapshots.length < 1 || netWorth === 0) return null;
    const lastSnapshot = snapshots[0];
    // Use converted net worth if available (user's preferred currency)
    const snapshotNetWorth = lastSnapshot.converted_net_worth ?? lastSnapshot.net_worth;
    const change = netWorth - snapshotNetWorth;
    const changePercent = snapshotNetWorth !== 0 ? (change / Math.abs(snapshotNetWorth)) * 100 : 0;
    const monthName = new Date(lastSnapshot.year, lastSnapshot.month - 1).toLocaleDateString('en-US', { month: 'short' });
    return { change, changePercent, monthName };
  }, [snapshots, netWorth]);

  const changeDirection = monthlyChange ? (monthlyChange >= 0 ? 'up' : 'down') : null;
  const changeColor = changeDirection === 'up' ? colors.positive : colors.negative;
  const ChangeIcon = changeDirection === 'up' ? IconTriangleUp : IconTriangleDown;
  const CARD_HEIGHT = '160px';

  if (isLoading) {
    return (
      <Card title="Net Worth" contentHeight={CARD_HEIGHT}>
        <div className="h-full flex items-center justify-center">
          <Loader size="md" variant="bar" />
        </div>
      </Card>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <Card title="Net Worth" contentHeight={CARD_HEIGHT}>
        <div className="h-full flex flex-col items-center justify-center text-center px-4">
          <p className="text-sm mb-2" style={{ color: colors.muted }}>
            Start tracking your wealth
          </p>
          <p className="text-xs mb-4" style={{ color: colors.muted }}>
            Add your first asset to see your net worth
          </p>
          {onAddAsset && (
            <button
              onClick={onAddAsset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{
                backgroundColor: colors.accent,
                color: '#fff',
              }}
            >
              <IconPlus size={14} />
              Add Asset
            </button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card title="Net Worth" contentHeight={CARD_HEIGHT}>
      <div className="h-full flex flex-col justify-center text-center">
        {/* Main Value */}
        <p className="tabular-nums">
          <Amount value={netWorth} currency={currency} size={36} weight="bold" />
        </p>

        {/* Monthly Change */}
        {monthlyChange !== undefined && monthlyChange !== 0 && (
          <p className="mt-1 inline-flex items-center justify-center gap-1" style={{ color: changeColor }}>
            <ChangeIcon size={10} />
            <Amount value={Math.abs(monthlyChange)} currency={currency} size={12} color={changeColor} weight="medium" />
            <span className="text-xs"> this month</span>
          </p>
        )}

        {/* Comparison vs Previous Month */}
        {comparison && comparison.change !== 0 && (
          <p className="text-xs mt-0.5" style={{ color: colors.muted }}>
            <span style={{ color: comparison.change > 0 ? colors.positive : colors.negative }}>
              {comparison.change > 0 ? '↑' : '↓'} {comparison.change > 0 ? '+' : ''}{comparison.changePercent.toFixed(1)}%
            </span>
            {' '}vs {comparison.monthName}
          </p>
        )}

        {/* Assets / Debts Breakdown */}
        <div
          className="flex items-center justify-center gap-3 mt-3 pt-3 text-xs"
          style={{ borderTop: `1px solid ${colors.surfaceLight}` }}
        >
          <span style={{ color: colors.muted }}>
            Assets:{' '}
            <Amount value={totalAssets} currency={currency} size={12} weight="bold" compact />
          </span>
          <span style={{ color: colors.surfaceLight }}>|</span>
          <span style={{ color: colors.muted }}>
            Debts:{' '}
            <Amount value={totalDebts} currency={currency} size={12} weight="bold" color="negative" compact />
          </span>
        </div>
      </div>
    </Card>
  );
}
