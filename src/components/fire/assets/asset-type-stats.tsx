'use client';

import { useMemo } from 'react';
import {
  retro,
  retroStyles,
  Card,
  Loader,
  IconCash,
  IconBank,
  IconStock,
  IconEtf,
  IconBond,
  IconRealEstate,
  IconCrypto,
  IconBox,
} from '@/components/fire/ui';
import { formatCurrency, formatPercent } from '@/lib/fire/utils';
import type { AssetWithBalance, AssetType } from '@/types/fire';
import type { StockPrice } from '@/lib/fire/api';

interface AssetTypeStatsProps {
  assets: AssetWithBalance[];
  stockPrices: Record<string, StockPrice>;
  isLoading?: boolean;
  onTypeClick?: (type: AssetType | 'all') => void;
  selectedType?: AssetType | 'all';
  currency?: string;
}

const ASSET_TYPE_CONFIG: Record<AssetType, {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  countLabel: string;
}> = {
  cash: { label: 'Cash', icon: IconCash, countLabel: 'accounts' },
  deposit: { label: 'Deposits', icon: IconBank, countLabel: 'accounts' },
  stock: { label: 'Stocks', icon: IconStock, countLabel: 'holdings' },
  etf: { label: 'ETFs', icon: IconEtf, countLabel: 'holdings' },
  bond: { label: 'Bonds', icon: IconBond, countLabel: 'holdings' },
  real_estate: { label: 'Real Estate', icon: IconRealEstate, countLabel: 'properties' },
  crypto: { label: 'Crypto', icon: IconCrypto, countLabel: 'coins' },
  other: { label: 'Other', icon: IconBox, countLabel: 'items' },
};

const SHARE_BASED_TYPES: AssetType[] = ['stock', 'etf', 'crypto'];

export function AssetTypeStats({
  assets,
  stockPrices,
  isLoading = false,
  onTypeClick,
  selectedType = 'all',
  currency = 'USD',
}: AssetTypeStatsProps) {
  // Calculate stats per asset type
  const typeStats = useMemo(() => {
    const stats: Record<AssetType, {
      count: number;
      totalValue: number;
      totalPrevValue: number; // For weighted average day change calculation
      dayChangePercent: number;
    }> = {
      cash: { count: 0, totalValue: 0, totalPrevValue: 0, dayChangePercent: 0 },
      deposit: { count: 0, totalValue: 0, totalPrevValue: 0, dayChangePercent: 0 },
      stock: { count: 0, totalValue: 0, totalPrevValue: 0, dayChangePercent: 0 },
      etf: { count: 0, totalValue: 0, totalPrevValue: 0, dayChangePercent: 0 },
      bond: { count: 0, totalValue: 0, totalPrevValue: 0, dayChangePercent: 0 },
      real_estate: { count: 0, totalValue: 0, totalPrevValue: 0, dayChangePercent: 0 },
      crypto: { count: 0, totalValue: 0, totalPrevValue: 0, dayChangePercent: 0 },
      other: { count: 0, totalValue: 0, totalPrevValue: 0, dayChangePercent: 0 },
    };

    assets.forEach((asset) => {
      const type = asset.type;
      stats[type].count += 1;

      // Use converted_balance if available (backend handles currency conversion for all types)
      const value = asset.converted_balance ?? asset.balance;
      stats[type].totalValue += value;

      // For share-based assets, calculate previous value using stock's change percent
      // This keeps everything in the same currency (preferred currency)
      if (SHARE_BASED_TYPES.includes(type) && asset.ticker) {
        const price = stockPrices[asset.ticker.toUpperCase()];
        if (price && price.changePercent != null) {
          // prevValue = currentValue / (1 + changePercent/100)
          const prevValue = value / (1 + price.changePercent / 100);
          stats[type].totalPrevValue += prevValue;
        } else {
          stats[type].totalPrevValue += value; // No change
        }
      }
    });

    // Calculate weighted average day change percent for investment types
    (['stock', 'etf', 'crypto'] as AssetType[]).forEach((type) => {
      if (stats[type].totalPrevValue > 0) {
        stats[type].dayChangePercent =
          ((stats[type].totalValue - stats[type].totalPrevValue) / stats[type].totalPrevValue) * 100;
      }
    });

    return stats;
  }, [assets, stockPrices]);

  // Only show types that have assets
  const activeTypes = (Object.keys(typeStats) as AssetType[]).filter(
    (type) => typeStats[type].count > 0
  );

  // Calculate grand total
  const grandTotal = useMemo(() => {
    return activeTypes.reduce((sum, type) => sum + typeStats[type].totalValue, 0);
  }, [activeTypes, typeStats]);

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 w-32 h-20 rounded-sm flex items-center justify-center"
            style={{ ...retroStyles.raised, backgroundColor: retro.surface }}
          >
            <Loader size="sm" variant="dots" />
          </div>
        ))}
      </div>
    );
  }

  if (activeTypes.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {/* Total Card */}
      <button
        onClick={() => onTypeClick?.('all')}
        className="flex-shrink-0 w-36 p-3 rounded-sm text-left transition-all"
        style={{
          ...(selectedType === 'all' ? retroStyles.sunken : retroStyles.raised),
          backgroundColor: selectedType === 'all' ? retro.surfaceLight : retro.surface,
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span style={{ color: retro.accent }}>
            <IconCash size={14} />
          </span>
          <span className="text-xs font-bold" style={{ color: retro.text }}>
            All Assets
          </span>
        </div>
        <div
          className="text-sm font-bold tabular-nums"
          style={{ color: retro.text }}
        >
          {formatCurrency(grandTotal, { currency })}
        </div>
        <div className="text-[10px]" style={{ color: retro.muted }}>
          {assets.length} total
        </div>
      </button>

      {/* Type Cards */}
      {activeTypes.map((type) => {
        const config = ASSET_TYPE_CONFIG[type];
        const stats = typeStats[type];
        const IconComponent = config.icon;
        const isSelected = selectedType === type;
        const showDayChange = SHARE_BASED_TYPES.includes(type) && stats.dayChangePercent !== 0;

        return (
          <button
            key={type}
            onClick={() => onTypeClick?.(type)}
            className="flex-shrink-0 w-36 p-3 rounded-sm text-left transition-all"
            style={{
              ...(isSelected ? retroStyles.sunken : retroStyles.raised),
              backgroundColor: isSelected ? retro.surfaceLight : retro.surface,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: retro.muted }}>
                <IconComponent size={14} />
              </span>
              <span className="text-xs font-bold" style={{ color: retro.text }}>
                {config.label}
              </span>
            </div>
            <div
              className="text-sm font-bold tabular-nums"
              style={{ color: retro.text }}
            >
              {formatCurrency(stats.totalValue, { currency })}
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span style={{ color: retro.muted }}>
                {stats.count} {stats.count === 1 ? config.countLabel.slice(0, -1) : config.countLabel}
              </span>
              <span style={{ color: retro.accent }}>
                {grandTotal > 0 ? ((stats.totalValue / grandTotal) * 100).toFixed(1) : 0}%
              </span>
              {showDayChange && (
                <span
                  style={{
                    color: stats.dayChangePercent >= 0 ? retro.positive : retro.negative,
                  }}
                >
                  {stats.dayChangePercent >= 0 ? '+' : ''}
                  {formatPercent(stats.dayChangePercent)}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
