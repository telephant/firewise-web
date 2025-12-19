'use client';

import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ErrorAlert } from '@/components/ui/error-alert';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  SettingsIcon,
  UsersIcon,
  PencilIcon,
  TrashIcon,
  BookIcon,
  AlertTriangleIcon,
  TagIcon,
  CoinsIcon,
  CreditCardIcon,
} from '@/components/icons';
import { CategoryManageDialog } from './category-manage-dialog';
import { CurrencyManageDialog } from './currency-manage-dialog';
import { PaymentMethodManageDialog } from './payment-method-manage-dialog';
import { useExpenseData } from '@/contexts/expense-data-context';
import type { Ledger } from '@/types';

interface LedgerSettingsProps {
  ledger: Ledger;
  onMembersClick: () => void;
  onUpdate: (data: { name?: string; description?: string; default_currency_id?: string | null }) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function LedgerSettings({
  ledger,
  onMembersClick,
  onUpdate,
  onDelete,
}: LedgerSettingsProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [paymentMethodDialogOpen, setPaymentMethodDialogOpen] = useState(false);
  const [name, setName] = useState(ledger.name);
  const [description, setDescription] = useState(ledger.description || '');
  const [defaultCurrencyId, setDefaultCurrencyId] = useState(ledger.default_currency_id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currencies } = useExpenseData();
  const isOwner = ledger.role === 'owner';

  useEffect(() => {
    setName(ledger.name);
    setDescription(ledger.description || '');
    setDefaultCurrencyId(ledger.default_currency_id || '');
  }, [ledger]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onUpdate({
        name: name.trim(),
        description: description.trim() || undefined,
        default_currency_id: defaultCurrencyId || null,
      });
      setEditDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ledger');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      await onDelete();
      setDeleteDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete ledger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <SettingsIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onMembersClick}>
            <UsersIcon className="mr-2 h-4 w-4" />
            Members
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCategoryDialogOpen(true)}>
            <TagIcon className="mr-2 h-4 w-4" />
            Categories
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCurrencyDialogOpen(true)}>
            <CoinsIcon className="mr-2 h-4 w-4" />
            Currencies
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPaymentMethodDialogOpen(true)}>
            <CreditCardIcon className="mr-2 h-4 w-4" />
            Payment Methods
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
            <PencilIcon className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          {isOwner && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <TrashIcon className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUpdate}>
            <DialogHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <BookIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle>Edit Ledger</DialogTitle>
                  <DialogDescription>Update your ledger details.</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="grid gap-5 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name" className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  placeholder="My Ledger"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description" className="text-sm font-medium">
                  Description (optional)
                </Label>
                <Input
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                  placeholder="A brief description"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Default Currency</Label>
                <Select value={defaultCurrencyId} onValueChange={setDefaultCurrencyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select default currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.id} value={currency.id}>
                        {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ErrorAlert message={error} />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                loading={loading}
                loadingText="Saving..."
                className="min-w-[80px]"
              >
                Save
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-destructive/10">
                <AlertTriangleIcon className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle>Delete Ledger</DialogTitle>
                <DialogDescription>This action cannot be undone.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 rounded-xl bg-muted/50 border border-muted">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <span className="font-semibold text-foreground">&quot;{ledger.name}&quot;</span>?
                All expenses in this ledger will be permanently deleted.
              </p>
            </div>
          </div>

          <ErrorAlert message={error} />

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <LoadingButton
              variant="destructive"
              loading={loading}
              loadingText="Deleting..."
              onClick={handleDelete}
              className="min-w-[80px]"
            >
              Delete
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Management Dialog */}
      <CategoryManageDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
      />

      {/* Currency Management Dialog */}
      <CurrencyManageDialog
        open={currencyDialogOpen}
        onOpenChange={setCurrencyDialogOpen}
      />

      {/* Payment Method Management Dialog */}
      <PaymentMethodManageDialog
        open={paymentMethodDialogOpen}
        onOpenChange={setPaymentMethodDialogOpen}
      />
    </>
  );
}
