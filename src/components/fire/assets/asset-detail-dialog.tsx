'use client';

import {
  colors,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
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
import { formatCurrency, formatShares, formatPercent } from '@/lib/fire/utils';
import type { AssetWithBalance, AssetType, RealEstateMetadata } from '@/types/fire';
import type { StockPrice } from '@/lib/fire/api';
import {
  METAL_OPTIONS,
  UNIT_OPTIONS,
  convertMetalPrice,
  type MetalType,
  type MetalUnit,
} from '@/components/fire/add-transaction/metals-selector';

interface AssetDetailDialogProps {
  asset: AssetWithBalance | null;
  stockPrices: Record<string, StockPrice>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (asset: AssetWithBalance) => void;
  onAdjust?: (asset: AssetWithBalance) => void;
  onDelete?: (asset: AssetWithBalance) => void;
  currency?: string;
}

const ASSET_ICONS: Record<AssetType, React.ComponentType<{ size?: number; className?: string }>> = {
  cash: IconCash,
  deposit: IconBank,
  stock: IconStock,
  etf: IconEtf,
  bond: IconBond,
  real_estate: IconRealEstate,
  crypto: IconCrypto,
  metals: IconMetals,
  other: IconBox,
};

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  cash: 'Cash',
  deposit: 'Deposit',
  stock: 'Stock',
  etf: 'ETF',
  bond: 'Bond',
  real_estate: 'Real Estate',
  crypto: 'Crypto',
  metals: 'Metals',
  other: 'Other',
};

const SHARE_BASED_TYPES: AssetType[] = ['stock', 'etf', 'crypto', 'metals'];
const ADJUSTABLE_TYPES: AssetType[] = ['cash', 'deposit', 'real_estate', 'bond', 'other'];

