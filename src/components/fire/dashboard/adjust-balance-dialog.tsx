'use client';

import { useState, useEffect } from 'react';
import {
  retro,
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
  const { createFlow } = useFlowData();
  const [newBalance, setNewBalance] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open && asset) {
      setNewBalance(asset.balance.toString());
    }
  }, [open, asset]);

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
      // Positive difference = income (money coming in)
      // Negative difference = expense (money going out)
      const flowData = {
        type: difference > 0 ? 'income' : 'expense',
        amount: Math.abs(difference),
        currency: asset.currency,
        from_asset_id: difference < 0 ? asset.id : undefined,
        to_asset_id: difference > 0 ? asset.id : undefined,
        category: 'adjustment',
        date: new Date().toISOString().split('T')[0],
        description: `Balance adjustment for ${asset.name}`,
      };

      const success = await createFlow(flowData as Parameters<typeof createFlow>[0]);

      if (success) {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: asset.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Balance</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: retro.text }}>
                {asset.name}
              </p>
              <p className="text-[10px]" style={{ color: retro.muted }}>
                Current balance: {formatCurrency(currentBalance)}
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
                  backgroundColor: retro.surfaceLight,
                  color: difference > 0 ? retro.positive : retro.negative,
                }}
              >
                {difference > 0 ? '+ ' : ''}
                {formatCurrency(difference)} adjustment
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
