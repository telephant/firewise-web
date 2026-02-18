'use client';

import { useState } from 'react';
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
  Amount,
} from '@/components/fire/ui';
import { assetApi } from '@/lib/fire/api';
import type { AssetWithBalance, AssetType } from '@/types/fire';

interface DeleteAssetDialogProps {
  asset: AssetWithBalance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
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

export function DeleteAssetDialog({
  asset,
  open,
  onOpenChange,
  onDeleted,
}: DeleteAssetDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!asset) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await assetApi.delete(asset.id);
      if (response.success) {
        onOpenChange(false);
        onDeleted?.();
      } else {
        setError(response.error || 'Failed to delete asset');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  const IconComponent = ASSET_ICONS[asset.type] || ASSET_ICONS.other;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <span style={{ color: colors.negative }}>Delete Asset</span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: colors.text }}>
              Are you sure you want to delete this asset? This action cannot be undone.
            </p>

            {/* Asset Summary */}
            <div
              className="p-3 rounded-md space-y-2"
              style={{ backgroundColor: colors.surfaceLight }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: colors.muted }}>
                  <IconComponent size={16} />
                </span>
                <span className="text-sm font-medium" style={{ color: colors.text }}>
                  {asset.name}
                </span>
              </div>

              <div
                className="text-lg font-bold tabular-nums"
                style={{ color: colors.text }}
              >
                <Amount value={asset.balance} currency={asset.currency} size="lg" weight="bold" />
              </div>

              <div className="text-xs" style={{ color: colors.muted }}>
                {ASSET_TYPE_LABELS[asset.type]}
                {asset.ticker && ` · ${asset.ticker}`}
              </div>
            </div>

            <p className="text-xs" style={{ color: colors.warning }}>
              Note: Related flows will not be deleted, but will no longer be linked to this asset.
            </p>

            {error && (
              <p className="text-xs" style={{ color: colors.negative }}>
                {error}
              </p>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
