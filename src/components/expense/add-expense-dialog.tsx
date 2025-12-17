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
import { useCategories, useCurrencies, usePaymentMethods } from '@/hooks/use-expenses';
import { AddCurrencyDialog } from './add-currency-dialog';
import { format } from 'date-fns';

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

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    amount: number;
    currency_id: string;
    category_id?: string;
    description?: string;
    payment_method_id?: string;
    date?: string;
  }) => Promise<void>;
}

export function AddExpenseDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddExpenseDialogProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currencyId, setCurrencyId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addAnother, setAddAnother] = useState(false);

  const [newCategory, setNewCategory] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showCurrencyDialog, setShowCurrencyDialog] = useState(false);
  const [showNewPaymentMethod, setShowNewPaymentMethod] = useState(false);

  const { categories, createCategory } = useCategories();
  const { currencies, createCurrency } = useCurrencies();
  const { paymentMethods, createPaymentMethod } = usePaymentMethods();

  useEffect(() => {
    if (currencies.length > 0 && !currencyId) {
      const usd = currencies.find((c) => c.code === 'USD');
      if (usd) setCurrencyId(usd.id);
      else setCurrencyId(currencies[0].id);
    }
  }, [currencies, currencyId]);

  const resetForm = () => {
    setName('');
    setAmount('');
    setCategoryId('');
    setPaymentMethodId('');
    setDate(new Date());
    setDescription('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Valid amount is required');
      return;
    }
    if (!currencyId) {
      setError('Currency is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        amount: parseFloat(amount),
        currency_id: currencyId,
        category_id: categoryId || undefined,
        description: description.trim() || undefined,
        payment_method_id: paymentMethodId || undefined,
        date: format(date, 'yyyy-MM-dd'),
      });

      if (addAnother) {
        resetForm();
      } else {
        onOpenChange(false);
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

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

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
      setShowNewCategory(false);
      setShowCurrencyDialog(false);
      setShowNewPaymentMethod(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>Add a new expense to this ledger.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="expense-name">Name *</Label>
              <Input
                id="expense-name"
                placeholder="e.g., Lunch, Groceries, Coffee"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Amount */}
            <div className="grid gap-2">
              <Label htmlFor="expense-amount">Amount *</Label>
              <Input
                id="expense-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Currency */}
            <div className="grid gap-2">
              <Label>Currency *</Label>
              <div className="flex gap-2">
                <Select value={currencyId} onValueChange={setCurrencyId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.id} value={currency.id}>
                        {currency.code} - {currency.name}
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

            {/* Category */}
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
                      <SelectValue placeholder="Select category (optional)" />
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

            {/* Payment Method */}
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
                      <SelectValue placeholder="Select payment method (optional)" />
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

            {/* Date */}
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

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="expense-description">Description (optional)</Label>
              <Input
                id="expense-description"
                placeholder="Additional notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <label className="flex items-center gap-2 text-sm mr-auto">
              <input
                type="checkbox"
                checked={addAnother}
                onChange={(e) => setAddAnother(e.target.checked)}
                className="rounded border-gray-300"
              />
              Add another
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <AddCurrencyDialog
        open={showCurrencyDialog}
        onOpenChange={setShowCurrencyDialog}
        onSubmit={handleCreateCurrency}
      />
    </Dialog>
  );
}
