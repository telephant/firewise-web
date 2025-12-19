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
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErrorAlert } from '@/components/ui/error-alert';
import { CreditCardIcon, PencilIcon, TrashIcon, CheckIcon, XIcon, PlusIcon } from '@/components/icons';
import { useExpenseData } from '@/contexts/expense-data-context';
import type { PaymentMethod } from '@/types';

interface PaymentMethodManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentMethodManageDialog({ open, onOpenChange }: PaymentMethodManageDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    paymentMethod: PaymentMethod;
    usageCount: number;
  } | null>(null);

  const { paymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod, getPaymentMethodUsageCount } =
    useExpenseData();

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEditingId(null);
      setEditingName('');
      setEditingDescription('');
      setNewName('');
      setNewDescription('');
      setShowAddNew(false);
      setError(null);
    }
    onOpenChange(newOpen);
  };

  const handleStartEdit = (paymentMethod: PaymentMethod) => {
    setEditingId(paymentMethod.id);
    setEditingName(paymentMethod.name);
    setEditingDescription(paymentMethod.description || '');
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingDescription('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await updatePaymentMethod(editingId, {
        name: editingName.trim(),
        description: editingDescription.trim() || undefined,
      });
      setEditingId(null);
      setEditingName('');
      setEditingDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!newName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await createPaymentMethod({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      });
      setNewName('');
      setNewDescription('');
      setShowAddNew(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async (paymentMethod: PaymentMethod) => {
    setError(null);
    setLoading(true);

    try {
      const usageCount = await getPaymentMethodUsageCount(paymentMethod.id);

      if (usageCount === 0) {
        // No expenses using this payment method, delete directly
        await deletePaymentMethod(paymentMethod.id);
      } else {
        // Show confirmation dialog
        setDeleteConfirm({ paymentMethod, usageCount });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check payment method usage');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    setLoading(true);
    setError(null);

    try {
      await deletePaymentMethod(deleteConfirm.paymentMethod.id);
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete payment method');
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
                <CreditCardIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Manage Payment Methods</DialogTitle>
                <DialogDescription>Add, edit, or delete payment methods.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2">
            <ErrorAlert message={error} />

            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-1">
                {paymentMethods.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No payment methods yet. Add your first payment method below.
                  </p>
                ) : (
                  paymentMethods.map((paymentMethod) => {
                    const isEditing = editingId === paymentMethod.id;

                    return (
                      <div
                        key={paymentMethod.id}
                        className="p-2 rounded-lg hover:bg-accent/50 transition-colors group"
                      >
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="flex-1 h-8"
                                placeholder="Name"
                                autoFocus
                                disabled={loading}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit();
                                  if (e.key === 'Escape') handleCancelEdit();
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingDescription}
                                onChange={(e) => setEditingDescription(e.target.value)}
                                className="flex-1 h-8"
                                placeholder="Description (optional)"
                                disabled={loading}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit();
                                  if (e.key === 'Escape') handleCancelEdit();
                                }}
                              />
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
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium block truncate">{paymentMethod.name}</span>
                              {paymentMethod.description && (
                                <span className="text-xs text-muted-foreground block truncate">
                                  {paymentMethod.description}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-50 hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(paymentMethod);
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
                                  handleDeleteClick(paymentMethod);
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

                {/* Add new payment method section */}
                {showAddNew ? (
                  <div className="p-2 rounded-lg bg-accent/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1 h-8"
                        placeholder="Name"
                        autoFocus
                        disabled={loading}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        className="flex-1 h-8"
                        placeholder="Description (optional)"
                        disabled={loading}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddPaymentMethod();
                          if (e.key === 'Escape') {
                            setShowAddNew(false);
                            setNewName('');
                            setNewDescription('');
                          }
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={handleAddPaymentMethod}
                        disabled={loading || !newName.trim()}
                      >
                        <CheckIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setShowAddNew(false);
                          setNewName('');
                          setNewDescription('');
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
                    Add payment method
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
            <AlertDialogTitle>Delete Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              The payment method &quot;{deleteConfirm?.paymentMethod.name}&quot; is used by{' '}
              <span className="font-semibold">{deleteConfirm?.usageCount}</span> expense
              {deleteConfirm?.usageCount === 1 ? '' : 's'}. Deleting it will remove the payment method
              from all these expenses. This action cannot be undone.
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
