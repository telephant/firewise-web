'use client';

import { useMemo } from 'react';
import {
  colors,
  Card,
  Loader,
  Amount,
  IconCash,
  IconBank,
  IconStock,
  IconEtf,
  IconBond,
  IconRealEstate,
  IconCrypto,
  IconMetals,
  IconChart,
  IconBox,
} from '@/components/fire/ui';
import { formatPercent } from '@/lib/fire/utils';
import type { AssetWithBalance, AssetType } from '@/types/fire';
import type { StockPrice } from '@/lib/fire/api';
import {
  METAL_OPTIONS,
  convertMetalPrice,
  type MetalType,
  type MetalUnit,
} from '@/components/fire/add-transaction/metals-selector';

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
  metals: { label: 'Metals', icon: IconMetals, countLabel: 'holdings' },
  other: { label: 'Other', icon: IconBox, countLabel: 'items' },
};

const SHARE_BASED_TYPES: AssetType[] = ['stock', 'etf', 'crypto', 'metals'];

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
      metals: { count: 0, totalValue: 0, totalPrevValue: 0, dayChangePercent: 0 },
      other: { count: 0, totalValue: 0, totalPrevValue: 0, dayChangePercent: 0 },
    };

    assets.forEach((asset) => {
      const type = asset.type;
      stats[type].count += 1;

      // Use converted_balance if available (backend handles currency conversion)
      const value = asset.converted_balance ?? asset.balance;
      stats[type].totalValue += value;

      // For metals, get day change from Yahoo price
      if (type === 'metals' && asset.metadata?.metal_type) {
        const metalType = asset.metadata.metal_type as MetalType;
        const metalConfig = METAL_OPTIONS.find(m => m.id === metalType);
        if (metalConfig) {
          const yahooPrice = stockPrices[metalConfig.symbol];
          if (yahooPrice && yahooPrice.changePercent != null) {
            // Use change percent to calculate previous value
            const prevValue = value / (1 + yahooPrice.changePercent / 100);
            stats[type].totalPrevValue += prevValue;
          } else {
            stats[type].totalPrevValue += value;
          }
        }
        return;
      }

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
    (['stock', 'etf', 'crypto', 'metals'] as AssetType[]).forEach((type) => {
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
            className="flex-shrink-0 w-32 h-20 rounded-md flex items-center justify-center"
            style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px' }}
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
        className="flex-shrink-0 w-36 p-3 rounded-md text-left transition-all hover:bg-white/[0.04] cursor-pointer"
        style={{
          ...(selectedType === 'all' ? { backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}`, borderRadius: '6px' } : { backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px' }),
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span style={{ color: colors.accent }}>
            <IconCash size={14} />
          </span>
          <span className="text-xs font-bold" style={{ color: colors.text }}>
            All Assets
          </span>
        </div>
        <div
          className="text-sm font-bold tabular-nums"
          style={{ color: colors.text }}
        >
          <Amount value={grandTotal} currency={currency} size="sm" weight="bold" />
        </div>
        <div className="text-[10px]" style={{ color: colors.muted }}>
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
            className="flex-shrink-0 w-36 p-3 rounded-md text-left transition-all hover:bg-white/[0.04] cursor-pointer"
            style={{
              ...(isSelected ? { backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}`, borderRadius: '6px' } : { backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px' }),
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: colors.muted }}>
                <IconComponent size={14} />
              </span>
              <span className="text-xs font-bold" style={{ color: colors.text }}>
                {config.label}
              </span>
            </div>
            <div
              className="text-sm font-bold tabular-nums"
              style={{ color: colors.text }}
            >
              <Amount value={stats.totalValue} currency={currency} size="sm" weight="bold" />
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span style={{ color: colors.muted }}>
                {stats.count} {stats.count === 1 ? config.countLabel.slice(0, -1) : config.countLabel}
              </span>
              <span style={{ color: colors.accent }}>
                {grandTotal > 0 ? ((stats.totalValue / grandTotal) * 100).toFixed(1) : 0}%
              </span>
              {showDayChange && (
                <span
                  style={{
                    color: stats.dayChangePercent >= 0 ? colors.positive : colors.negative,
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
