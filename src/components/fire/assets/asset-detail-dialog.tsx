'use client';

import {
  retro,
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
  IconBox,
} from '@/components/fire/ui';
import { formatCurrency, formatShares, formatPercent } from '@/lib/fire/utils';
import type { AssetWithBalance, AssetType, RealEstateMetadata } from '@/types/fire';
import type { StockPrice } from '@/lib/fire/api';

interface AssetDetailDialogProps {
  asset: AssetWithBalance | null;
  stockPrices: Record<string, StockPrice>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (asset: AssetWithBalance) => void;
  onAdjust?: (asset: AssetWithBalance) => void;
  onDelete?: (asset: AssetWithBalance) => void;
}

const ASSET_ICONS: Record<AssetType, React.ComponentType<{ size?: number; className?: string }>> = {
  cash: IconCash,
  deposit: IconBank,
  stock: IconStock,
  etf: IconEtf,
  bond: IconBond,
  real_estate: IconRealEstate,
  crypto: IconCrypto,
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
  other: 'Other',
};

const SHARE_BASED_TYPES: AssetType[] = ['stock', 'etf', 'crypto'];
const ADJUSTABLE_TYPES: AssetType[] = ['cash', 'deposit', 'real_estate', 'bond', 'other'];

export function AssetDetailDialog({
  asset,
  stockPrices,
  open,
  onOpenChange,
  onEdit,
  onAdjust,
  onDelete,
}: AssetDetailDialogProps) {
  if (!asset) return null;

  const IconComponent = ASSET_ICONS[asset.type] || ASSET_ICONS.other;
  const isShareBased = SHARE_BASED_TYPES.includes(asset.type);
  const isAdjustable = ADJUSTABLE_TYPES.includes(asset.type);
  const stockPrice = asset.ticker ? stockPrices[asset.ticker.toUpperCase()] : null;

  // Get the display value - use converted_balance if available (preferred currency)
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
              <span style={{ color: retro.muted }}>
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
              className="text-center py-4 rounded-sm"
              style={{ backgroundColor: retro.surfaceLight }}
            >
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ color: retro.text }}
              >
                {formatCurrency(displayValue, { currency: displayCurrency })}
              </p>

              {/* Show original currency value if different from display */}
              {asset.converted_balance !== undefined &&
                asset.converted_currency &&
                displayCurrency !== originalCurrency && (
                  <p className="text-xs mt-1" style={{ color: retro.muted }}>
                    ({formatCurrency(originalValue, { currency: originalCurrency })})
                  </p>
                )}

              {/* Share-based details */}
              {isShareBased && (
                <div className="mt-2 space-y-1">
                  {stockPrice ? (
                    <>
                      <p className="text-xs" style={{ color: retro.muted }}>
                        {formatShares(asset.balance)} shares × {formatCurrency(stockPrice.price, { currency: stockPrice.currency })}
                      </p>
                      {stockPrice.changePercent != null && (
                        <p
                          className="text-xs"
                          style={{
                            color: stockPrice.changePercent >= 0 ? retro.positive : retro.negative,
                          }}
                        >
                          {stockPrice.changePercent >= 0 ? '+' : ''}
                          {formatPercent(stockPrice.changePercent)} today
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs" style={{ color: retro.muted }}>
                      {formatShares(asset.balance)} shares
                    </p>
                  )}
                </div>
              )}

              {/* Type badge */}
              <p
                className="text-xs mt-3 px-2 py-0.5 rounded-sm inline-block"
                style={{
                  backgroundColor: retro.surface,
                  color: retro.text,
                  border: `1px solid ${retro.bevelMid}`,
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
                  valueColor={asset.total_realized_pl >= 0 ? retro.positive : retro.negative}
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
                  style={{ color: retro.negative }}
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
      <span className="text-xs shrink-0" style={{ color: retro.muted }}>
        {label}
      </span>
      <span
        className="text-sm text-right"
        style={{ color: valueColor || retro.text }}
      >
        {value}
      </span>
    </div>
  );
}
