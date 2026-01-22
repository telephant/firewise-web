'use client';

import { useState } from 'react';
import { retro, retroStyles, Loader } from '@/components/fire/ui';
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
      <div className="rounded-sm p-4" style={retroStyles.raised}>
        <div className="py-8 flex flex-col items-center justify-center gap-2">
          <Loader size="sm" variant="bar" />
          <span className="text-xs" style={{ color: retro.muted }}>
            AI is analyzing...
          </span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-sm p-4" style={retroStyles.raised}>
        <div className="py-6 text-center">
          <p className="text-sm" style={{ color: retro.muted }}>
            Unable to calculate runway
          </p>
          <p className="text-xs mt-1" style={{ color: retro.muted }}>
            Add assets and expenses to see projection
          </p>
        </div>
      </div>
    );
  }

  const { summary, projection } = data;
  const displayCurrency = summary.currency || currency;

  return (
    <div className="rounded-sm p-4" style={retroStyles.raised}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: retro.text }}
        >
          Runway Details
        </h3>
        {isRefreshing && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-sm animate-pulse"
            style={{ backgroundColor: retro.info + '20', color: retro.info }}
          >
            Updating...
          </span>
        )}
      </div>

      {/* Monthly Cash Flow Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] mb-1">
          <span style={{ color: retro.muted }}>Monthly Expenses</span>
          <span className="font-bold tabular-nums" style={{ color: retro.text }}>
            {formatCurrency(summary.monthly.expenses, { currency: displayCurrency, compact: true })}
          </span>
        </div>

        {/* Stacked bar */}
        <div
          className="h-5 flex"
          style={{ ...retroStyles.sunken, padding: '2px' }}
        >
          {summary.monthly.passive_income > 0 && (
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${Math.min((summary.monthly.passive_income / summary.monthly.expenses) * 100, 100)}%`,
                backgroundColor: retro.positive,
                minWidth: '4px',
              }}
            />
          )}
          {summary.monthly.gap > 0 && (
            <div
              className="h-full flex-1"
              style={{ backgroundColor: retro.negative + '40' }}
            />
          )}
        </div>

        <div className="flex justify-between text-[10px] mt-1">
          <span className="font-bold tabular-nums" style={{ color: retro.positive }}>
            +{formatCurrency(summary.monthly.passive_income, { currency: displayCurrency, compact: true })} income
          </span>
          {summary.monthly.gap > 0 && (
            <span className="font-bold tabular-nums" style={{ color: retro.negative }}>
              -{formatCurrency(summary.monthly.gap, { currency: displayCurrency, compact: true })} gap
            </span>
          )}
        </div>
      </div>

      {/* Data Quality Warning */}
      {(summary.data_quality.income.warning || summary.data_quality.expenses.warning) && (
        <div
          className="p-2 rounded-sm mb-3 text-[10px]"
          style={{
            backgroundColor: retro.warning + '10',
            border: `1px solid ${retro.warning}30`,
            color: retro.warning,
          }}
        >
          ⚠️ {summary.data_quality.expenses.warning || summary.data_quality.income.warning}
        </div>
      )}

      {/* Top Suggestion (just one) */}
      {projection.suggestions.length > 0 && (
        <div
          className="p-3 rounded-sm mb-3"
          style={{
            backgroundColor: retro.info + '10',
            border: `1px solid ${retro.info}30`,
          }}
        >
          <p className="text-xs" style={{ color: retro.text }}>
            💡 {projection.suggestions[0]}
          </p>
        </div>
      )}

      {/* Expandable AI Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full text-left text-[10px] uppercase tracking-wide flex items-center justify-between py-2"
        style={{ color: retro.muted }}
      >
        <span>AI Analysis Details</span>
        <span>{showDetails ? '▲' : '▼'}</span>
      </button>

      {showDetails && (
        <div
          className="p-3 rounded-sm space-y-3 mt-1"
          style={retroStyles.sunken}
        >
          {/* Assumptions */}
          <div>
            <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: retro.muted }}>
              Assumptions
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span style={{ color: retro.muted }}>Inflation</span>
                <span className="font-bold tabular-nums" style={{ color: retro.text }}>
                  {(projection.assumptions.inflation_rate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: retro.muted }}>Strategy</span>
                <span className="font-medium text-[11px]" style={{ color: retro.text }}>
                  {projection.strategy.withdrawal_order.slice(0, 3).join(' → ')}
                </span>
              </div>
            </div>
            {projection.assumptions.reasoning && (
              <p className="text-[10px] mt-2" style={{ color: retro.muted }}>
                {projection.assumptions.reasoning}
              </p>
            )}
          </div>

          {/* Growth Rates */}
          {Object.keys(projection.assumptions.growth_rates).length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: retro.muted }}>
                Growth Rates
              </div>
              <div className="text-xs space-y-0.5">
                {Object.entries(projection.assumptions.growth_rates).slice(0, 5).map(([asset, rate]) => (
                  <div key={asset} className="flex justify-between">
                    <span className="truncate max-w-[140px]" style={{ color: retro.muted }}>{asset}</span>
                    <span className="font-bold tabular-nums" style={{ color: retro.text }}>
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
              <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: retro.muted }}>
                Key Milestones
              </div>
              <div className="text-xs space-y-1">
                {projection.milestones.slice(0, 3).map((milestone, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="font-bold tabular-nums shrink-0" style={{ color: retro.info }}>
                      Yr {milestone.year}
                    </span>
                    <span style={{ color: retro.text }}>{milestone.event}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* More Suggestions */}
          {projection.suggestions.length > 1 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: retro.muted }}>
                More Suggestions
              </div>
              <ul className="text-xs space-y-1">
                {projection.suggestions.slice(1, 3).map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-1" style={{ color: retro.text }}>
                    <span style={{ color: retro.info }}>•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={() => mutate()}
        disabled={isRefreshing}
        className="mt-3 w-full py-1.5 text-xs rounded-sm transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{
          backgroundColor: retro.surfaceLight,
          border: `1px solid ${retro.border}`,
          color: retro.muted,
        }}
      >
        {isRefreshing ? 'Refreshing...' : 'Refresh Analysis'}
      </button>
    </div>
  );
}
