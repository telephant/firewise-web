'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { debtApi } from '@/lib/fire/api';
import { mutateDebts } from '@/hooks/fire/use-fire-data';
import type { DebtType } from '@/types/fire';
import { DEBT_TYPE_LABELS } from '@/types/fire';
import {
  colors,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  DateInput,
  Select,
  CurrencyCombobox,
  Button,
  Label,
} from '@/components/fire/ui';

interface AddDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Debt type options
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

export function AddDebtDialog({ open, onOpenChange }: AddDebtDialogProps) {
  const prevOpenRef = useRef(open);

  // Form state
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [debtType, setDebtType] = useState<DebtType>('personal_loan');
  const [currency, setCurrency] = useState('USD');
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [startDate, setStartDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form
  const resetForm = () => {
    setName('');
    setDebtType('personal_loan');
    setCurrency('USD');
    setPrincipal('');
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

    if (!wasOpen && open) {
      // Dialog just opened - reset form
      resetForm();
    } else if (wasOpen && !open) {
      // Dialog just closed - reset
      resetForm();
    }
  }, [open]);

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

      const response = await debtApi.create({
        name: name.trim(),
        debt_type: debtType,
        currency,
        principal: principalValue,
        interest_rate: rate > 0 ? rate : null,
        term_months: months > 0 ? months : null,
        start_date: startDate || null,
        monthly_payment: calculatedPayment,
      });

      if (response.success) {
        await mutateDebts();
        toast.success('Debt added');
        onOpenChange(false);
      } else {
        toast.error(response.error || 'Failed to add debt');
      }
    } catch {
      toast.error('Failed to add debt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Debt</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            {/* Name */}
            <Input
              label="Name"
              placeholder="e.g., Car Loan, Mortgage"
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
                label="Loan Amount"
                type="number"
                step="any"
                placeholder="0.00"
                value={principal}
                onChange={(e) => {
                  setPrincipal(e.target.value);
                  setErrors((prev) => ({ ...prev, principal: '' }));
                }}
                error={errors.principal}
                hint="Total amount borrowed"
              />
              <CurrencyCombobox
                label="Currency"
                value={currency}
                onChange={setCurrency}
              />
            </div>

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
            <DateInput
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
              hint="When did the loan start?"
            />

            {/* Monthly Payment Preview */}
            {monthlyPayment > 0 && (
              <div
                className="p-3 rounded-md text-center"
                style={{ backgroundColor: colors.surfaceLight, border: `1px solid ${colors.surfaceLight}` }}
              >
                <Label variant="muted" className="block mb-1">Estimated Monthly Payment</Label>
                <p className="text-lg font-bold" style={{ color: colors.negative }}>
                  {formatMoney(monthlyPayment)}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 justify-end">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Debt'}
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
