'use client';

import { useState, useMemo } from 'react';
import {
  colors,
  Card,
  Button,
  Loader,
  IconCash,
  IconBank,
  IconStock,
  IconEtf,
  IconBond,
  IconRealEstate,
  IconCrypto,
  IconBox,
  IconEdit,
  IconPlus,
} from '@/components/fire/ui';
import { AdjustBalanceDialog } from './adjust-balance-dialog';
import { AddAssetDialog } from './add-asset-dialog';
import { useAssets, useStockPrices, useAssetInterestSettings } from '@/hooks/fire/use-fire-data';
import { formatCurrency, formatPrice, formatShares, formatPercent } from '@/lib/fire/utils';
import type { Asset, AssetWithBalance } from '@/types/fire';

interface AssetListProps {
  maxItems?: number;
}

const ASSET_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  cash: IconCash,
  deposit: IconBank,
  stock: IconStock,
  etf: IconEtf,
  bond: IconBond,
  real_estate: IconRealEstate,
  crypto: IconCrypto,
  other: IconBox,
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  cash: 'Cash',
  deposit: 'Deposit',
  stock: 'Stock',
  etf: 'ETF',
  bond: 'Bond',
  real_estate: 'Real Estate',
  crypto: 'Crypto',
  other: 'Other',
};

// Asset types where balance represents shares/units, not currency
const SHARE_BASED_TYPES = ['stock', 'etf', 'crypto'];

// Asset types that can be adjusted (currency-based, not share-based)
const ADJUSTABLE_TYPES = ['cash', 'real_estate', 'bond', 'other'];

// Types that open edit dialog instead of adjust dialog
const EDITABLE_TYPES = ['real_estate'];

