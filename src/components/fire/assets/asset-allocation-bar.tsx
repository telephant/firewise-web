'use client';

import { useMemo, useState, useRef } from 'react';
import { colors, Loader, Amount } from '@/components/fire/ui';
import { ASSET_COLORS } from '@/lib/fire/utils';
import { useAssetTypeStats } from '@/hooks/fire';
import type { AssetWithBalance, AssetType } from '@/types/fire';

interface AssetAllocationBarProps {
  // Optional - no longer required, uses stats API
  assets?: AssetWithBalance[];
  isLoading?: boolean;
  currency?: string;
}

// Extended labels for this component (includes "Real Estate" instead of "Property")
const CATEGORY_LABELS: Record<AssetType, string> = {
  cash: 'Cash',
  deposit: 'Deposits',
  stock: 'Stocks',
  etf: 'ETFs',
  bond: 'Bonds',
  real_estate: 'Real Estate',
  crypto: 'Crypto',
  metals: 'Metals',
  other: 'Other',
};

interface Segment {
  type: AssetType;
  value: number;
  percent: number;
  color: string;
  label: string;
  count: number;
}

export function AssetAllocationBar({
  assets = [],
  isLoading: externalLoading = false,
  currency: propCurrency,
}: AssetAllocationBarProps) {
  const [hoveredSegment, setHoveredSegment] = useState<AssetType | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; alignRight: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use stats API for aggregated totals
  const { stats: apiStats, grandTotal: totalValue, currency: apiCurrency, isLoading: statsLoading } = useAssetTypeStats();

  const isLoading = externalLoading || statsLoading;
  const currency = propCurrency || apiCurrency || 'USD';

  // Build segments from API stats
  const segments = useMemo(() => {
    const segs: Segment[] = apiStats
      .filter((stat) => stat.total > 0)
      .map((stat) => {
        const type = stat.type as AssetType;
        return {
          type,
          value: stat.total,
          percent: totalValue > 0 ? (stat.total / totalValue) * 100 : 0,
          color: ASSET_COLORS[type],
          label: CATEGORY_LABELS[type],
          count: stat.count,
        };
      })
      .sort((a, b) => b.value - a.value);

    return segs;
  }, [apiStats, totalValue]);

  const handleSegmentHover = (type: AssetType, e: React.MouseEvent<HTMLDivElement>) => {
    setHoveredSegment(type);
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const segmentRect = e.currentTarget.getBoundingClientRect();
      const segmentCenter = segmentRect.left + segmentRect.width / 2 - containerRect.left;
      const alignRight = segmentCenter > containerRect.width / 2;
      setTooltipPosition({ x: segmentCenter, alignRight });
    }
  };

  const handleMouseLeave = () => {
    setHoveredSegment(null);
    setTooltipPosition(null);
  };

  if (isLoading) {
    return (
      <div
        className="p-4 rounded-lg"
        style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
      >
        <div className="flex items-center justify-center py-4">
          <Loader size="sm" variant="dots" />
        </div>
      </div>
    );
  }

  if (segments.length === 0 && !isLoading) {
    return (
      <div
        className="p-4 rounded-lg"
        style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
      >
        <div className="text-center py-4 text-sm" style={{ color: colors.muted }}>
          No assets yet
        </div>
      </div>
    );
  }

  const hoveredData = hoveredSegment
    ? segments.find((s) => s.type === hoveredSegment)
    : null;

  return (
    <div
      ref={containerRef}
      className="p-4 rounded-lg"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      {/* Total value header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.muted }}>
          Total Assets
        </span>
        <span className="text-lg font-bold tabular-nums" style={{ color: colors.text }}>
          <Amount value={totalValue} currency={currency} size="lg" weight="bold" />
        </span>
      </div>

      {/* Stacked horizontal bar */}
      <div className="relative" onMouseLeave={handleMouseLeave}>
        <div
          className="h-8 rounded-lg overflow-hidden flex"
          style={{ backgroundColor: colors.surfaceLight }}
        >
        {segments.map((seg, index) => (
          <div
            key={seg.type}
            className="h-full transition-all duration-150 relative cursor-pointer"
            style={{
              width: `${seg.percent}%`,
              backgroundColor: seg.color,
              marginLeft: index > 0 ? '2px' : 0,
              opacity: hoveredSegment && hoveredSegment !== seg.type ? 0.4 : 1,
              transform: hoveredSegment === seg.type ? 'scaleY(1.1)' : 'scaleY(1)',
            }}
            onMouseEnter={(e) => handleSegmentHover(seg.type, e)}
          >
            {/* Show percentage label if segment is wide enough */}
            {seg.percent >= 10 && (
              <span
                className="absolute inset-0 flex items-center justify-center text-xs font-semibold"
                style={{ color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
              >
                {seg.percent.toFixed(0)}%
              </span>
            )}
          </div>
        ))}
        </div>

        {/* Floating tooltip */}
        {hoveredData && tooltipPosition && (
          <div
            className="absolute z-50 top-full pt-2"
            style={{
              left: tooltipPosition.alignRight ? 'auto' : tooltipPosition.x,
              right: tooltipPosition.alignRight ? `calc(100% - ${tooltipPosition.x}px)` : 'auto',
              transform: tooltipPosition.alignRight ? 'none' : 'translateX(-50%)',
            }}
            onMouseEnter={() => setHoveredSegment(hoveredData.type)}
            onMouseLeave={handleMouseLeave}
          >
          <div
            className="p-3 rounded-lg shadow-xl min-w-[180px]"
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: hoveredData.color }}
                />
                <span className="text-sm font-medium" style={{ color: colors.text }}>
                  {hoveredData.label}
                </span>
              </div>
              <div className="text-right ml-4">
                <span className="text-sm font-bold tabular-nums" style={{ color: colors.text }}>
                  <Amount value={hoveredData.value} currency={currency} size="sm" weight="bold" compact />
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-2 pt-2 flex items-center justify-between text-xs" style={{ borderTop: `1px solid ${colors.border}` }}>
              <span style={{ color: colors.muted }}>
                {hoveredData.count} {hoveredData.count === 1 ? 'item' : 'items'}
              </span>
              <span style={{ color: colors.accent }}>
                {hoveredData.percent.toFixed(1)}%
              </span>
            </div>
          </div>
          </div>
        )}
        </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
        {segments.map((seg) => (
          <div
            key={seg.type}
            className="flex items-center gap-2 cursor-default"
          >
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-xs" style={{ color: colors.text }}>
              {seg.label}
            </span>
            <span className="text-xs tabular-nums" style={{ color: colors.muted }}>
              {seg.percent.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
