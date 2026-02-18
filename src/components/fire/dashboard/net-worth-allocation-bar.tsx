'use client';

import { useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { colors, Loader, IconPlus, Amount } from '@/components/fire/ui';
import { ASSET_COLORS, ASSET_LABELS, DEBT_LABELS } from '@/lib/fire/utils';
import { useSnapshots } from '@/hooks/fire';
import type { AssetWithBalance, AssetType, Debt, DebtType } from '@/types/fire';

interface NetWorthAllocationBarProps {
  assets: AssetWithBalance[];
  debts: Debt[];
  isLoading?: boolean;
  currency?: string;
  onAddAsset?: () => void;
}

interface WaterfallBar {
  id: string;
  label: string;
  value: number;
  color: string;
  bottom: number;
  top: number;
  runningTotal: number;
  isNegative?: boolean;
  isTotal?: boolean;
}

const MAX_BARS = 8;

export function NetWorthAllocationBar({
  assets,
  debts,
  isLoading = false,
  currency = 'USD',
  onAddAsset,
}: NetWorthAllocationBarProps) {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Get last snapshot for comparison with current data
  const { snapshots } = useSnapshots({ limit: 1 });

  // Group assets by type with individual items
  const { assetBars, totalAssets, assetItems } = useMemo(() => {
    const typeAssets: Record<AssetType, AssetWithBalance[]> = {
      cash: [], deposit: [], stock: [], etf: [],
      bond: [], real_estate: [], crypto: [], metals: [], other: [],
    };

    assets.forEach((asset) => {
      const value = asset.converted_balance ?? asset.balance;
      if (value > 0) {
        typeAssets[asset.type].push(asset);
      }
    });

    const total = assets.reduce((sum, a) => {
      const v = a.converted_balance ?? a.balance;
      return sum + (v > 0 ? v : 0);
    }, 0);

    let bars = (Object.keys(typeAssets) as AssetType[])
      .filter((type) => typeAssets[type].length > 0)
      .map((type) => {
        const typeValue = typeAssets[type].reduce((sum, a) => sum + (a.converted_balance ?? a.balance), 0);
        return {
          type,
          value: typeValue,
          percent: total > 0 ? (typeValue / total) * 100 : 0,
          color: ASSET_COLORS[type],
          label: ASSET_LABELS[type],
        };
      })
      .sort((a, b) => b.value - a.value);

    if (bars.length > MAX_BARS) {
      const mainBars = bars.slice(0, MAX_BARS - 1);
      const otherBars = bars.slice(MAX_BARS - 1);
      const otherTotal = otherBars.reduce((sum, b) => sum + b.value, 0);
      bars = [
        ...mainBars,
        {
          type: 'other' as AssetType,
          value: otherTotal,
          percent: total > 0 ? (otherTotal / total) * 100 : 0,
          color: '#6B7280',
          label: `+${otherBars.length} more`,
        },
      ];
    }

    return { assetBars: bars, totalAssets: total, assetItems: typeAssets };
  }, [assets]);

  // Group debts by type with individual items
  const { debtBars, totalDebts, debtItems } = useMemo(() => {
    const typeDebts: Record<DebtType, Debt[]> = {
      mortgage: [], personal_loan: [], credit_card: [],
      student_loan: [], auto_loan: [], other: [],
    };

    debts.forEach((debt) => {
      const value = debt.converted_balance ?? debt.current_balance;
      if (value > 0) {
        typeDebts[debt.debt_type].push(debt);
      }
    });

    const total = debts.reduce((sum, d) => {
      const v = d.converted_balance ?? d.current_balance;
      return sum + (v > 0 ? v : 0);
    }, 0);

    const bars = (Object.keys(typeDebts) as DebtType[])
      .filter((type) => typeDebts[type].length > 0)
      .map((type) => {
        const typeValue = typeDebts[type].reduce((sum, d) => sum + (d.converted_balance ?? d.current_balance), 0);
        return {
          type,
          value: typeValue,
          label: DEBT_LABELS[type],
        };
      })
      .sort((a, b) => b.value - a.value);

    return { debtBars: bars, totalDebts: total, debtItems: typeDebts };
  }, [debts]);

  const netWorth = totalAssets - totalDebts;

  // Calculate comparison: current live netWorth vs last snapshot
  const comparison = useMemo(() => {
    if (!snapshots || snapshots.length < 1 || netWorth === 0) return null;
    const lastSnapshot = snapshots[0];
    const snapshotNetWorth = lastSnapshot.converted_net_worth ?? lastSnapshot.net_worth;
    const change = netWorth - snapshotNetWorth;
    const changePercent = snapshotNetWorth !== 0 ? (change / Math.abs(snapshotNetWorth)) * 100 : 0;
    const monthName = new Date(lastSnapshot.year, lastSnapshot.month - 1).toLocaleDateString('en-US', { month: 'short' });
    return { change, changePercent, monthName };
  }, [snapshots, netWorth]);

  // Build waterfall bars
  const waterfallBars = useMemo(() => {
    const bars: WaterfallBar[] = [];
    let runningTotal = 0;

    assetBars.forEach((asset) => {
      const newTotal = runningTotal + asset.value;
      bars.push({
        id: `asset-${asset.type}`,
        label: asset.label,
        value: asset.value,
        color: asset.color,
        bottom: runningTotal,
        top: newTotal,
        runningTotal: newTotal,
      });
      runningTotal = newTotal;
    });

    debtBars.forEach((debt) => {
      const newTotal = runningTotal - debt.value;
      bars.push({
        id: `debt-${debt.type}`,
        label: debt.label,
        value: debt.value,
        color: '#EF4444',
        bottom: newTotal,
        top: runningTotal,
        runningTotal: newTotal,
        isNegative: true,
      });
      runningTotal = newTotal;
    });

    bars.push({
      id: 'networth',
      label: 'Net Worth',
      value: Math.abs(netWorth),
      color: netWorth >= 0 ? '#10B981' : '#EF4444',
      bottom: 0,
      top: netWorth,
      runningTotal: netWorth,
      isTotal: true,
    });

    return bars;
  }, [assetBars, debtBars, netWorth]);

  const maxValue = Math.max(totalAssets, Math.abs(netWorth));
  const minValue = Math.min(0, netWorth);

  if (isLoading) {
    return (
      <div className="p-4 rounded-xl" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
        <div className="flex items-center justify-center py-8">
          <Loader size="sm" variant="dots" />
        </div>
      </div>
    );
  }

  // Empty state when no assets and no debts
  const isEmpty = totalAssets === 0 && totalDebts === 0;
  if (isEmpty) {
    return (
      <div
        className="p-5 rounded-xl"
        style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
      >
        {/* Header */}
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider mb-0.5" style={{ color: colors.muted }}>
              Net Worth
            </div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: colors.muted }}>
              <Amount value={0} currency={currency} size="2xl" weight="bold" color="muted" />
            </div>
          </div>
        </div>

        {/* Empty state illustration */}
        <div
          className="flex flex-col items-center justify-center py-8 rounded-lg"
          style={{ backgroundColor: colors.surfaceLight }}
        >
          <div
            className="flex items-center gap-2 mb-3"
            style={{ color: colors.muted }}
          >
            <div className="w-8 h-1 rounded" style={{ backgroundColor: colors.border }} />
            <div className="w-12 h-3 rounded" style={{ backgroundColor: colors.border }} />
            <div className="w-6 h-2 rounded" style={{ backgroundColor: colors.border }} />
            <div className="w-10 h-4 rounded" style={{ backgroundColor: colors.positive + '40' }} />
          </div>
          <p className="text-sm mb-1" style={{ color: colors.text }}>
            Build your wealth waterfall
          </p>
          <p className="text-xs mb-4 text-center max-w-[240px]" style={{ color: colors.muted }}>
            Add assets to visualize how your wealth is distributed
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
      </div>
    );
  }

  const chartHeight = 110;
  const valueRange = maxValue - minValue || 1;
  const valueToY = (value: number) => chartHeight - ((value - minValue) / valueRange) * chartHeight;
  const zeroLineY = valueToY(0);

  const handleBarClick = (barId: string) => {
    if (barId.startsWith('asset-')) {
      const assetType = barId.replace('asset-', '');
      router.push(`/fire/assets?type=${assetType}`);
    } else if (barId.startsWith('debt-')) {
      const debtType = barId.replace('debt-', '');
      router.push(`/fire/assets?tab=debts&type=${debtType}`);
    } else if (barId === 'networth') {
      router.push('/fire/assets');
    }
  };

  // Render item list tooltip (shared between assets and debts)
  const renderItemListTooltip = (
    bar: WaterfallBar,
    items: { id: string; name: string; converted_balance?: number; balance?: number; current_balance?: number }[],
    isDebt: boolean
  ) => {
    const sortedItems = [...items]
      .sort((a, b) => {
        const aVal = a.converted_balance ?? a.balance ?? a.current_balance ?? 0;
        const bVal = b.converted_balance ?? b.balance ?? b.current_balance ?? 0;
        return bVal - aVal;
      })
      .slice(0, 6);

    return (
      <>
        <div className="flex items-center justify-between gap-4 mb-2 pb-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: bar.color }} />
            <span className="text-sm font-medium" style={{ color: colors.text }}>{bar.label}</span>
          </div>
          <span className="text-sm font-bold tabular-nums" style={{ color: isDebt ? colors.negative : colors.positive }}>
            {isDebt ? '−' : ''}<Amount value={bar.value} currency={currency} size="sm" weight="bold" compact />
          </span>
        </div>
        <div className="space-y-1 max-h-[140px] overflow-y-auto">
          {sortedItems.map((item) => {
            const value = item.converted_balance ?? item.balance ?? item.current_balance ?? 0;
            return (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <span className="text-xs truncate" style={{ color: colors.text }}>{item.name}</span>
                <span className="text-xs tabular-nums flex-shrink-0" style={{ color: colors.muted }}>
                  <Amount value={value} currency={currency} size="xs" compact color="muted" />
                </span>
              </div>
            );
          })}
          {items.length > 6 && (
            <div className="text-xs pt-1" style={{ color: colors.muted }}>+{items.length - 6} more</div>
          )}
        </div>
      </>
    );
  };

  // Get tooltip content
  const getTooltipContent = () => {
    if (!hoveredBar) return null;
    const bar = waterfallBars.find(b => b.id === hoveredBar);
    if (!bar) return null;

    if (hoveredBar.startsWith('asset-')) {
      const assetType = hoveredBar.replace('asset-', '') as AssetType;
      return renderItemListTooltip(bar, assetItems[assetType] || [], false);
    }

    if (hoveredBar.startsWith('debt-')) {
      const debtType = hoveredBar.replace('debt-', '') as DebtType;
      return renderItemListTooltip(bar, debtItems[debtType] || [], true);
    }

    if (hoveredBar === 'networth') {
      return (
        <div className="space-y-1.5">
          <div className="flex justify-between gap-4">
            <span className="text-xs" style={{ color: colors.muted }}>Assets</span>
            <span className="text-xs font-semibold tabular-nums" style={{ color: colors.positive }}>
              <Amount value={totalAssets} currency={currency} size="xs" weight="semibold" compact color="positive" />
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-xs" style={{ color: colors.muted }}>Debts</span>
            <span className="text-xs font-semibold tabular-nums" style={{ color: colors.negative }}>
              −<Amount value={totalDebts} currency={currency} size="xs" weight="semibold" compact color="negative" />
            </span>
          </div>
          <div className="flex justify-between gap-4 pt-1.5" style={{ borderTop: `1px solid ${colors.border}` }}>
            <span className="text-xs font-medium" style={{ color: colors.text }}>Net Worth</span>
            <span className="text-xs font-bold tabular-nums" style={{ color: netWorth >= 0 ? colors.positive : colors.negative }}>
              <Amount value={netWorth} currency={currency} size="xs" weight="bold" compact color={netWorth >= 0 ? 'positive' : 'negative'} />
            </span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      ref={containerRef}
      className="p-5 rounded-xl relative"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
    >
      {/* Header */}
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider mb-0.5" style={{ color: colors.muted }}>
            Net Worth
          </div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: netWorth >= 0 ? colors.positive : colors.negative }}>
            <Amount value={netWorth} currency={currency} size="2xl" weight="bold" color={netWorth >= 0 ? 'positive' : 'negative'} />
          </div>
          {comparison && comparison.change !== 0 && (
            <div className="text-xs mt-0.5" style={{ color: colors.muted }}>
              <span style={{ color: comparison.change > 0 ? colors.positive : colors.negative }}>
                {comparison.change > 0 ? '↑' : '↓'} {comparison.change > 0 ? '+' : ''}{comparison.changePercent.toFixed(1)}%
              </span>
              {' '}vs {comparison.monthName}
            </div>
          )}
        </div>
        <div className="flex gap-4 text-xs">
          <div className="text-right">
            <div style={{ color: colors.muted }}>Assets</div>
            <div className="font-semibold" style={{ color: colors.positive }}>
              <Amount value={totalAssets} currency={currency} size="xs" weight="semibold" compact color="positive" />
            </div>
          </div>
          <div className="text-right">
            <div style={{ color: colors.muted }}>Debts</div>
            <div className="font-semibold" style={{ color: totalDebts > 0 ? colors.negative : colors.muted }}>
              <Amount value={totalDebts} currency={currency} size="xs" weight="semibold" compact color={totalDebts > 0 ? 'negative' : 'muted'} />
            </div>
          </div>
        </div>
      </div>

      {/* Waterfall Chart */}
      <div className="relative" style={{ height: chartHeight + 28 }}>
        {/* Zero baseline */}
        {totalDebts > 0 && (
          <div
            className="absolute left-0 right-0"
            style={{
              top: zeroLineY,
              height: 1,
              background: `repeating-linear-gradient(90deg, ${colors.border} 0, ${colors.border} 4px, transparent 4px, transparent 8px)`,
            }}
          />
        )}

        {/* Bars */}
        <div className="flex gap-0.5" style={{ height: chartHeight }}>
          {waterfallBars.map((bar, index) => {
            const topY = valueToY(bar.top);
            const bottomY = valueToY(bar.bottom);
            const barHeight = Math.max(Math.abs(bottomY - topY), 6);
            const barTop = Math.min(topY, bottomY);
            const isHovered = hoveredBar === bar.id;
            const showValue = barHeight > 24;
            const prevBar = index > 0 ? waterfallBars[index - 1] : null;

            return (
              <div key={bar.id} className="relative flex-1" style={{ minWidth: 32, height: chartHeight }}>
                {/* Connector line */}
                {prevBar && !bar.isTotal && (
                  <div
                    className="absolute z-0"
                    style={{
                      top: bar.isNegative ? valueToY(bar.top) : valueToY(bar.bottom),
                      right: '50%',
                      left: '-50%',
                      height: 1,
                      backgroundColor: colors.border,
                    }}
                  />
                )}

                {/* Bar */}
                <div
                  className="absolute left-1 right-1 rounded-sm cursor-pointer transition-all duration-150"
                  style={{
                    top: barTop,
                    height: barHeight,
                    backgroundColor: bar.color,
                    opacity: hoveredBar && !isHovered ? 0.35 : 1,
                    transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                    zIndex: isHovered ? 10 : bar.isTotal ? 5 : 1,
                    boxShadow: bar.isTotal ? `0 2px 8px ${bar.color}40` : isHovered ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    setHoveredBar(bar.id);
                    if (containerRef.current) {
                      const rect = containerRef.current.getBoundingClientRect();
                      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }
                  }}
                  onMouseMove={(e) => {
                    if (containerRef.current) {
                      const rect = containerRef.current.getBoundingClientRect();
                      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredBar(null);
                    setMousePos(null);
                  }}
                  onClick={() => handleBarClick(bar.id)}
                >
                  {showValue && barHeight > 20 && (
                    <div
                      className="absolute inset-0 flex items-center justify-center font-semibold"
                      style={{
                        color: '#fff',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        fontSize: barHeight < 30 ? 9 : 11,
                      }}
                    >
                      {bar.isNegative ? '−' : ''}<Amount value={bar.value} currency={currency} size={barHeight < 30 ? 9 : 11} compact color="#fff" />
                    </div>
                  )}
                </div>

                {/* Label */}
                <div
                  className="absolute left-0 right-0 text-center truncate"
                  style={{
                    top: chartHeight + 4,
                    fontSize: bar.isTotal ? 11 : 10,
                    fontWeight: bar.isTotal ? 600 : 400,
                    color: isHovered || bar.isTotal ? colors.text : colors.muted,
                  }}
                >
                  {bar.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 pt-3" style={{ borderTop: `1px solid ${colors.border}` }}>
        {assetBars.slice(0, 6).map((asset) => (
          <div
            key={asset.type}
            className="flex items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-100"
            style={{ opacity: hoveredBar === `asset-${asset.type}` ? 1 : 0.7 }}
            onMouseEnter={(e) => {
              setHoveredBar(`asset-${asset.type}`);
              if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              }
            }}
            onMouseMove={(e) => {
              if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              }
            }}
            onMouseLeave={() => {
              setHoveredBar(null);
              setMousePos(null);
            }}
            onClick={() => handleBarClick(`asset-${asset.type}`)}
          >
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: asset.color }} />
            <span className="text-xs" style={{ color: colors.muted }}>{asset.label}</span>
          </div>
        ))}
        {debtBars.length > 0 && (
          <>
            <div className="w-px h-3 mx-1" style={{ backgroundColor: colors.border }} />
            {debtBars.slice(0, 3).map((debt) => (
              <div
                key={debt.type}
                className="flex items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-100"
                style={{ opacity: hoveredBar === `debt-${debt.type}` ? 1 : 0.7 }}
                onMouseEnter={(e) => {
                  setHoveredBar(`debt-${debt.type}`);
                  if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }
                }}
                onMouseMove={(e) => {
                  if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredBar(null);
                  setMousePos(null);
                }}
                onClick={() => handleBarClick(`debt-${debt.type}`)}
              >
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#EF4444' }} />
                <span className="text-xs" style={{ color: colors.muted }}>{debt.label}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Hover Tooltip - follows mouse */}
      {hoveredBar && mousePos && (
        <div
          className="absolute z-50 p-3 rounded-lg shadow-xl min-w-[200px] max-w-[260px] pointer-events-none"
          style={{
            left: mousePos.x,
            top: mousePos.y + 20,
            transform: 'translateX(-50%)',
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          {getTooltipContent()}
          <div className="mt-2 pt-2 text-center" style={{ borderTop: `1px solid ${colors.border}` }}>
            <span className="text-xs" style={{ color: colors.accent }}>Click to view details →</span>
          </div>
        </div>
      )}
    </div>
  );
}