export function AssetList({ maxItems = 6 }: AssetListProps) {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [addAssetDialogOpen, setAddAssetDialogOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);

  // Use SWR hooks for data fetching
  const { assets, isLoading: assetsLoading } = useAssets();

  // Get all tickers from stock/etf assets (uppercase for API consistency)
  const tickers = useMemo(() => {
    return assets
      .filter((a) => ['stock', 'etf'].includes(a.type) && a.ticker)
      .map((a) => (a.ticker as string).toUpperCase());
  }, [assets]);

  // Use SWR for stock prices (handles caching internally)
  const { prices: stockPrices, isLoading: pricesLoading } = useStockPrices(tickers);

  // Fetch asset interest settings for deposit accounts
  const { settingsMap: interestSettingsMap } = useAssetInterestSettings();

  const handleAssetClick = (asset: Asset) => {
    // Real estate opens edit dialog
    if (EDITABLE_TYPES.includes(asset.type)) {
      setEditAsset(asset);
      setAddAssetDialogOpen(true);
      return;
    }
    // Other adjustable types open adjust dialog
    if (ADJUSTABLE_TYPES.includes(asset.type)) {
      setSelectedAsset(asset);
      setAdjustDialogOpen(true);
    }
  };

  // Calculate total value including real-time stock prices
  const totalValue = useMemo(() => {
    return assets
      .reduce((sum, asset) => {
        if (SHARE_BASED_TYPES.includes(asset.type) && asset.ticker) {
          const price = stockPrices[asset.ticker.toUpperCase()];
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
  // Note: Debts are excluded here - they have their own DebtList card
  const cashAssets = assets.filter((a) => a.type === 'cash');
  const depositAssets = assets.filter((a) => a.type === 'deposit');
  const investmentAssets = assets.filter((a) =>
    ['stock', 'etf', 'bond', 'crypto'].includes(a.type)
  );
  const realEstateAssets = assets.filter((a) => a.type === 'real_estate');
  const otherAssets = assets.filter((a) => a.type === 'other');

  // Combine in display order, limit to maxItems
  const orderedAssets = [
    ...cashAssets,
    ...depositAssets,
    ...investmentAssets,
    ...realEstateAssets,
    ...otherAssets,
  ].slice(0, maxItems);

  // Total asset count for "show more" indicator
  const totalAssetCount = assets.length;

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
    <Card
      title="Assets"
      contentHeight={CARD_HEIGHT}
      action={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setAddAssetDialogOpen(true)}
          className="!px-1.5 !py-0.5"
          title="Add asset"
        >
          <IconPlus size={12} />
        </Button>
      }
    >
      <div className="h-full flex flex-col">
        {orderedAssets.length === 0 ? (
          <div
            className="flex-1 flex items-center justify-center text-xs"
            style={{ color: colors.muted }}
          >
            No assets yet. Add a flow to get started.
          </div>
        ) : (
          <>
            {/* Scrollable asset list */}
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {orderedAssets.map((asset) => {
                const isDeposit = asset.type === 'deposit';
                const IconComponent = ASSET_ICONS[asset.type] || ASSET_ICONS.other;
                const typeLabel = asset.ticker || ASSET_TYPE_LABELS[asset.type] || asset.type;
                const isAdjustable = ADJUSTABLE_TYPES.includes(asset.type);
                const isShareBased = SHARE_BASED_TYPES.includes(asset.type);
                const stockPrice = asset.ticker ? stockPrices[asset.ticker.toUpperCase()] : null;
                const interestSettings = isDeposit ? interestSettingsMap[asset.id] : null;

                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md"
                    style={{ backgroundColor: colors.surfaceLight }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span style={{ color: colors.muted }} className="flex-shrink-0">
                        <IconComponent size={14} />
                      </span>
                      <div className="min-w-0">
                        <p
                          className="text-xs font-medium truncate"
                          style={{ color: colors.text }}
                        >
                          {asset.name}
                        </p>
                        <p
                          className="text-[10px]"
                          style={{ color: colors.muted }}
                        >
                          {typeLabel}
                          {interestSettings && (
                            <span style={{ color: colors.positive }}>
                              {' '}{formatPercent(interestSettings.interest_rate * 100)} APY
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isShareBased && stockPrice ? (
                        // Show shares, price, and total value for stocks/ETFs
                        <div className="text-right">
                          <p
                            className="text-xs font-bold tabular-nums"
                            style={{ color: colors.text }}
                          >
                            {formatCurrency(asset.balance * stockPrice.price, { currency: stockPrice.currency })}
                          </p>
                          <div className="flex items-center gap-1 text-[10px]">
                            <span style={{ color: colors.muted }}>
                              {formatShares(asset.balance)} × {formatPrice(stockPrice.price, stockPrice.currency)}
                            </span>
                            {stockPrice.changePercent != null && (
                              <span
                                style={{
                                  color: stockPrice.changePercent >= 0 ? colors.positive : colors.negative,
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
                            style={{ color: colors.text }}
                          >
                            {formatShares(asset.balance)} shares
                          </p>
                          <div className="text-[10px]" style={{ color: colors.muted }}>
                            {pricesLoading ? (
                              <Loader size="sm" variant="dots" />
                            ) : (
                              'Price unavailable'
                            )}
                          </div>
                        </div>
                      ) : (
                        // Show currency amount for non-share assets
                        <div className="text-right">
                          <p
                            className="text-xs font-bold tabular-nums"
                            style={{ color: colors.text }}
                          >
                            {formatCurrency(asset.balance, { currency: asset.currency })}
                          </p>
                          {/* Show converted balance when available and different currency */}
                          {(asset as AssetWithBalance).converted_balance !== undefined &&
                           (asset as AssetWithBalance).converted_currency &&
                           (asset as AssetWithBalance).converted_currency !== asset.currency && (
                            <p
                              className="text-[10px] tabular-nums"
                              style={{ color: colors.muted }}
                            >
                              ≈ {formatCurrency((asset as AssetWithBalance).converted_balance!, {
                                currency: (asset as AssetWithBalance).converted_currency!,
                              })}
                            </p>
                          )}
                        </div>
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
              {totalAssetCount > maxItems && (
                <p
                  className="text-[10px] text-center pt-1"
                  style={{ color: colors.muted }}
                >
                  +{totalAssetCount - maxItems} more
                </p>
              )}
            </div>

            {/* Total Row - fixed at bottom */}
            <div
              className="flex items-center justify-between pt-2 mt-2 px-2 flex-shrink-0"
              style={{ borderTop: `1px solid ${colors.surfaceLight}` }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: colors.muted }}
              >
                Total
              </span>
              <span
                className="text-sm font-bold tabular-nums"
                style={{ color: colors.text }}
              >
                {formatCurrency(totalValue)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Adjust Balance Dialog */}
      <AdjustBalanceDialog
        asset={selectedAsset}
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
      />

      {/* Add/Edit Asset Dialog */}
      <AddAssetDialog
        open={addAssetDialogOpen}
        onOpenChange={(open) => {
          setAddAssetDialogOpen(open);
          if (!open) setEditAsset(null); // Clear edit asset when closing
        }}
        asset={editAsset}
      />
    </Card>
  );
}
