'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { assetApi } from '@/lib/fire/api';
import { mutateAssets } from '@/hooks/fire/use-fire-data';
import type { AssetWithBalance } from '@/types/fire';
import { ASSET_TYPE_LABELS } from '@/types/fire';
import {
  colors,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Button,
} from '@/components/fire/ui';

interface EditInvestmentDialogProps {
  asset: AssetWithBalance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function EditInvestmentDialog({
  asset,
  open,
  onOpenChange,
  onUpdated,
}: EditInvestmentDialogProps) {
  const prevOpenRef = useRef(open);
  const [loading, setLoading] = useState(false);
  const [shares, setShares] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when dialog opens
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (!wasOpen && open && asset) {
      setShares(asset.balance.toString());
      setErrors({});
    } else if (!open) {
      setShares('');
      setErrors({});
      setLoading(false);
    }
  }, [open, asset]);

  // Handle save
  const handleSave = async () => {
    if (!asset) return;

    const newShares = parseFloat(shares);
    if (isNaN(newShares) || newShares < 0) {
      setErrors({ shares: 'Please enter a valid number of shares' });
      return;
    }

    setLoading(true);
    try {
      const response = await assetApi.update(asset.id, {
        balance: newShares,
      });

      if (!response.success) {
        toast.error(response.error || 'Failed to update shares');
        setLoading(false);
        return;
      }

      await mutateAssets();
      toast.success(`Shares updated to ${newShares}`);
      onUpdated?.();
      onOpenChange(false);
    } catch {
      toast.error('Failed to update shares');
    } finally {
      setLoading(false);
    }
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Shares</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            {/* Asset info (read-only) */}
            <div
              className="p-3 rounded-md"
              style={{
                backgroundColor: colors.surfaceLight,
                border: `1px solid ${colors.surfaceLight}`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: colors.text }}>
                  {asset.name}
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-md"
                  style={{
                    backgroundColor: colors.surfaceLight,
                    color: colors.text,
                  }}
                >
                  {asset.ticker}
                </span>
              </div>
              <div className="text-xs" style={{ color: colors.muted }}>
                {ASSET_TYPE_LABELS[asset.type]} {asset.market && `· ${asset.market}`}
              </div>
            </div>

            {/* Shares input */}
            <Input
              label="Number of Shares"
              type="number"
              step="any"
              placeholder="0"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              error={errors.shares}
            />

            <div
              className="p-3 rounded-md text-xs"
              style={{
                backgroundColor: colors.surfaceLight,
                border: `1px solid ${colors.surfaceLight}`,
                color: colors.muted,
              }}
            >
              Investment details (ticker, market) cannot be changed. To track a different investment, create a new asset.
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
