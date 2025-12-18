'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useExpenseData } from '@/contexts/expense-data-context';
import { AddCurrencyDialog } from './add-currency-dialog';
import { format, parseISO } from 'date-fns';
import type { Expense } from '@/types';

function PlusIcon({ className }: { className?: string }) {
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
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
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
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

interface ExpenseDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  onUpdate: (
    id: string,
    data: Partial<{
      name: string;
      amount: number;
      currency_id: string;
      category_id: string | null;
      description: string | null;
      payment_method_id: string | null;
      date: string;
    }>
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  startInEditMode?: boolean;
}

export function ExpenseDetailDialog({
  open,
  onOpenChange,
  expense,
  onUpdate,
  onDelete,
  startInEditMode = false,
}: ExpenseDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currencyId, setCurrencyId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const [newCategory, setNewCategory] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showCurrencyDialog, setShowCurrencyDialog] = useState(false);
  const [showNewPaymentMethod, setShowNewPaymentMethod] = useState(false);

  const { categories, currencies, paymentMethods, createCategory, createCurrency, createPaymentMethod } = useExpenseData();

  useEffect(() => {
    if (expense && open) {
      setName(expense.name);
      setAmount(expense.amount.toString());
      setCurrencyId(expense.currency_id);
      setCategoryId(expense.category_id || '');
      setPaymentMethodId(expense.payment_method_id || '');
      setDate(parseISO(expense.date));
      setDescription(expense.description || '');
      setIsEditing(startInEditMode);
      setDeleteConfirm(false);
      setError(null);
      setShowNewCategory(false);
      setShowCurrencyDialog(false);
      setShowNewPaymentMethod(false);
      setNewCategory('');
      setNewPaymentMethod('');
    }
  }, [expense, open, startInEditMode]);

  const handleCreateCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const category = await createCategory(newCategory.trim());
      setCategoryId(category.id);
      setNewCategory('');
      setShowNewCategory(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const handleCreateCurrency = async (data: { code: string; name: string; rate: number }) => {
    const currency = await createCurrency(data);
    setCurrencyId(currency.id);
  };

  const handleCreatePaymentMethod = async () => {
    if (!newPaymentMethod.trim()) return;
    try {
      const pm = await createPaymentMethod({ name: newPaymentMethod.trim() });
      setPaymentMethodId(pm.id);
      setNewPaymentMethod('');
      setShowNewPaymentMethod(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payment method');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!expense) return;
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Valid amount is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onUpdate(expense.id, {
        name: name.trim(),
        amount: parseFloat(amount),
        currency_id: currencyId,
        category_id: categoryId || null,
        description: description.trim() || null,
        payment_method_id: paymentMethodId || null,
        date: format(date, 'yyyy-MM-dd'),
      });
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update expense');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!expense) return;

    setLoading(true);
    setError(null);

    try {
      await onDelete(expense.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete expense');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number, currencyCode?: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {deleteConfirm ? (
          <>
            <DialogHeader>
              <DialogTitle>Delete Expense</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{expense.name}&quot;? This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                {loading ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </>
        ) : isEditing ? (
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit Expense</DialogTitle>
              <DialogDescription>Update the expense details.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-amount">Amount</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Currency</Label>
                  <div className="flex gap-2">
                    <Select value={currencyId} onValueChange={setCurrencyId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.id} value={currency.id}>
                            {currency.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowCurrencyDialog(true)}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Category</Label>
                {showNewCategory ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="New category name"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    />
                    <Button type="button" size="sm" onClick={handleCreateCategory}>
                      Add
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowNewCategory(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="No category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowNewCategory(true)}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label>Payment Method</Label>
                {showNewPaymentMethod ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="New payment method"
                      value={newPaymentMethod}
                      onChange={(e) => setNewPaymentMethod(e.target.value)}
                    />
                    <Button type="button" size="sm" onClick={handleCreatePaymentMethod}>
                      Add
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowNewPaymentMethod(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="No payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((pm) => (
                          <SelectItem key={pm.id} value={pm.id}>
                            {pm.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowNewPaymentMethod(true)}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(date, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{expense.name}</DialogTitle>
              <DialogDescription>
                Added by {expense.created_by_profile?.full_name || expense.created_by_profile?.email || 'Unknown'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">
                  {formatAmount(expense.amount, expense.currency?.code)}
                </span>
                {expense.category && (
                  <Badge variant="secondary">{expense.category.name}</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p>{format(parseISO(expense.date), 'PPP')}</p>
                </div>
                {expense.payment_method && (
                  <div>
                    <p className="text-muted-foreground">Payment Method</p>
                    <p>{expense.payment_method.name}</p>
                  </div>
                )}
              </div>

              {expense.description && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Description</p>
                  <p>{expense.description}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Created: {format(parseISO(expense.created_at), 'PPP p')}
                {expense.updated_at !== expense.created_at && (
                  <>
                    <br />
                    Updated: {format(parseISO(expense.updated_at), 'PPP p')}
                  </>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="destructive"
                onClick={() => setDeleteConfirm(true)}
              >
                Delete
              </Button>
              <Button onClick={() => setIsEditing(true)}>Edit</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>

      <AddCurrencyDialog
        open={showCurrencyDialog}
        onOpenChange={setShowCurrencyDialog}
        onSubmit={handleCreateCurrency}
      />
    </Dialog>
  );
}
