'use client';

import { useState, useMemo } from 'react';
import {
  retro,
  Card,
  Button,
  Loader,
  IconCash,
  IconStock,
  IconEtf,
  IconBond,
  IconRealEstate,
  IconCrypto,
  IconDebt,
  IconBox,
  IconEdit,
} from '@/components/fire/ui';
import { AdjustBalanceDialog } from './adjust-balance-dialog';
import { useAssets, useStockPrices } from '@/hooks/fire/use-fire-data';
import type { Asset } from '@/types/fire';

interface AssetListProps {
  maxItems?: number;
}

const ASSET_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  cash: IconCash,
  stock: IconStock,
  etf: IconEtf,
  bond: IconBond,
  real_estate: IconRealEstate,
  crypto: IconCrypto,
  debt: IconDebt,
  other: IconBox,
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  cash: 'Cash',
  stock: 'Stock',
  etf: 'ETF',
  bond: 'Bond',
  real_estate: 'Real Estate',
  crypto: 'Crypto',
  debt: 'Debt',
  other: 'Other',
};

// Asset types where balance represents shares/units, not currency
const SHARE_BASED_TYPES = ['stock', 'etf', 'crypto'];

// Asset types that can be adjusted (currency-based, not share-based)
const ADJUSTABLE_TYPES = ['cash', 'debt', 'real_estate', 'bond', 'other'];

