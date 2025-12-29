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
import { Spinner } from '@/components/ui/spinner';

function CoinsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </svg>
  );
}

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
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <CoinsIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Add Currency</DialogTitle>
                <DialogDescription>
                  Add a new currency with its exchange rate.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="currency-code" className="text-sm font-medium">
                  Code <span className="text-destructive">*</span>
                </Label>
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
                  3-letter ISO code
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency-rate" className="text-sm font-medium">Exchange Rate</Label>
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
                  Default: 1.0
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="currency-name" className="text-sm font-medium">
                Currency Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="currency-name"
                placeholder="US Dollar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <svg className="h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[100px]">
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner variant="fire" />
                  Adding...
                </span>
              ) : (
                'Add Currency'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
