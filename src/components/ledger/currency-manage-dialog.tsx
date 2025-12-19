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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErrorAlert } from '@/components/ui/error-alert';
import { CoinsIcon, PencilIcon, TrashIcon, CheckIcon, XIcon, PlusIcon } from '@/components/icons';
import { useExpenseData } from '@/contexts/expense-data-context';
import type { Currency } from '@/types';

interface CurrencyManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CurrencyManageDialog({ open, onOpenChange }: CurrencyManageDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState('');
  const [editingName, setEditingName] = useState('');
  const [editingRate, setEditingRate] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    currency: Currency;
    usageCount: number;
  } | null>(null);

  const { currencies, createCurrency, updateCurrency, deleteCurrency, getCurrencyUsageCount } =
    useExpenseData();

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEditingId(null);
      setEditingCode('');
      setEditingName('');
      setEditingRate('');
      setNewCode('');
      setNewName('');
      setNewRate('');
      setShowAddNew(false);
      setError(null);
    }
    onOpenChange(newOpen);
  };

  const handleStartEdit = (currency: Currency) => {
    setEditingId(currency.id);
    setEditingCode(currency.code);
    setEditingName(currency.name);
    setEditingRate(currency.rate.toString());
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingCode('');
    setEditingName('');
    setEditingRate('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingCode.trim() || !editingName.trim() || !editingRate.trim()) return;

    const rate = parseFloat(editingRate);
    if (isNaN(rate) || rate <= 0) {
      setError('Rate must be a positive number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await updateCurrency(editingId, {
        code: editingCode.trim().toUpperCase(),
        name: editingName.trim(),
        rate,
      });
      setEditingId(null);
      setEditingCode('');
      setEditingName('');
      setEditingRate('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update currency');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCurrency = async () => {
    if (!newCode.trim() || !newName.trim() || !newRate.trim()) return;

    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) {
      setError('Rate must be a positive number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createCurrency({
        code: newCode.trim().toUpperCase(),
        name: newName.trim(),
        rate,
      });
      setNewCode('');
      setNewName('');
      setNewRate('');
      setShowAddNew(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create currency');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async (currency: Currency) => {
    setError(null);
    setLoading(true);

    try {
      const usageCount = await getCurrencyUsageCount(currency.id);

      if (usageCount === 0) {
        // No expenses using this currency, delete directly
        await deleteCurrency(currency.id);
      } else {
        // Show confirmation dialog
        setDeleteConfirm({ currency, usageCount });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check currency usage');
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
      setError(err instanceof Error ? err.message : 'Failed to delete currency');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <CoinsIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Manage Currencies</DialogTitle>
                <DialogDescription>e.g. 1 USD = 3.67 AED, rate is 3.67</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2">
            <ErrorAlert message={error} />

            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-1">
                {currencies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No currencies yet. Add your first currency below.
                  </p>
                ) : (
                  currencies.map((currency) => {
                    const isEditing = editingId === currency.id;

                    return (
                      <div
                        key={currency.id}
                        className="p-2 rounded-lg hover:bg-accent/50 transition-colors group"
                      >
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingCode}
                                onChange={(e) => setEditingCode(e.target.value.toUpperCase())}
                                className="w-20 h-8 uppercase"
                                placeholder="USD"
                                maxLength={3}
                                disabled={loading}
                              />
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="flex-1 h-8"
                                placeholder="US Dollar"
                                disabled={loading}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 flex-1">
                                <Label className="text-xs text-muted-foreground shrink-0">Rate:</Label>
                                <Input
                                  value={editingRate}
                                  onChange={(e) => setEditingRate(e.target.value)}
                                  className="h-8"
                                  placeholder="1.0"
                                  inputMode="decimal"
                                  disabled={loading}
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                                onClick={handleSaveEdit}
                                disabled={loading}
                              >
                                <CheckIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={handleCancelEdit}
                                disabled={loading}
                              >
                                <XIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-sm w-12">{currency.code}</span>
                            <span className="flex-1 text-sm truncate">{currency.name}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              Rate: {currency.rate}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-50 hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(currency);
                                }}
                                disabled={loading}
                              >
                                <PencilIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-50 hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(currency);
                                }}
                                disabled={loading}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Add new currency section */}
                {showAddNew ? (
                  <div className="p-2 rounded-lg bg-accent/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                        className="w-20 h-8 uppercase"
                        placeholder="USD"
                        maxLength={3}
                        autoFocus
                        disabled={loading}
                      />
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1 h-8"
                        placeholder="US Dollar"
                        disabled={loading}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 flex-1">
                        <Label className="text-xs text-muted-foreground shrink-0">Rate:</Label>
                        <Input
                          value={newRate}
                          onChange={(e) => setNewRate(e.target.value)}
                          className="h-8"
                          placeholder="1.0"
                          inputMode="decimal"
                          disabled={loading}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddCurrency();
                            if (e.key === 'Escape') {
                              setShowAddNew(false);
                              setNewCode('');
                              setNewName('');
                              setNewRate('');
                            }
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={handleAddCurrency}
                        disabled={loading || !newCode.trim() || !newName.trim() || !newRate.trim()}
                      >
                        <CheckIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setShowAddNew(false);
                          setNewCode('');
                          setNewName('');
                          setNewRate('');
                        }}
                        disabled={loading}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-foreground mt-2"
                    onClick={() => setShowAddNew(true)}
                    disabled={loading}
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add currency
                  </Button>
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Currency</AlertDialogTitle>
            <AlertDialogDescription>
              The currency &quot;{deleteConfirm?.currency.code}&quot; is used by{' '}
              <span className="font-semibold">{deleteConfirm?.usageCount}</span> expense
              {deleteConfirm?.usageCount === 1 ? '' : 's'}. Deleting it will affect all these expenses.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
