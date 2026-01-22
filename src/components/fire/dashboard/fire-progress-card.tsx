'use client';

import { useMemo } from 'react';
import { retro, Card, ProgressBar, Loader } from '@/components/fire/ui';
import { formatCurrency, calculateNetWorth } from '@/lib/fire/utils';
import { useAssets, useFlowStats } from '@/hooks/fire/use-fire-data';

interface FireProgressCardProps {
  fireTarget?: number;
  currency?: string;
}

export function FireProgressCard({
  fireTarget = 1000000,
  currency = 'USD',
}: FireProgressCardProps) {
  // Use SWR hooks for data fetching
  const { assets, isLoading: assetsLoading } = useAssets();
  const { stats, isLoading: statsLoading } = useFlowStats();

  const isLoading = assetsLoading || statsLoading;

  // Calculate net worth from assets
  const { netWorth } = useMemo(() => calculateNetWorth(assets), [assets]);

  // Calculate savings rate
  const savingsRate = useMemo(() => {
    if (!stats) return 0;
    const income = stats.total_income || 0;
    const expense = stats.total_expense || 0;
    return income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
  }, [stats]);
  // Use Math.round to avoid floating point hydration mismatches
  const progress = Math.min(100, Math.max(0, Math.round((netWorth / fireTarget) * 1000) / 10));

  // Estimate years to FIRE using simplified formula
  // Based on savings rate and assuming 7% annual returns
  const calculateYearsToFire = () => {
    if (!savingsRate || savingsRate <= 0) return null;
    if (netWorth >= fireTarget) return 0;

    const annualReturn = 0.07;
    const remaining = fireTarget - netWorth;

    // Simplified: assume constant savings rate as percentage of income
    // This is a rough estimate
    if (savingsRate >= 50) {
      return Math.round(remaining / (netWorth * 0.15)); // Very rough
    }

    // Using rule of thumb based on savings rate
    // Higher savings rate = faster FIRE
    const yearsMap: Record<number, number> = {
      10: 51,
      20: 37,
      30: 28,
      40: 22,
      50: 17,
      60: 12.5,
      70: 8.5,
      80: 5.5,
      90: 3,
    };

    // Find closest bracket
    const bracket = Math.floor(savingsRate / 10) * 10;
    const years = yearsMap[bracket] || 25;

    // Adjust for current progress
    const adjustedYears = Math.round(years * (1 - progress / 100));
    return Math.max(1, adjustedYears);
  };

  const yearsToFire = calculateYearsToFire();
  const CARD_HEIGHT = '160px';

  if (isLoading) {
    return (
      <Card title="FIRE Progress" contentHeight={CARD_HEIGHT}>
        <div className="h-full flex items-center justify-center">
          <Loader size="md" variant="bar" />
        </div>
      </Card>
    );
  }

  return (
    <Card title="FIRE Progress" contentHeight={CARD_HEIGHT}>
      <div className="h-full flex flex-col justify-center">
        {/* Progress Bar */}
        <ProgressBar
          label=""
          value={progress}
          displayValue={`${progress.toFixed(1)}%`}
        />

        {/* Target Info */}
        <div
          className="flex items-center justify-between mt-3 pt-3 text-xs"
          style={{ borderTop: `1px solid ${retro.bevelMid}` }}
        >
          <span style={{ color: retro.muted }}>
            {formatCurrency(netWorth, { currency, compact: true })} / {formatCurrency(fireTarget, { currency, compact: true })}
          </span>

          {yearsToFire !== null && (
            <span style={{ color: retro.info }}>
              ~{yearsToFire} {yearsToFire === 1 ? 'year' : 'years'} to FIRE
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
