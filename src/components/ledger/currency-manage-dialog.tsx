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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErrorAlert } from '@/components/ui/error-alert';
import { StarIcon, XIcon } from 'lucide-react';
import { useExpenseData } from '@/contexts/expense-data-context';
import { CurrencyCombobox } from './currency-combobox';
import type { Currency } from '@/types';
import type { CurrencyExchange } from '@/lib/api';

interface CurrencyManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CurrencyManageDialog({ open, onOpenChange }: CurrencyManageDialogProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyExchange | null>(null);
  const [currencyCode, setCurrencyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    currency: Currency;
    usageCount: number;
  } | null>(null);

  const { currencies, createCurrency, deleteCurrency, getCurrencyUsageCount } =
    useExpenseData();

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedCurrency(null);
      setCurrencyCode('');
      setError(null);
    }
    onOpenChange(newOpen);
  };

  const handleCurrencySelect = async (code: string, currency: CurrencyExchange) => {
    // Check if already exists
    if (currencies.some((c) => c.code.toLowerCase() === currency.code.toLowerCase())) {
      setError('This currency is already in your favorites');
      setCurrencyCode('');
      setSelectedCurrency(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createCurrency({
        code: currency.code.toUpperCase(),
        name: currency.name,
      });
      setCurrencyCode('');
      setSelectedCurrency(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add currency');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (currency: Currency) => {
    setError(null);
    setLoading(true);

    try {
      const usageCount = await getCurrencyUsageCount(currency.id);

      if (usageCount === 0) {
        await deleteCurrency(currency.id);
      } else {
        setDeleteConfirm({ currency, usageCount });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove currency');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    setLoading(true);
    setError(null);

    try {
      await deleteCurrency(deleteConfirm.currency.id);
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove currency');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <StarIcon className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <DialogTitle>Favorite Currencies</DialogTitle>
                <DialogDescription>
                  Quick access currencies for this ledger
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <ErrorAlert message={error} />

            {/* Add currency */}
            <div>
              <CurrencyCombobox
                value={currencyCode}
                onValueChange={handleCurrencySelect}
                placeholder="Search to add a currency..."
                disabled={loading}
              />
            </div>

            {/* Favorites list */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                {currencies.length === 0
                  ? 'No favorites yet. Search above to add currencies.'
                  : `${currencies.length} favorite${currencies.length === 1 ? '' : 's'}`}
              </p>

              {currencies.length > 0 && (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-1">
                    {currencies.map((currency) => (
                      <div
                        key={currency.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors group"
                      >
                        <StarIcon className="h-4 w-4 text-amber-500 fill-amber-500" />
                        <span className="font-mono font-semibold text-sm">{currency.code}</span>
                        <span className="flex-1 text-sm text-muted-foreground truncate">
                          {currency.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemove(currency)}
                          disabled={loading}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Currency</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold">{deleteConfirm?.currency.code}</span> is used by{' '}
              <span className="font-semibold">{deleteConfirm?.usageCount}</span> expense
              {deleteConfirm?.usageCount === 1 ? '' : 's'}.
              Removing it will affect these expenses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
