'use client';

import { useState } from 'react';
import { colors, Loader, SimpleProgressBar, Button } from '@/components/fire/ui';
import { formatCurrency } from '@/lib/fire/utils';
import { useRunway } from '@/hooks/fire/use-fire-data';

interface RunwayCardProps {
  currency?: string;
}

/**
 * Simplified Runway Card
 * Shows the essential runway info with expandable AI details
 */
export function RunwayCard({ currency = 'USD' }: RunwayCardProps) {
  const { data, isLoading, isRefreshing, error, mutate } = useRunway();
  const [showDetails, setShowDetails] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-md p-4" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px' }}>
        <div className="py-8 flex flex-col items-center justify-center gap-2">
          <Loader size="sm" variant="bar" />
          <span className="text-xs" style={{ color: colors.muted }}>
            AI is analyzing...
          </span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-md p-4" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px' }}>
        <div className="py-6 text-center">
          <p className="text-sm" style={{ color: colors.muted }}>
            Unable to calculate runway
          </p>
          <p className="text-xs mt-1" style={{ color: colors.muted }}>
            Add assets and expenses to see projection
          </p>
        </div>
      </div>
    );
  }

  const { summary, projection } = data;
  const displayCurrency = summary.currency || currency;

  return (
    <div className="rounded-md p-4" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: colors.text }}
        >
          Runway Details
        </h3>
        {isRefreshing && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-md animate-pulse"
            style={{ backgroundColor: colors.info + '20', color: colors.info }}
          >
            Updating...
          </span>
        )}
      </div>

      {/* Monthly Cash Flow Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] mb-1">
          <span style={{ color: colors.muted }}>Monthly Expenses</span>
          <span className="font-bold tabular-nums" style={{ color: colors.text }}>
            {formatCurrency(summary.monthly.expenses, { currency: displayCurrency, compact: true })}
          </span>
        </div>

        {/* Stacked bar */}
        <SimpleProgressBar
          segments={[
            ...(summary.monthly.passive_income > 0 ? [{
              value: Math.min((summary.monthly.passive_income / summary.monthly.expenses) * 100, 100),
              color: colors.positive,
            }] : []),
            ...(summary.monthly.gap > 0 ? [{
              value: (summary.monthly.gap / summary.monthly.expenses) * 100,
              color: colors.negative + '60',
            }] : []),
          ]}
          size="md"
        />

        <div className="flex justify-between text-[10px] mt-1">
          <span className="font-bold tabular-nums" style={{ color: colors.positive }}>
            +{formatCurrency(summary.monthly.passive_income, { currency: displayCurrency, compact: true })} income
          </span>
          {summary.monthly.gap > 0 && (
            <span className="font-bold tabular-nums" style={{ color: colors.negative }}>
              -{formatCurrency(summary.monthly.gap, { currency: displayCurrency, compact: true })} gap
            </span>
          )}
        </div>
      </div>

      {/* Data Quality Warning */}
      {(summary.data_quality.income.warning || summary.data_quality.expenses.warning) && (
        <div
          className="p-2 rounded-md mb-3 text-[10px]"
          style={{
            backgroundColor: colors.warning + '10',
            border: `1px solid ${colors.warning}30`,
            color: colors.warning,
          }}
        >
          ⚠️ {summary.data_quality.expenses.warning || summary.data_quality.income.warning}
        </div>
      )}

      {/* Top Suggestion (just one) */}
      {projection.suggestions.length > 0 && (
        <div
          className="p-3 rounded-md mb-3"
          style={{
            backgroundColor: colors.info + '10',
            border: `1px solid ${colors.info}30`,
          }}
        >
          <p className="text-xs" style={{ color: colors.text }}>
            💡 {projection.suggestions[0]}
          </p>
        </div>
      )}

      {/* Expandable AI Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full text-left text-[10px] uppercase tracking-wide flex items-center justify-between py-2 transition-colors duration-150 hover:text-[#EDEDEF] cursor-pointer"
        style={{ color: colors.muted }}
      >
        <span>AI Analysis Details</span>
        <span>{showDetails ? '▲' : '▼'}</span>
      </button>

      {showDetails && (
        <div
          className="p-3 rounded-md space-y-3 mt-1"
          style={{ backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}`, borderRadius: '6px' }}
        >
          {/* Assumptions */}
          <div>
            <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: colors.muted }}>
              Assumptions
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span style={{ color: colors.muted }}>Inflation</span>
                <span className="font-bold tabular-nums" style={{ color: colors.text }}>
                  {(projection.assumptions.inflation_rate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: colors.muted }}>Strategy</span>
                <span className="font-medium text-[11px]" style={{ color: colors.text }}>
                  {projection.strategy.withdrawal_order.slice(0, 3).join(' → ')}
                </span>
              </div>
            </div>
            {projection.assumptions.reasoning && (
              <p className="text-[10px] mt-2" style={{ color: colors.muted }}>
                {projection.assumptions.reasoning}
              </p>
            )}
          </div>

          {/* Growth Rates */}
          {Object.keys(projection.assumptions.growth_rates).length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: colors.muted }}>
                Growth Rates
              </div>
              <div className="text-xs space-y-0.5">
                {Object.entries(projection.assumptions.growth_rates).slice(0, 5).map(([asset, rate]) => (
                  <div key={asset} className="flex justify-between">
                    <span className="truncate max-w-[140px]" style={{ color: colors.muted }}>{asset}</span>
                    <span className="font-bold tabular-nums" style={{ color: colors.text }}>
                      {(rate * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Milestones */}
          {projection.milestones.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: colors.muted }}>
                Key Milestones
              </div>
              <div className="text-xs space-y-1">
                {projection.milestones.slice(0, 3).map((milestone, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="font-bold tabular-nums shrink-0" style={{ color: colors.info }}>
                      Yr {milestone.year}
                    </span>
                    <span style={{ color: colors.text }}>{milestone.event}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* More Suggestions */}
          {projection.suggestions.length > 1 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: colors.muted }}>
                More Suggestions
              </div>
              <ul className="text-xs space-y-1">
                {projection.suggestions.slice(1, 3).map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-1" style={{ color: colors.text }}>
                    <span style={{ color: colors.info }}>•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <Button
        onClick={() => mutate()}
        disabled={isRefreshing}
        variant="primary"
        size="sm"
        className="mt-3 w-full"
      >
        {isRefreshing ? 'Refreshing...' : 'Refresh Analysis'}
      </Button>
    </div>
  );
}
