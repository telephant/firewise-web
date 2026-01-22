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
import { CurrencyCombobox } from './currency-combobox';
import { format, parseISO } from 'date-fns';
import type { Expense } from '@/types';
import type { CurrencyExchange } from '@/lib/api';

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
  const [currencyCode, setCurrencyCode] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyExchange | null>(null);
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
  const [showNewPaymentMethod, setShowNewPaymentMethod] = useState(false);

  const { categories, currencies, paymentMethods, createCategory, getOrCreateCurrencyByCode, createPaymentMethod } = useExpenseData();

  useEffect(() => {
    if (expense && open) {
      setName(expense.name);
      setAmount(expense.amount.toString());
      // Find currency by id to get code
      const expenseCurrency = currencies.find((c) => c.id === expense.currency_id);
      if (expenseCurrency) {
        setCurrencyCode(expenseCurrency.code.toLowerCase());
        setSelectedCurrency({ code: expenseCurrency.code, name: expenseCurrency.name, rate: 1 });
      }
      setCategoryId(expense.category_id || '');
      setPaymentMethodId(expense.payment_method_id || '');
      setDate(parseISO(expense.date));
      setDescription(expense.description || '');
      setIsEditing(startInEditMode);
      setDeleteConfirm(false);
      setError(null);
      setShowNewCategory(false);
      setShowNewPaymentMethod(false);
      setNewCategory('');
      setNewPaymentMethod('');
    }
  }, [expense, open, startInEditMode, currencies]);

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

  const handleCurrencyChange = (code: string, currency: CurrencyExchange) => {
    setCurrencyCode(code);
    setSelectedCurrency(currency);
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
    if (!currencyCode || !selectedCurrency) {
      setError('Currency is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get or create ledger currency for the selected currency
      const ledgerCurrency = await getOrCreateCurrencyByCode(
        selectedCurrency.code,
        selectedCurrency.name
      );

      await onUpdate(expense.id, {
        name: name.trim(),
        amount: parseFloat(amount),
        currency_id: ledgerCurrency.id,
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
                <CurrencyCombobox
                  value={currencyCode}
                  onValueChange={handleCurrencyChange}
                  placeholder="Select currency..."
                  disabled={loading}
                  ledgerCurrencies={currencies}
                />
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
            <DialogHeader className="pb-2">
              <DialogTitle className="text-xl">{expense.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Amount - Hero section */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Amount</p>
                  <span className="text-2xl font-bold">
                    {formatAmount(expense.amount, expense.currency?.code)}
                  </span>
                </div>
                {expense.category && (
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {expense.category.name}
                  </Badge>
                )}
              </div>

              {/* Key Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Date</p>
                  <p className="font-medium">{format(parseISO(expense.date), 'MMM d, yyyy')}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Payment</p>
                  <p className="font-medium">{expense.payment_method?.name || '—'}</p>
                </div>
              </div>

              {/* Description */}
              {expense.description && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{expense.description}</p>
                </div>
              )}

              {/* Meta info */}
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Added by {expense.created_by_profile?.full_name || expense.created_by_profile?.email || 'Unknown'}</span>
                  <span>{format(parseISO(expense.created_at), 'MMM d, yyyy')}</span>
                </div>
                {expense.updated_at !== expense.created_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Updated {format(parseISO(expense.updated_at), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteConfirm(true)}
              >
                Delete
              </Button>
              <Button onClick={() => setIsEditing(true)}>Edit</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
