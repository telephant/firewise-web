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
import { Spinner } from '@/components/ui/spinner';
import { useExpenseData } from '@/contexts/expense-data-context';
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

function DollarIcon({ className }: { className?: string }) {
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
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
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
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}

function CreditCardIcon({ className }: { className?: string }) {
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
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}

function FileTextIcon({ className }: { className?: string }) {
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
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

function ReceiptIcon({ className }: { className?: string }) {
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
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5v-11" />
    </svg>
  );
}

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean, hasChanges: boolean) => void;
  onSubmit: (
    data: {
      name: string;
      amount: number;
      currency_id: string;
      category_id?: string;
      description?: string;
      payment_method_id?: string;
      date?: string;
    },
    options?: { skipRefetch?: boolean }
  ) => Promise<void>;
  defaultCurrencyId?: string | null;
}

export function AddExpenseDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultCurrencyId,
}: AddExpenseDialogProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currencyId, setCurrencyId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addAnother, setAddAnother] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [newCategory, setNewCategory] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showCurrencyDialog, setShowCurrencyDialog] = useState(false);
  const [showNewPaymentMethod, setShowNewPaymentMethod] = useState(false);

  const { categories, currencies, paymentMethods, createCategory, createCurrency, createPaymentMethod } = useExpenseData();

  useEffect(() => {
    if (currencies.length > 0 && !currencyId) {
      // Use ledger's default currency if available, otherwise first currency
      if (defaultCurrencyId && currencies.find((c) => c.id === defaultCurrencyId)) {
        setCurrencyId(defaultCurrencyId);
      } else {
        setCurrencyId(currencies[0].id);
      }
    }
  }, [currencies, currencyId, defaultCurrencyId]);

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
      let finalCategoryId = categoryId;
      let finalPaymentMethodId = paymentMethodId;

      // Auto-save unsaved category if user typed one
      if (showNewCategory && newCategory.trim()) {
        const category = await createCategory(newCategory.trim());
        finalCategoryId = category.id;
        setNewCategory('');
        setShowNewCategory(false);
      }

      // Auto-save unsaved payment method if user typed one
      if (showNewPaymentMethod && newPaymentMethod.trim()) {
        const pm = await createPaymentMethod({ name: newPaymentMethod.trim() });
        finalPaymentMethodId = pm.id;
        setNewPaymentMethod('');
        setShowNewPaymentMethod(false);
      }

      // When "add another" is checked, skip refetch until dialog closes
      await onSubmit(
        {
          name: name.trim(),
          amount: parseFloat(amount),
          currency_id: currencyId,
          category_id: finalCategoryId || undefined,
          description: description.trim() || undefined,
          payment_method_id: finalPaymentMethodId || undefined,
          date: format(date, 'yyyy-MM-dd'),
        },
        { skipRefetch: addAnother }
      );

      setHasChanges(true);

      if (addAnother) {
        resetForm();
      } else {
        onOpenChange(false, true);
        resetForm();
        setHasChanges(false);
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

  const handleCreateCurrency = async (data: { code: string; name: string }) => {
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
      // Pass hasChanges to parent so it knows whether to refetch
      onOpenChange(false, hasChanges);
      resetForm();
      setShowNewCategory(false);
      setShowCurrencyDialog(false);
      setShowNewPaymentMethod(false);
      setHasChanges(false);
    } else {
      onOpenChange(true, false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <ReceiptIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Add Expense</DialogTitle>
                <DialogDescription>Add a new expense to this ledger.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            {/* Name */}
            <div className="grid gap-1">
              <Label htmlFor="expense-name" className="flex items-center gap-2 text-sm font-medium">
                <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="expense-name"
                placeholder="e.g., Lunch, Groceries, Coffee"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Amount */}
            <div className="grid gap-1">
              <Label htmlFor="expense-amount" className="flex items-center gap-2 text-sm font-medium">
                <DollarIcon className="h-4 w-4 text-muted-foreground" />
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="expense-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Currency */}
            <div className="grid gap-1">
              <Label className="text-sm font-medium">Currency <span className="text-destructive">*</span></Label>
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
                  className="shrink-0"
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Category */}
            <div className="grid gap-1">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <TagIcon className="h-4 w-4 text-muted-foreground" />
                Category
              </Label>
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
                    className="shrink-0"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="grid gap-1">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                Payment Method
              </Label>
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
                    className="shrink-0"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Date */}
            <div className="grid gap-1">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                Date
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal w-full">
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {format(date, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      if (d) {
                        setDate(d);
                        setCalendarOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Description */}
            <div className="grid gap-1">
              <Label htmlFor="expense-description" className="text-sm font-medium">
                Description (optional)
              </Label>
              <Input
                id="expense-description"
                placeholder="Additional notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <label className="flex items-center gap-2 text-sm mr-auto cursor-pointer select-none">
              <input
                type="checkbox"
                checked={addAnother}
                onChange={(e) => setAddAnother(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-muted-foreground">Add another</span>
            </label>
            <div className="flex gap-2">
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
                  'Add Expense'
                )}
              </Button>
            </div>
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
