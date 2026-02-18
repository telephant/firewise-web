'use client';

import { useMemo, useState, useRef } from 'react';
import { colors, Loader } from '@/components/fire/ui';
import { formatCurrency, ASSET_COLORS } from '@/lib/fire/utils';
import type { AssetWithBalance, AssetType } from '@/types/fire';

interface AssetAllocationBarProps {
  assets: AssetWithBalance[];
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
  assets: AssetWithBalance[];
}

export function AssetAllocationBar({
  assets,
  isLoading = false,
  currency = 'USD',
}: AssetAllocationBarProps) {
  const [hoveredSegment, setHoveredSegment] = useState<AssetType | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; alignRight: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate totals per type
  const { segments, totalValue } = useMemo(() => {
    const typeAssets: Record<AssetType, AssetWithBalance[]> = {
      cash: [],
      deposit: [],
      stock: [],
      etf: [],
      bond: [],
      real_estate: [],
      crypto: [],
      metals: [],
      other: [],
    };

    let total = 0;
    assets.forEach((asset) => {
      const value = asset.converted_balance ?? asset.balance;
      typeAssets[asset.type].push(asset);
      total += value;
    });

    // Build segments array (only include types with value > 0)
    const segs: Segment[] = (Object.keys(typeAssets) as AssetType[])
      .filter((type) => typeAssets[type].length > 0)
      .map((type) => {
        const typeValue = typeAssets[type].reduce(
          (sum, a) => sum + (a.converted_balance ?? a.balance),
          0
        );
        return {
          type,
          value: typeValue,
          percent: total > 0 ? (typeValue / total) * 100 : 0,
          color: ASSET_COLORS[type],
          label: CATEGORY_LABELS[type],
          assets: typeAssets[type].sort(
            (a, b) => (b.converted_balance ?? b.balance) - (a.converted_balance ?? a.balance)
          ),
        };
      })
      .sort((a, b) => b.value - a.value);

    return { segments: segs, totalValue: total };
  }, [assets]);

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

  if (assets.length === 0) {
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
          {formatCurrency(totalValue, { currency })}
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
            className="p-3 rounded-lg shadow-xl min-w-[240px] max-w-[300px]"
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2 pb-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: hoveredData.color }}
                />
                <span className="text-sm font-medium" style={{ color: colors.text }}>
                  {hoveredData.label}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold tabular-nums" style={{ color: colors.text }}>
                  {formatCurrency(hoveredData.value, { currency, compact: true })}
                </span>
                <span className="text-xs ml-1.5" style={{ color: colors.muted }}>
                  {hoveredData.percent.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Asset list */}
            <div className="space-y-0.5 max-h-[180px] overflow-y-auto">
              {hoveredData.assets.map((asset) => {
                const assetValue = asset.converted_balance ?? asset.balance;
                const assetPercent = totalValue > 0 ? (assetValue / totalValue) * 100 : 0;
                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between py-1.5 px-1 rounded hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="text-xs truncate" style={{ color: colors.text }}>
                        {asset.name}
                      </span>
                      {asset.ticker && (
                        <span className="text-[10px] flex-shrink-0" style={{ color: colors.muted }}>
                          {asset.ticker}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-xs tabular-nums" style={{ color: colors.text }}>
                        {formatCurrency(assetValue, { currency, compact: true })}
                      </span>
                      <span className="text-[10px] tabular-nums w-10 text-right" style={{ color: colors.muted }}>
                        {assetPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-2 pt-2 text-[10px] text-center" style={{ borderTop: `1px solid ${colors.border}`, color: colors.muted }}>
              {hoveredData.assets.length} {hoveredData.assets.length === 1 ? 'item' : 'items'}
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
