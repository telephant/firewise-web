'use client';

import { useState, useRef, useCallback } from 'react';
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
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/fire/utils';
import {
  assetApi,
  incomeApi,
  fireExpenseApi,
  assetTransactionApi,
  debtTransactionApi,
} from '@/lib/fire/api';
import {
  mutateAssets,
  mutateTransactions,
  mutateStats,
  mutateExpenseStats,
} from '@/hooks/fire/use-fire-data';
import type { CreateFlowData } from '@/types/fire';

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
  const [newBalance, setNewBalance] = useState('');

  // Inline mutation: Create flow (routes to domain-specific APIs)
  const createFlow = useCallback(async (data: CreateFlowData): Promise<boolean> => {
    const { type, amount, currency, from_asset_id, to_asset_id, category, date, description, metadata } = data;
    try {
      let success = false;
      if (type === 'income') {
        const result = await incomeApi.create({
          category: category || 'other',
          amount,
          to_asset_id: to_asset_id!,
          from_asset_id: from_asset_id || undefined,
          currency,
          date,
          description,
          metadata,
        });
        success = result.success;
      } else if (type === 'expense') {
        if (category === 'pay_debt' && data.debt_id) {
          const result = await debtTransactionApi.create({
            type: 'pay',
            amount,
            debt_id: data.debt_id,
            from_asset_id: from_asset_id || undefined,
            currency,
            date,
            description,
            metadata,
          });
          success = result.success;
        } else {
          const result = await fireExpenseApi.create({
            category: category || 'other',
            amount,
            from_asset_id: from_asset_id!,
            currency,
            date,
            description,
            flow_expense_category_id: data.flow_expense_category_id || undefined,
            metadata,
          });
          success = result.success;
        }
      } else if (type === 'transfer') {
        const flowMetadata = metadata as { shares?: number; action?: string; ticker?: string } | undefined;
        const shares = flowMetadata?.shares;
        const action = flowMetadata?.action;
        if (action === 'buy' || category === 'invest') {
          const result = await assetTransactionApi.create({
            type: 'invest',
            amount,
            ticker: flowMetadata?.ticker,
            shares: shares || 0,
            from_asset_id: from_asset_id || undefined,
            currency,
            date,
            description,
            metadata,
          });
          success = result.success;
        } else if (action === 'sell' || category === 'sell') {
          const result = await assetTransactionApi.create({
            type: 'sell',
            amount,
            ticker: flowMetadata?.ticker,
            shares: Math.abs(shares || 0),
            from_asset_id: from_asset_id || undefined,
            to_asset_id: to_asset_id || undefined,
            currency,
            date,
            description,
            metadata,
          });
          success = result.success;
        } else {
          const result = await assetTransactionApi.create({
            type: 'transfer',
            amount,
            from_asset_id: from_asset_id || undefined,
            to_asset_id: to_asset_id || undefined,
            currency,
            date,
            description,
            metadata,
          });
          success = result.success;
        }
      } else {
        const result = await incomeApi.create({
          category: 'other',
          amount,
          to_asset_id: to_asset_id || from_asset_id || '',
          currency,
          date,
          description,
          metadata,
        });
        success = result.success;
      }
      if (success) {
        await Promise.all([mutateTransactions(), mutateAssets(), mutateStats(), mutateExpenseStats()]);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);
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
        await assetApi.update(asset.id, { balance: targetBalance });

        // Refresh assets list
        await mutateAssets();

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