export function AssetDetailDialog({
  asset,
  stockPrices,
  open,
  onOpenChange,
  onEdit,
  onAdjust,
  onDelete,
  currency = 'USD',
}: AssetDetailDialogProps) {
  if (!asset) return null;

  const IconComponent = ASSET_ICONS[asset.type] || ASSET_ICONS.other;
  const isShareBased = SHARE_BASED_TYPES.includes(asset.type);
  const isAdjustable = ADJUSTABLE_TYPES.includes(asset.type);
  const isMetal = asset.type === 'metals';
  const stockPrice = asset.ticker ? stockPrices[asset.ticker.toUpperCase()] : null;

  // Helper to get metal display info (for showing weight × price details)
  const getMetalDisplayInfo = (): { pricePerUnit: number; unit: string; changePercent: number | null } | null => {
    if (!isMetal || !asset.metadata?.metal_type) return null;
    const metalType = asset.metadata.metal_type as MetalType;
    const metalUnit = (asset.metadata.metal_unit || 'gram') as MetalUnit;
    const metalConfig = METAL_OPTIONS.find(m => m.id === metalType);
    if (!metalConfig) return null;

    const yahooPrice = stockPrices[metalConfig.symbol];
    if (!yahooPrice) return null;

    // USD price for display only - actual value uses converted_balance from backend
    const pricePerUnit = convertMetalPrice(yahooPrice.price, metalConfig.priceUnit, metalUnit);
    const unitConfig = UNIT_OPTIONS.find(u => u.id === metalUnit);
    return {
      pricePerUnit,
      unit: unitConfig?.shortLabel || metalUnit,
      changePercent: yahooPrice.changePercent,
    };
  };

  const metalDisplayInfo = isMetal ? getMetalDisplayInfo() : null;

  // Get the display value - use converted_balance if available (backend handles currency conversion)
  const displayValue = asset.converted_balance ?? (
    isShareBased && stockPrice
      ? asset.balance * stockPrice.price
      : asset.balance
  );
  const displayCurrency = asset.converted_currency ?? stockPrice?.currency ?? asset.currency;

  // Original value in stock currency (for stocks)
  const originalValue = isShareBased && stockPrice
    ? asset.balance * stockPrice.price
    : asset.balance;
  const originalCurrency = stockPrice?.currency ?? asset.currency;

  // Real estate metadata
  const realEstateMetadata = asset.type === 'real_estate'
    ? (asset.metadata as RealEstateMetadata | null)
    : null;

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <span style={{ color: colors.muted }}>
                <IconComponent size={18} />
              </span>
              <span>{asset.name}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            {/* Value Display */}
            <div
              className="text-center py-4 rounded-md"
              style={{ backgroundColor: colors.surfaceLight }}
            >
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ color: colors.text }}
              >
                {formatCurrency(displayValue, { currency: displayCurrency })}
              </p>

              {/* Show original currency value if different from display */}
              {asset.converted_balance !== undefined &&
                asset.converted_currency &&
                displayCurrency !== originalCurrency && (
                  <p className="text-xs mt-1" style={{ color: colors.muted }}>
                    ({formatCurrency(originalValue, { currency: originalCurrency })})
                  </p>
                )}

              {/* Metal details */}
              {isMetal && (
                <div className="mt-2 space-y-1">
                  {metalDisplayInfo ? (
                    <>
                      <p className="text-xs" style={{ color: colors.muted }}>
                        {formatShares(asset.balance)}{metalDisplayInfo.unit} × {formatCurrency(metalDisplayInfo.pricePerUnit, { currency: 'USD', decimals: 2 })}/{metalDisplayInfo.unit}
                      </p>
                      {metalDisplayInfo.changePercent != null && (
                        <p
                          className="text-xs"
                          style={{
                            color: metalDisplayInfo.changePercent >= 0 ? colors.positive : colors.negative,
                          }}
                        >
                          {metalDisplayInfo.changePercent >= 0 ? '+' : ''}
                          {formatPercent(metalDisplayInfo.changePercent)} today
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs" style={{ color: colors.muted }}>
                      {formatShares(asset.balance)} {String((asset.metadata as Record<string, unknown>)?.metal_unit || 'g')}
                    </p>
                  )}
                </div>
              )}

              {/* Share-based details (stocks, ETFs, crypto) */}
              {isShareBased && !isMetal && (
                <div className="mt-2 space-y-1">
                  {stockPrice ? (
                    <>
                      <p className="text-xs" style={{ color: colors.muted }}>
                        {formatShares(asset.balance)} shares × {formatCurrency(stockPrice.price, { currency: stockPrice.currency })}
                      </p>
                      {stockPrice.changePercent != null && (
                        <p
                          className="text-xs"
                          style={{
                            color: stockPrice.changePercent >= 0 ? colors.positive : colors.negative,
                          }}
                        >
                          {stockPrice.changePercent >= 0 ? '+' : ''}
                          {formatPercent(stockPrice.changePercent)} today
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs" style={{ color: colors.muted }}>
                      {formatShares(asset.balance)} shares
                    </p>
                  )}
                </div>
              )}

              {/* Type badge */}
              <p
                className="text-xs mt-3 px-2 py-0.5 rounded-md inline-block"
                style={{
                  backgroundColor: colors.surface,
                  color: colors.text,
                  border: `1px solid ${colors.surfaceLight}`,
                }}
              >
                {ASSET_TYPE_LABELS[asset.type]}
              </p>
            </div>

            {/* Details Grid */}
            <div className="space-y-3">
              {/* Ticker */}
              {asset.ticker && (
                <DetailRow label="Ticker" value={asset.ticker} />
              )}

              {/* Currency */}
              <DetailRow label="Currency" value={asset.currency} />

              {/* Market */}
              {asset.market && (
                <DetailRow label="Market" value={asset.market} />
              )}

              {/* Realized P/L */}
              {asset.total_realized_pl != null && asset.total_realized_pl !== 0 && (
                <DetailRow
                  label="Realized P/L"
                  value={formatCurrency(asset.total_realized_pl, { currency: asset.currency })}
                  valueColor={asset.total_realized_pl >= 0 ? colors.positive : colors.negative}
                />
              )}

              {/* Real Estate Details */}
              {realEstateMetadata && (
                <>
                  {realEstateMetadata.city && realEstateMetadata.country && (
                    <DetailRow
                      label="Location"
                      value={`${realEstateMetadata.city}, ${realEstateMetadata.country}`}
                    />
                  )}
                  {realEstateMetadata.purchase_price != null && (
                    <DetailRow
                      label="Purchase Price"
                      value={formatCurrency(realEstateMetadata.purchase_price, { currency: asset.currency })}
                    />
                  )}
                  {realEstateMetadata.purchase_date && (
                    <DetailRow
                      label="Purchase Date"
                      value={formatDate(realEstateMetadata.purchase_date) || ''}
                    />
                  )}
                  {realEstateMetadata.size_sqm != null && (
                    <DetailRow
                      label="Size"
                      value={`${realEstateMetadata.size_sqm.toLocaleString()} sqm`}
                    />
                  )}
                </>
              )}

              {/* Last Updated */}
              {asset.balance_updated_at && (
                <DetailRow
                  label="Balance Updated"
                  value={formatDate(asset.balance_updated_at) || ''}
                />
              )}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2">
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onDelete(asset);
                    onOpenChange(false);
                  }}
                  style={{ color: colors.negative }}
                >
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {isAdjustable && onAdjust && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onAdjust(asset);
                    onOpenChange(false);
                  }}
                >
                  Adjust
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onEdit(asset);
                    onOpenChange(false);
                  }}
                >
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for detail rows
function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs shrink-0" style={{ color: colors.muted }}>
        {label}
      </span>
      <span
        className="text-sm text-right"
        style={{ color: valueColor || colors.text }}
      >
        {value}
      </span>
    </div>
  );
}
