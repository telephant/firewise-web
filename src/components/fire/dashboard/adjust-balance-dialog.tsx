'use client';

import { useState, useRef } from 'react';
import {
  colors,
  Button,
  Input,
  LoadingText,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/fire/ui';
import { useFlowData } from '@/contexts/fire/flow-data-context';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/fire/utils';

interface Asset {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

interface AdjustBalanceDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdjustBalanceDialog({
  asset,
  open,
  onOpenChange,
}: AdjustBalanceDialogProps) {
  const { createFlow, refetchAssets } = useFlowData();
  const [newBalance, setNewBalance] = useState('');
  const [loading, setLoading] = useState(false);

  // Track previous open state to detect transitions
  const prevOpenRef = useRef(open);
  const initializedAssetIdRef = useRef<string | null>(null);

  // Handle open/close transitions - replaces useEffect
  const handleOpenChange = (newOpen: boolean) => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = newOpen;

    if (!wasOpen && newOpen && asset) {
      // Dialog just opened - initialize from asset
      if (asset.id !== initializedAssetIdRef.current) {
        setNewBalance(asset.balance.toString());
        initializedAssetIdRef.current = asset.id;
      }
    } else if (wasOpen && !newOpen) {
      // Dialog closed - reset
      setNewBalance('');
      setLoading(false);
      initializedAssetIdRef.current = null;
    }

    onOpenChange(newOpen);
  };

  if (!asset) return null;

  const currentBalance = asset.balance;
  const targetBalance = parseFloat(newBalance) || 0;
  const difference = targetBalance - currentBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (difference === 0) {
      onOpenChange(false);
      return;
    }

    setLoading(true);

    try {
      // Create adjustment flow
      // Positive difference = income, Negative difference = expense
      const flowData = {
        type: difference > 0 ? ('income' as const) : ('expense' as const),
        amount: Math.abs(difference),
        currency: asset.currency,
        from_asset_id: difference < 0 ? asset.id : undefined,
        to_asset_id: difference > 0 ? asset.id : undefined,
        category: 'other',
        date: new Date().toISOString().split('T')[0],
        description: `Balance adjustment for ${asset.name}`,
      };

      const success = await createFlow(flowData as Parameters<typeof createFlow>[0]);

      if (success) {
        // Update asset balance
        const { assetApi } = await import('@/lib/fire/api');
        await assetApi.update(asset.id, { balance: targetBalance });

        // Refresh assets list
        await refetchAssets();

        toast.success('Balance adjusted');
        onOpenChange(false);
      } else {
        toast.error('Failed to adjust balance');
      }
    } catch {
      toast.error('Failed to adjust balance');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => formatCurrency(amount, { currency: asset.currency });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Balance</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: colors.text }}>
                {asset.name}
              </p>
              <p className="text-[10px]" style={{ color: colors.muted }}>
                Current balance: {formatAmount(currentBalance)}
              </p>
            </div>

            <Input
              label="New Balance"
              type="number"
              step="0.01"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              autoFocus
            />

            {difference !== 0 && (
              <div
                className="p-2 rounded text-xs"
                style={{
                  backgroundColor: colors.surfaceLight,
                  color: difference > 0 ? colors.positive : colors.negative,
                }}
              >
                {difference > 0 ? '+ ' : ''}
                {formatAmount(difference)} adjustment
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={loading || difference === 0}>
                {loading ? <LoadingText text="Saving" /> : 'Adjust'}
              </Button>
            </DialogFooter>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