export function AssetList({ maxItems = 6 }: AssetListProps) {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Use SWR hooks for data fetching
  const { assets, isLoading: assetsLoading } = useAssets();

  // Get all tickers from stock/etf assets
  const tickers = useMemo(() => {
    return assets
      .filter((a) => ['stock', 'etf'].includes(a.type) && a.ticker)
      .map((a) => a.ticker as string);
  }, [assets]);

  // Use SWR for stock prices (handles caching internally)
  const { prices: stockPrices, isLoading: pricesLoading } = useStockPrices(tickers);

  const handleAssetClick = (asset: Asset) => {
    if (ADJUSTABLE_TYPES.includes(asset.type)) {
      setSelectedAsset(asset);
      setDialogOpen(true);
    }
  };

  const formatCurrency = (amount: number, curr: string) => {
    if (amount === 0) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPrice = (amount: number, curr: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatShares = (amount: number) => {
    if (amount === 0) return '0';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value == null) return '';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  // Calculate total value including real-time stock prices
  const totalValue = useMemo(() => {
    return assets.reduce((sum, asset) => {
      if (SHARE_BASED_TYPES.includes(asset.type) && asset.ticker) {
        const price = stockPrices[asset.ticker];
        if (price) {
          return sum + asset.balance * price.price;
        }
        // No price available, skip this asset from total
        return sum;
      }
      return sum + asset.balance;
    }, 0);
  }, [assets, stockPrices]);

  // Group assets by category (each asset appears in exactly one group)
  const cashAssets = assets.filter((a) => a.type === 'cash');
  const investmentAssets = assets.filter((a) =>
    ['stock', 'etf', 'bond', 'crypto'].includes(a.type)
  );
  const realEstateAssets = assets.filter((a) => a.type === 'real_estate');
  const debtAssets = assets.filter((a) => a.type === 'debt');
  const otherAssets = assets.filter((a) => a.type === 'other');

  // Combine in display order, limit to maxItems
  const orderedAssets = [
    ...cashAssets,
    ...investmentAssets,
    ...realEstateAssets,
    ...otherAssets,
    ...debtAssets,
  ].slice(0, maxItems);

  const CARD_HEIGHT = '280px';

  if (assetsLoading) {
    return (
      <Card title="Assets" contentHeight={CARD_HEIGHT}>
        <div className="h-full flex items-center justify-center">
          <Loader size="md" variant="bar" />
        </div>
      </Card>
    );
  }

  return (
    <Card title="Assets" contentHeight={CARD_HEIGHT}>
      <div className="h-full flex flex-col">
        {orderedAssets.length === 0 ? (
          <div
            className="flex-1 flex items-center justify-center text-xs"
            style={{ color: retro.muted }}
          >
            No assets yet. Add a flow to get started.
          </div>
        ) : (
          <>
            {/* Scrollable asset list */}
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {orderedAssets.map((asset) => {
                const isDebt = asset.type === 'debt' || asset.balance < 0;
                const IconComponent = ASSET_ICONS[asset.type] || ASSET_ICONS.other;
                const typeLabel =
                  asset.ticker || ASSET_TYPE_LABELS[asset.type] || asset.type;
                const isAdjustable = ADJUSTABLE_TYPES.includes(asset.type);
                const isShareBased = SHARE_BASED_TYPES.includes(asset.type);
                const stockPrice = asset.ticker ? stockPrices[asset.ticker] : null;

                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded-sm"
                    style={{ backgroundColor: retro.surfaceLight }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span style={{ color: retro.muted }} className="flex-shrink-0">
                        <IconComponent size={14} />
                      </span>
                      <div className="min-w-0">
                        <p
                          className="text-xs font-medium truncate"
                          style={{ color: retro.text }}
                        >
                          {asset.name}
                        </p>
                        <p
                          className="text-[10px]"
                          style={{ color: retro.muted }}
                        >
                          {typeLabel}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isShareBased && stockPrice ? (
                        // Show shares, price, and total value for stocks/ETFs
                        <div className="text-right">
                          <p
                            className="text-xs font-bold tabular-nums"
                            style={{ color: retro.text }}
                          >
                            {formatCurrency(asset.balance * stockPrice.price, stockPrice.currency)}
                          </p>
                          <div className="flex items-center gap-1 text-[10px]">
                            <span style={{ color: retro.muted }}>
                              {formatShares(asset.balance)} × {formatPrice(stockPrice.price, stockPrice.currency)}
                            </span>
                            {stockPrice.changePercent != null && (
                              <span
                                style={{
                                  color: stockPrice.changePercent >= 0 ? retro.positive : retro.negative,
                                }}
                              >
                                {formatPercent(stockPrice.changePercent)}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : isShareBased ? (
                        // Show shares only if price not available
                        <div className="text-right">
                          <p
                            className="text-xs font-bold tabular-nums"
                            style={{ color: retro.text }}
                          >
                            {formatShares(asset.balance)} shares
                          </p>
                          <div className="text-[10px]" style={{ color: retro.muted }}>
                            {pricesLoading ? (
                              <Loader size="sm" variant="dots" />
                            ) : (
                              'Price unavailable'
                            )}
                          </div>
                        </div>
                      ) : (
                        // Show currency amount for non-share assets
                        <p
                          className="text-xs font-bold tabular-nums"
                          style={{ color: isDebt ? retro.negative : retro.text }}
                        >
                          {formatCurrency(asset.balance, asset.currency)}
                        </p>
                      )}
                      {isAdjustable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAssetClick(asset)}
                          className="!px-1 !py-0.5"
                          title="Adjust balance"
                        >
                          <IconEdit size={12} />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Show more indicator */}
              {assets.length > maxItems && (
                <p
                  className="text-[10px] text-center pt-1"
                  style={{ color: retro.muted }}
                >
                  +{assets.length - maxItems} more
                </p>
              )}
            </div>

            {/* Total Row - fixed at bottom */}
            <div
              className="flex items-center justify-between pt-2 mt-2 px-2 flex-shrink-0"
              style={{ borderTop: `1px solid ${retro.bevelMid}` }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: retro.muted }}
              >
                Total
              </span>
              <span
                className="text-sm font-bold tabular-nums"
                style={{ color: retro.text }}
              >
                {formatCurrency(totalValue, 'USD')}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Adjust Balance Dialog */}
      <AdjustBalanceDialog
        asset={selectedAsset}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Card>
  );
}
