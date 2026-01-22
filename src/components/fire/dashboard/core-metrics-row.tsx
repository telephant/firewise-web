'use client';

import { useMemo } from 'react';
import { retro, retroStyles, Loader, SimpleProgressBar, IconTriangleUp, IconTriangleDown } from '@/components/fire/ui';
import { formatCurrency, calculateNetWorth } from '@/lib/fire/utils';
import { useAssets, useDebts, useFlowFreedom, useRunway, useUserPreferences } from '@/hooks/fire/use-fire-data';

interface CoreMetricsRowProps {
  currency?: string;
}

/**
 * Row 1: The 3 Core Numbers
 * - Net Worth: What you have
 * - Flow Freedom: How close to FIRE
 * - Runway: How long it lasts
 */
export function CoreMetricsRow({ currency = 'USD' }: CoreMetricsRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <NetWorthMetric currency={currency} />
      <FlowFreedomMetric currency={currency} />
      <RunwayMetric />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Net Worth Metric
// ═══════════════════════════════════════════════════════════════

function NetWorthMetric({ currency }: { currency: string }) {
  const { assets, isLoading: assetsLoading } = useAssets();
  // Fetch all debts, filter out paid_off client-side (to include debts with NULL status)
  const { debts: allDebts, isLoading: debtsLoading } = useDebts();
  const { preferences } = useUserPreferences();

  // Filter out paid_off debts - include active and NULL status debts
  const debts = useMemo(() => {
    return allDebts.filter(d => d.status !== 'paid_off');
  }, [allDebts]);

  // Use preferred currency for display (assets/debts have converted_balance)
  const displayCurrency = preferences?.preferred_currency || currency;

  const { netWorth, totalAssets, totalDebts } = useMemo(() => {
    return calculateNetWorth(assets, debts);
  }, [assets, debts]);

  if (assetsLoading || debtsLoading) {
    return <MetricCardSkeleton label="Net Worth" />;
  }

  const isPositive = netWorth >= 0;

  return (
    <div className="p-4 rounded-sm" style={retroStyles.raised}>
      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: retro.muted }}>
        Net Worth
      </div>
      <div
        className="text-2xl font-bold tabular-nums"
        style={{ color: isPositive ? retro.text : retro.negative }}
      >
        {formatCurrency(netWorth, { currency: displayCurrency, compact: true })}
      </div>
      <div className="text-[10px] mt-2 flex gap-2" style={{ color: retro.muted }}>
        <span>
          Assets <span className="font-bold" style={{ color: retro.positive }}>
            {formatCurrency(totalAssets, { currency: displayCurrency, compact: true })}
          </span>
        </span>
        <span>·</span>
        <span>
          Debts <span className="font-bold" style={{ color: retro.negative }}>
            {formatCurrency(totalDebts, { currency: displayCurrency, compact: true })}
          </span>
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Flow Freedom Metric
// ═══════════════════════════════════════════════════════════════

function FlowFreedomMetric({ currency }: { currency: string }) {
  const { data, isLoading } = useFlowFreedom();

  // Use currency from API response (all values converted to this)
  const dataCurrency = data?.currency || currency;

  if (isLoading) {
    return <MetricCardSkeleton label="Flow Freedom" />;
  }

  if (!data) {
    return (
      <div className="p-4 rounded-sm" style={retroStyles.raised}>
        <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: retro.muted }}>
          Flow Freedom
        </div>
        <div className="text-2xl font-bold" style={{ color: retro.muted }}>
          —
        </div>
        <div className="text-[10px] mt-2" style={{ color: retro.muted }}>
          Track income & expenses to see
        </div>
      </div>
    );
  }

  const percent = Math.round(data.flowFreedom.current * 100);
  const isAchieved = percent >= 100;
  const gap = data.expenses.monthly - data.passiveIncome.monthly;

  // Color based on progress
  const getColor = () => {
    if (percent >= 100) return retro.positive;
    if (percent >= 50) return retro.warning;
    return retro.text;
  };

  return (
    <div className="p-4 rounded-sm" style={retroStyles.raised}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider" style={{ color: retro.muted }}>
          Flow Freedom
        </div>
        {isAchieved && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-sm"
            style={{ backgroundColor: retro.positive + '20', color: retro.positive }}
          >
            FIRE!
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-2xl font-bold tabular-nums" style={{ color: getColor() }}>
          {percent}%
        </span>
      </div>
      {/* Mini progress bar */}
      <SimpleProgressBar
        value={Math.min(percent, 100)}
        size="sm"
        color={getColor()}
        className="mt-2"
      />
      <div className="text-[10px] mt-1.5" style={{ color: retro.muted }}>
        {gap > 0 ? (
          <span>
            <span style={{ color: retro.negative }}>-{formatCurrency(gap, { currency: dataCurrency, compact: true })}</span> gap/mo
          </span>
        ) : (
          <span style={{ color: retro.positive }}>
            +{formatCurrency(Math.abs(gap), { currency: dataCurrency, compact: true })} surplus/mo
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Runway Metric
// ═══════════════════════════════════════════════════════════════

function RunwayMetric() {
  const { data, isLoading, isRefreshing } = useRunway();

  if (isLoading) {
    return <MetricCardSkeleton label="Runway" />;
  }

  if (!data) {
    return (
      <div className="p-4 rounded-sm" style={retroStyles.raised}>
        <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: retro.muted }}>
          Runway
        </div>
        <div className="text-2xl font-bold" style={{ color: retro.muted }}>
          —
        </div>
        <div className="text-[10px] mt-2" style={{ color: retro.muted }}>
          Add data to calculate
        </div>
      </div>
    );
  }

  const { projection } = data;
  const years = projection.runway_years;
  const status = projection.runway_status;
  const isInfinite = status === 'infinite';
  const isCritical = status === 'critical';

  const getColor = () => {
    if (isInfinite) return retro.positive;
    if (isCritical) return retro.negative;
    if (years >= 20) return retro.positive;
    if (years >= 10) return retro.warning;
    return retro.negative;
  };

  const getMessage = () => {
    if (isInfinite) return 'Financially free!';
    if (isCritical) return 'Needs attention';
    if (years >= 30) return 'Very secure';
    if (years >= 20) return 'On track';
    if (years >= 10) return 'Building up';
    return 'Keep saving';
  };

  return (
    <div className="p-4 rounded-sm relative" style={retroStyles.raised}>
      {isRefreshing && (
        <div
          className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-sm animate-pulse"
          style={{ backgroundColor: retro.info + '20', color: retro.info }}
        >
          updating
        </div>
      )}
      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: retro.muted }}>
        Runway
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums" style={{ color: getColor() }}>
          {isInfinite ? '∞' : years}
        </span>
        {!isInfinite && (
          <span className="text-sm" style={{ color: retro.muted }}>
            years
          </span>
        )}
      </div>
      {/* Mini progress bar */}
      <SimpleProgressBar
        value={Math.min((years / 30) * 100, 100)}
        size="sm"
        color={getColor()}
        className="mt-2"
      />
      <div className="text-[10px] mt-1.5" style={{ color: retro.muted }}>
        {getMessage()}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Skeleton Loader
// ═══════════════════════════════════════════════════════════════

function MetricCardSkeleton({ label }: { label: string }) {
  return (
    <div className="p-4 rounded-sm" style={retroStyles.raised}>
      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: retro.muted }}>
        {label}
      </div>
      <div className="flex items-center justify-center py-2">
        <Loader size="sm" variant="bar" />
      </div>
    </div>
  );
}
