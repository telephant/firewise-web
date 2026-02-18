'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, colors, Loader, Amount } from '@/components/fire/ui';
import { passiveIncomeApi, PassiveIncomeStats } from '@/lib/fire/api';
import { useSnapshots } from '@/hooks/fire';

// Category display config
const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  dividend: { label: 'Dividends', color: '#22c55e' },
  interest: { label: 'Interest', color: '#3b82f6' },
  rental: { label: 'Rental', color: '#f59e0b' },
  passive_other: { label: 'Other', color: '#8b5cf6' },
};

const CATEGORY_ORDER = ['dividend', 'interest', 'rental', 'passive_other'];

export function PassiveIncomeCard() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<PassiveIncomeStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get last snapshot for comparison with current data
  const { snapshots } = useSnapshots({ limit: 1 });

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await passiveIncomeApi.get();
        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.error || 'Failed to fetch passive income');
        }
      } catch (err) {
        setError('Failed to fetch passive income');
        console.error('Passive income error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const currency = data?.currency || 'USD';
  const annualTotal = data?.annual.total || 0;
  const monthlyAvg = annualTotal / 12;
  const hasData = (data?.annual.breakdown?.length || 0) > 0;

  // Calculate comparison: current 12-month average vs last snapshot's average
  const comparison = useMemo(() => {
    if (!snapshots || snapshots.length < 1 || monthlyAvg === 0) return null;
    const lastSnapshot = snapshots[0];
    // Use 12-month average for stable comparison
    const snapshotAvg = lastSnapshot.converted_avg_passive_income_12m ?? lastSnapshot.avg_passive_income_12m ?? 0;
    const change = monthlyAvg - snapshotAvg;
    const changePercent = snapshotAvg !== 0
      ? (change / Math.abs(snapshotAvg)) * 100
      : 0;
    const monthName = new Date(lastSnapshot.year, lastSnapshot.month - 1).toLocaleDateString('en-US', { month: 'short' });
    return { change, changePercent, monthName };
  }, [snapshots, monthlyAvg]);

  // Sort breakdown by category order and get max for bar scaling
  const sortedBreakdown = data?.annual.breakdown
    ?.slice()
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)) || [];
  const maxAmount = Math.max(...sortedBreakdown.map(b => b.amount), 1);

  return (
    <Card title="Passive Income" className="h-full">
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader />
        </div>
      ) : error ? (
        <div className="text-center py-6">
          <span className="text-xs" style={{ color: colors.negative }}>{error}</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Hero - Monthly Avg */}
          <div>
            <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: colors.muted }}>
              Monthly Avg
            </div>
            <span className="text-3xl font-bold" style={{ color: colors.positive }}>
              <Amount value={monthlyAvg} currency={currency} size="2xl" weight="bold" color="positive" decimals={2} />
            </span>
            {comparison && comparison.change !== 0 && (
              <div className="text-xs mt-0.5" style={{ color: colors.muted }}>
                <span style={{ color: comparison.change > 0 ? colors.positive : colors.negative }}>
                  {comparison.change > 0 ? '↑' : '↓'} {comparison.change > 0 ? '+' : ''}{comparison.changePercent.toFixed(1)}%
                </span>
                {' '}vs {comparison.monthName}
              </div>
            )}
          </div>

          {/* Inner card - Last 12 Months breakdown */}
          <div
            className="rounded-lg p-3"
            style={{
              backgroundColor: colors.surfaceLight,
              border: `1px solid ${colors.border}`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-wide" style={{ color: colors.muted }}>
                Last 12 Months
              </span>
              <span className="text-sm font-bold" style={{ color: colors.text }}>
                <Amount value={annualTotal} currency={currency} size="sm" weight="bold" decimals={2} />
              </span>
            </div>

            {/* Category breakdown */}
            {hasData ? (
              <div className="space-y-2">
                {sortedBreakdown.map((item) => {
                  const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.passive_other;
                  const percentage = (item.amount / maxAmount) * 100;
                  return (
                    <div key={item.category} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px]" style={{ color: colors.text }}>
                          {config.label}
                        </span>
                        <span className="text-[11px] font-medium" style={{ color: colors.text }}>
                          <Amount value={item.amount} currency={currency} size={11} weight="medium" decimals={2} />
                        </span>
                      </div>
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: colors.border }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: config.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-2">
                <span className="text-xs" style={{ color: colors.muted }}>
                  No passive income recorded
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default PassiveIncomeCard;
