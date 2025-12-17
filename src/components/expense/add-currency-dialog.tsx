'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddCurrencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { code: string; name: string; rate: number }) => Promise<void>;
}

export function AddCurrencyDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddCurrencyDialogProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [rate, setRate] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setCode('');
    setName('');
    setRate('1');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    if (!trimmedCode) {
      setError('Currency code is required');
      return;
    }
    if (trimmedCode.length !== 3) {
      setError('Currency code must be exactly 3 characters (e.g., USD, EUR)');
      return;
    }
    if (!trimmedName) {
      setError('Currency name is required');
      return;
    }
    const rateValue = parseFloat(rate);
    if (isNaN(rateValue) || rateValue <= 0) {
      setError('Exchange rate must be a positive number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        code: trimmedCode,
        name: trimmedName,
        rate: rateValue,
      });
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create currency');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Currency</DialogTitle>
            <DialogDescription>
              Add a new currency with its exchange rate relative to your base currency.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="currency-code">Currency Code *</Label>
              <Input
                id="currency-code"
                placeholder="USD"
                maxLength={3}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={loading}
                className="uppercase"
              />
              <p className="text-xs text-muted-foreground">
                3-letter ISO code (e.g., USD, EUR, GBP, JPY)
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="currency-name">Currency Name *</Label>
              <Input
                id="currency-name"
                placeholder="US Dollar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="currency-rate">Exchange Rate</Label>
              <Input
                id="currency-rate"
                type="number"
                step="0.000001"
                min="0"
                placeholder="1.0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Rate relative to your base currency (default: 1.0)
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Currency'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
