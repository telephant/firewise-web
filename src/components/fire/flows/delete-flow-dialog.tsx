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
  getCategoryIcon,
} from '@/components/fire/ui';
import { formatCurrency } from '@/lib/fire/utils';
import { flowApi } from '@/lib/fire/api';
import type { FlowWithDetails } from '@/types/fire';

interface DeleteFlowDialogProps {
  flow: FlowWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteFlowDialog({
  flow,
  open,
  onOpenChange,
  onDeleted,
}: DeleteFlowDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!flow) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCategoryLabel = (category: string | null): string => {
    if (!category) return 'Other';
    const labels: Record<string, string> = {
      salary: 'Salary',
      bonus: 'Bonus',
      freelance: 'Freelance',
      rental: 'Rental Income',
      gift: 'Gift',
      dividend: 'Dividend',
      interest: 'Interest',
      invest: 'Investment',
      sell: 'Sell',
      reinvest: 'Reinvest',
      transfer: 'Transfer',
      deposit: 'Deposit',
      expense: 'Expense',
      pay_debt: 'Debt Payment',
    };
    return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getFlowTypeColor = (type: string): string => {
    switch (type) {
      case 'income': return colors.positive;
      case 'expense': return colors.negative;
      default: return colors.text;
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await flowApi.delete(flow.id);
      if (response.success) {
        onOpenChange(false);
        onDeleted?.();
      } else {
        setError(response.error || 'Failed to delete flow');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  const from = flow.from_asset?.name ||
    (flow.metadata as Record<string, unknown>)?.source_name as string ||
    'External';
  const to = flow.to_asset?.name || flow.debt?.name || 'External';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <span style={{ color: colors.negative }}>Delete Flow</span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: colors.text }}>
              Are you sure you want to delete this flow? This action cannot be undone.
            </p>

            {/* Flow Summary */}
            <div
              className="p-3 rounded-md space-y-2"
              style={{ backgroundColor: colors.surfaceLight }}
            >
              <div className="flex items-center gap-2">
                {getCategoryIcon(flow.category || flow.type, 16)}
                <span className="text-sm font-medium" style={{ color: colors.text }}>
                  {getCategoryLabel(flow.category)}
                </span>
              </div>

              <div
                className="text-lg font-bold tabular-nums"
                style={{ color: getFlowTypeColor(flow.type) }}
              >
                {flow.type === 'income' ? '+' : flow.type === 'expense' ? '−' : ''}
                {formatCurrency(
                  flow.converted_amount ?? flow.amount,
                  { currency: flow.converted_currency ?? flow.currency }
                )}
              </div>
              {flow.converted_amount !== undefined &&
                flow.converted_currency &&
                flow.converted_currency !== flow.currency && (
                <div className="text-xs tabular-nums" style={{ color: colors.muted }}>
                  ({formatCurrency(flow.amount, { currency: flow.currency })})
                </div>
              )}

              <div className="text-xs" style={{ color: colors.muted }}>
                {formatDate(flow.date)} · {from} → {to}
              </div>
            </div>

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
