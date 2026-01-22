'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { debtApi } from '@/lib/fire/api';
import { mutateDebts } from '@/hooks/fire/use-fire-data';
import type { Debt, DebtType } from '@/types/fire';
import { DEBT_TYPE_LABELS } from '@/types/fire';
import {
  retro,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  CurrencyCombobox,
  Button,
  Label,
} from '@/components/fire/ui';

interface EditDebtDialogProps {
  debt: Debt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMakePayment?: (debt: Debt) => void;
}

// Debt type options (excluding mortgage which is usually tied to property)
const DEBT_TYPE_OPTIONS = (Object.keys(DEBT_TYPE_LABELS) as DebtType[]).map((t) => ({
  value: t,
  label: DEBT_TYPE_LABELS[t],
}));

// Calculate monthly payment using standard amortization formula
function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  if (annualRate <= 0) return principal / termMonths;
  const monthlyRate = annualRate / 12;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  return payment;
}

export function EditDebtDialog({ debt, open, onOpenChange, onMakePayment }: EditDebtDialogProps) {
  const prevOpenRef = useRef(open);

  // Form state
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [debtType, setDebtType] = useState<DebtType>('personal_loan');
  const [currency, setCurrency] = useState('USD');
  const [principal, setPrincipal] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [startDate, setStartDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form from debt
  const initializeFromDebt = (debtToEdit: Debt) => {
    setName(debtToEdit.name);
    setDebtType(debtToEdit.debt_type);
    setCurrency(debtToEdit.currency);
    setPrincipal(debtToEdit.principal.toString());
    setCurrentBalance(debtToEdit.current_balance.toString());
    setInterestRate(debtToEdit.interest_rate ? (debtToEdit.interest_rate * 100).toString() : '');
    setTermMonths(debtToEdit.term_months?.toString() || '');
    setStartDate(debtToEdit.start_date || '');
  };

  // Reset form
  const resetForm = () => {
    setName('');
    setDebtType('personal_loan');
    setCurrency('USD');
    setPrincipal('');
    setCurrentBalance('');
    setInterestRate('');
    setTermMonths('');
    setStartDate('');
    setErrors({});
    setLoading(false);
  };

  // Handle dialog open/close transitions
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (!wasOpen && open && debt) {
      // Dialog just opened - initialize from debt
      resetForm();
      initializeFromDebt(debt);
    } else if (wasOpen && !open) {
      // Dialog just closed - reset
      resetForm();
    }
  }, [open, debt]);

  // Calculate monthly payment
  const monthlyPayment = useMemo(() => {
    const p = parseFloat(principal) || 0;
    const rate = parseFloat(interestRate) / 100 || 0;
    const months = parseInt(termMonths) || 0;
    return calculateMonthlyPayment(p, rate, months);
  }, [principal, interestRate, termMonths]);

  // Format currency for display
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!debt) return;

    // Validate
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    const principalValue = parseFloat(principal);
    if (!principalValue || principalValue <= 0) {
      newErrors.principal = 'Loan amount is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const rate = parseFloat(interestRate) / 100 || 0;
      const months = parseInt(termMonths) || 0;
      const calculatedPayment = principalValue > 0 && rate > 0 && months > 0
        ? Math.round(calculateMonthlyPayment(principalValue, rate, months) * 100) / 100
        : null;

      const response = await debtApi.update(debt.id, {
        name: name.trim(),
        debt_type: debtType,
        currency,
        principal: principalValue,
        current_balance: parseFloat(currentBalance) || principalValue,
        interest_rate: rate > 0 ? rate : null,
        term_months: months > 0 ? months : null,
        start_date: startDate || null,
        monthly_payment: calculatedPayment,
      });

      if (response.success) {
        await mutateDebts();
        toast.success('Debt updated');
        onOpenChange(false);
      } else {
        toast.error(response.error || 'Failed to update debt');
      }
    } catch {
      toast.error('Failed to update debt');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!debt) return;

    if (!confirm(`Are you sure you want to delete "${debt.name}"? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await debtApi.delete(debt.id);
      if (response.success) {
        await mutateDebts();
        toast.success('Debt deleted');
        onOpenChange(false);
      } else {
        toast.error(response.error || 'Failed to delete debt');
      }
    } catch {
      toast.error('Failed to delete debt');
    } finally {
      setLoading(false);
    }
  };

  if (!debt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {DEBT_TYPE_LABELS[debt.debt_type]}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            {/* Name */}
            <Input
              label="Name"
              placeholder="e.g., Car Loan"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((prev) => ({ ...prev, name: '' }));
              }}
              error={errors.name}
            />

            {/* Debt Type */}
            <Select
              label="Type"
              options={DEBT_TYPE_OPTIONS}
              value={debtType}
              onChange={(e) => setDebtType(e.target.value as DebtType)}
            />

            {/* Principal & Currency */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Original Loan"
                type="number"
                step="any"
                placeholder="0.00"
                value={principal}
                onChange={(e) => {
                  setPrincipal(e.target.value);
                  setErrors((prev) => ({ ...prev, principal: '' }));
                }}
                error={errors.principal}
                hint="Initial amount borrowed"
              />
              <CurrencyCombobox
                label="Currency"
                value={currency}
                onChange={setCurrency}
              />
            </div>

            {/* Current Balance */}
            <Input
              label="Current Balance"
              type="number"
              step="any"
              placeholder="0.00"
              value={currentBalance}
              onChange={(e) => setCurrentBalance(e.target.value)}
              hint="Amount still owed"
            />

            {/* Interest Rate & Term */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Interest Rate (%)"
                type="number"
                step="any"
                placeholder="6.5"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                hint="Annual rate"
              />
              <Input
                label="Term (months)"
                type="number"
                placeholder="36"
                value={termMonths}
                onChange={(e) => setTermMonths(e.target.value)}
              />
            </div>

            {/* Start Date */}
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            {/* Monthly Payment Preview */}
            {monthlyPayment > 0 && (
              <div
                className="p-3 rounded-sm text-center"
                style={{ backgroundColor: retro.surfaceLight, border: `1px solid ${retro.bevelMid}` }}
              >
                <Label variant="muted" className="block mb-1">Estimated Monthly Payment</Label>
                <p className="text-lg font-bold" style={{ color: retro.negative }}>
                  {formatMoney(monthlyPayment)}
                </p>
              </div>
            )}

            {/* Make Payment Button */}
            {parseFloat(currentBalance) > 0 && onMakePayment && (
              <Button
                variant="primary"
                onClick={() => {
                  onOpenChange(false);
                  onMakePayment(debt);
                }}
                className="w-full"
              >
                Make Payment
              </Button>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={handleDelete}
                disabled={loading}
                className="text-red-600 hover:text-red-700"
              >
                Delete
              </Button>
              <div className="flex-1" />
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
