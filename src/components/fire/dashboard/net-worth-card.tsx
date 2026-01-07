'use client';

import { useMemo } from 'react';
import {
  retro,
  Card,
  Loader,
  IconTriangleUp,
  IconTriangleDown,
} from '@/components/fire/ui';
import { formatCurrency } from '@/lib/fire/utils';
import { useAssets, useFlowStats } from '@/hooks/fire/use-fire-data';

interface NetWorthCardProps {
  currency?: string;
}

export function NetWorthCard({ currency = 'USD' }: NetWorthCardProps) {
  // Use SWR hooks for data fetching
  const { assets, isLoading: assetsLoading } = useAssets();
  const { stats, isLoading: statsLoading } = useFlowStats();

  const isLoading = assetsLoading || statsLoading;

  // Calculate totals from assets
  const { netWorth, totalAssets, totalDebts } = useMemo(() => {
    const totalAssets = assets.reduce(
      (sum, a) => sum + (a.balance > 0 ? a.balance : 0),
      0
    );
    const totalDebts = assets.reduce(
      (sum, a) => sum + (a.balance < 0 ? Math.abs(a.balance) : 0),
      0
    );
    return {
      netWorth: totalAssets - totalDebts,
      totalAssets,
      totalDebts,
    };
  }, [assets]);

  // Calculate monthly cashflow
  const monthlyChange = useMemo(() => {
    if (!stats) return undefined;
    return (stats.total_income || 0) - (stats.total_expense || 0);
  }, [stats]);

  const changeDirection = monthlyChange ? (monthlyChange >= 0 ? 'up' : 'down') : null;
  const changeColor = changeDirection === 'up' ? retro.positive : retro.negative;
  const ChangeIcon = changeDirection === 'up' ? IconTriangleUp : IconTriangleDown;
  const CARD_HEIGHT = '200px';

  if (isLoading) {
    return (
      <Card title="Net Worth" contentHeight={CARD_HEIGHT}>
        <div className="h-full flex items-center justify-center">
          <Loader size="md" variant="bar" />
        </div>
      </Card>
    );
  }

  return (
    <Card title="Net Worth" contentHeight={CARD_HEIGHT}>
      <div className="h-full flex flex-col justify-center text-center">
        {/* Main Value */}
        <p
          className="text-4xl font-bold tabular-nums"
          style={{ color: retro.text }}
        >
          {formatCurrency(netWorth, { currency })}
        </p>

        {/* Monthly Change */}
        {monthlyChange !== undefined && monthlyChange !== 0 && (
          <p
            className="text-xs font-medium mt-1 inline-flex items-center justify-center gap-1"
            style={{ color: changeColor }}
          >
            <ChangeIcon size={10} />
            {formatCurrency(Math.abs(monthlyChange), { currency })} this month
          </p>
        )}

        {/* Assets / Debts Breakdown */}
        <div
          className="flex items-center justify-center gap-3 mt-3 pt-3 text-xs"
          style={{ borderTop: `1px solid ${retro.bevelMid}` }}
        >
          <span style={{ color: retro.muted }}>
            Assets:{' '}
            <span className="font-bold" style={{ color: retro.text }}>
              {formatCurrency(totalAssets, { currency, compact: true })}
            </span>
          </span>
          <span style={{ color: retro.bevelMid }}>|</span>
          <span style={{ color: retro.muted }}>
            Debts:{' '}
            <span className="font-bold" style={{ color: retro.negative }}>
              {formatCurrency(totalDebts, { currency, compact: true })}
            </span>
          </span>
        </div>
      </div>
    </Card>
  );
}
