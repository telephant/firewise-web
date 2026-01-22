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
import { Spinner } from '@/components/ui/spinner';
import { CurrencyCombobox } from './currency-combobox';
import type { CurrencyExchange } from '@/lib/api';

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
  onSubmit: (data: { code: string; name: string }) => Promise<void>;
  existingCurrencyCodes?: string[];
}

export function AddCurrencyDialog({
  open,
  onOpenChange,
  onSubmit,
  existingCurrencyCodes = [],
}: AddCurrencyDialogProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyExchange | null>(null);
  const [currencyCode, setCurrencyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setSelectedCurrency(null);
    setCurrencyCode('');
    setError(null);
  };

  const handleCurrencyChange = (code: string, currency: CurrencyExchange) => {
    setCurrencyCode(code);
    setSelectedCurrency(currency);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCurrency) {
      setError('Please select a currency');
      return;
    }

    // Check if currency already exists in ledger
    if (existingCurrencyCodes.some((c) => c.toLowerCase() === selectedCurrency.code.toLowerCase())) {
      setError('This currency already exists in your ledger');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        code: selectedCurrency.code.toUpperCase(),
        name: selectedCurrency.name,
      });
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add currency');
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
                <DialogTitle>Add Currency to Ledger</DialogTitle>
                <DialogDescription>
                  Add a currency for quick access when creating expenses.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <CurrencyCombobox
                value={currencyCode}
                onValueChange={handleCurrencyChange}
                placeholder="Search and select a currency..."
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Search by currency code or name
              </p>
            </div>

            {selectedCurrency && (
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-lg">{selectedCurrency.code.toUpperCase()}</span>
                  <span className="text-muted-foreground">{selectedCurrency.name}</span>
                </div>
              </div>
            )}

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
            <Button type="submit" disabled={loading || !selectedCurrency} className="min-w-[100px]">
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
