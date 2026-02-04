'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { debtApi } from '@/lib/fire/api';
import { mutateDebts } from '@/hooks/fire/use-fire-data';
import type { Debt } from '@/types/fire';
import { DEBT_TYPE_LABELS } from '@/types/fire';
import {
  colors,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
} from '@/components/fire/ui';
import { formatCurrency } from '@/lib/fire/utils';

interface DeleteDebtDialogProps {
  debt: Debt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteDebtDialog({
  debt,
  open,
  onOpenChange,
  onDeleted,
}: DeleteDebtDialogProps) {
  const [loading, setLoading] = useState(false);

  if (!debt) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await debtApi.delete(debt.id);
      if (response.success) {
        await mutateDebts();
        toast.success('Debt deleted');
        onDeleted?.();
        onOpenChange(false);
      } else {
        toast.error(response.error || 'Failed to delete debt');
      }
    } catch {
      toast.error('Failed to delete debt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Debt</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            {/* Warning */}
            <div
              className="p-3 rounded-md"
              style={{ backgroundColor: colors.surfaceLight, border: `1px solid ${colors.negative}20` }}
            >
              <p className="text-sm" style={{ color: colors.text }}>
                Are you sure you want to delete this debt?
              </p>
              <p className="text-xs mt-2" style={{ color: colors.muted }}>
                This action cannot be undone.
              </p>
            </div>

            {/* Debt Summary */}
            <div
              className="p-3 rounded-md"
              style={{ backgroundColor: colors.surfaceLight }}
            >
              <div className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                {debt.name}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span style={{ color: colors.muted }}>Type: </span>
                  <span style={{ color: colors.text }}>{DEBT_TYPE_LABELS[debt.debt_type]}</span>
                </div>
                <div>
                  <span style={{ color: colors.muted }}>Balance: </span>
                  <span style={{ color: colors.negative }}>
                    {formatCurrency(debt.current_balance, { currency: debt.currency })}
                  </span>
                </div>
              </div>
            </div>

            {/* Note about flows */}
            <p className="text-[10px]" style={{ color: colors.muted }}>
              Related payment flows will not be deleted, but will no longer be linked to this debt.
            </p>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDelete}
                disabled={loading}
                className="!bg-red-600 hover:!bg-red-700"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
