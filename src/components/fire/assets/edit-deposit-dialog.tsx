'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { assetApi, assetInterestSettingsApi, PaymentPeriod, PAYMENT_PERIOD_LABELS } from '@/lib/fire/api';
import { mutateAssets } from '@/hooks/fire/use-fire-data';
import type { AssetWithBalance } from '@/types/fire';
import {
  colors,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Select,
  CurrencyCombobox,
  Button,
  Loader,
} from '@/components/fire/ui';

interface EditDepositDialogProps {
  asset: AssetWithBalance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

const PAYMENT_PERIOD_OPTIONS = Object.entries(PAYMENT_PERIOD_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function EditDepositDialog({
  asset,
  open,
  onOpenChange,
  onUpdated,
}: EditDepositDialogProps) {
  const prevOpenRef = useRef(open);
  const [loading, setLoading] = useState(false);
  const [loadingAsset, setLoadingAsset] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [depositBalance, setDepositBalance] = useState('');
  const [depositInterestRate, setDepositInterestRate] = useState('');
  const [depositPaymentPeriod, setDepositPaymentPeriod] = useState<PaymentPeriod>('monthly');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form from asset
  const initializeFromAsset = async (assetToEdit: AssetWithBalance) => {
    setName(assetToEdit.name);
    setCurrency(assetToEdit.currency);
    setDepositBalance(assetToEdit.balance.toString());
    setLoadingAsset(true);

    try {
      const res = await assetApi.get(assetToEdit.id);
      if (res.success && res.data) {
        const freshAsset = res.data;
        setName(freshAsset.name);
        setCurrency(freshAsset.currency);
        setDepositBalance(freshAsset.balance.toString());

        const metadata = freshAsset.metadata as { interest_rate?: number; payment_period?: PaymentPeriod } | null;
        setDepositInterestRate(metadata?.interest_rate ? (metadata.interest_rate * 100).toString() : '');
        setDepositPaymentPeriod(metadata?.payment_period || 'monthly');
      } else {
        const metadata = assetToEdit.metadata as { interest_rate?: number; payment_period?: PaymentPeriod } | null;
        setDepositInterestRate(metadata?.interest_rate ? (metadata.interest_rate * 100).toString() : '');
        setDepositPaymentPeriod(metadata?.payment_period || 'monthly');
      }
    } catch {
      const metadata = assetToEdit.metadata as { interest_rate?: number; payment_period?: PaymentPeriod } | null;
      setDepositInterestRate(metadata?.interest_rate ? (metadata.interest_rate * 100).toString() : '');
      setDepositPaymentPeriod(metadata?.payment_period || 'monthly');
    } finally {
      setLoadingAsset(false);
    }

    setErrors({});
  };

  // Reset form
  const resetForm = () => {
    setName('');
    setCurrency('USD');
    setDepositBalance('');
    setDepositInterestRate('');
    setDepositPaymentPeriod('monthly');
    setLoadingAsset(false);
    setErrors({});
    setLoading(false);
  };

  // Initialize form when dialog opens
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (!wasOpen && open && asset) {
      void initializeFromAsset(asset);
    } else if (!open) {
      resetForm();
    }
  }, [open, asset]);

  // Handle save
  const handleSave = async () => {
    if (!asset) return;

    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    const newBalance = parseFloat(depositBalance);
    if (isNaN(newBalance) || newBalance < 0) {
      newErrors.depositBalance = 'Please enter a valid balance';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const interestRate = parseFloat(depositInterestRate);
      const metadata: Record<string, unknown> = {};
      if (!isNaN(interestRate) && interestRate > 0) {
        metadata.interest_rate = interestRate / 100;
        metadata.payment_period = depositPaymentPeriod;
      }

      const response = await assetApi.update(asset.id, {
        name: name.trim(),
        currency,
        balance: newBalance,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      if (!response.success) {
        toast.error(response.error || 'Failed to update deposit');
        setLoading(false);
        return;
      }

      // Update interest settings via dedicated API
      if (!isNaN(interestRate) && interestRate > 0) {
        try {
          await assetInterestSettingsApi.upsert(asset.id, {
            interest_rate: interestRate / 100,
            payment_period: depositPaymentPeriod,
          });
        } catch {
          // Ignore - metadata is already saved
        }
      }

      await mutateAssets();
      toast.success(`"${name}" updated`);
      onUpdated?.();
      onOpenChange(false);
    } catch {
      toast.error('Failed to update deposit');
    } finally {
      setLoading(false);
    }
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Deposit</DialogTitle>
        </DialogHeader>

        <DialogBody>
          {loadingAsset ? (
            <div className="flex items-center justify-center py-8">
              <Loader size="sm" />
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                label="Name"
                placeholder="e.g., Chase Savings"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Balance"
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={depositBalance}
                  onChange={(e) => setDepositBalance(e.target.value)}
                  error={errors.depositBalance}
                />
                <CurrencyCombobox
                  label="Currency"
                  value={currency}
                  onChange={setCurrency}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="APY %"
                  type="number"
                  step="0.01"
                  placeholder="4.5"
                  value={depositInterestRate}
                  onChange={(e) => setDepositInterestRate(e.target.value)}
                />
                <Select
                  label="Interest Period"
                  value={depositPaymentPeriod}
                  onChange={(e) => setDepositPaymentPeriod(e.target.value as PaymentPeriod)}
                  options={PAYMENT_PERIOD_OPTIONS}
                />
              </div>
            </div>
          )}
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
