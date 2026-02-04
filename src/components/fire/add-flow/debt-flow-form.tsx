'use client';

import { useMemo } from 'react';
import type { FlowCategoryPreset, AssetWithBalance, DebtType } from '@/types/fire';
import { DEBT_TYPE_LABELS } from '@/types/fire';
import { colors, Input, Select, CurrencyCombobox, Label, IconArrow } from '@/components/fire/ui';
import { FormActions } from './form-actions';
import { getFieldLabels } from './constants';
import type { FlowFormState, FlowFormErrors, NewAssetState } from './types';

interface DebtFlowFormProps {
  selectedPreset: FlowCategoryPreset;
  form: FlowFormState;
  formErrors: FlowFormErrors;
  newAsset: NewAssetState;
  filteredFromAssets: AssetWithBalance[];
  filteredToAssets: AssetWithBalance[];
  showFromField: boolean;
  showToField: boolean;
  loading: boolean;
  updateForm: <K extends keyof FlowFormState>(field: K, value: FlowFormState[K]) => void;
  updateNewAsset: <K extends keyof NewAssetState>(field: K, value: NewAssetState[K]) => void;
  handleSubmit: () => void;
  onCancel: () => void;
}

// Debt type options
const DEBT_TYPE_OPTIONS = (Object.keys(DEBT_TYPE_LABELS) as DebtType[]).map((t) => ({
  value: t,
  label: DEBT_TYPE_LABELS[t],
}));

// Calculate monthly payment using standard amortization formula
function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  if (annualRate <= 0) return principal / termMonths; // No interest

  const monthlyRate = annualRate / 12;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  return payment;
}

export function DebtFlowForm({
  selectedPreset,
  form,
  formErrors,
  filteredToAssets,
  showToField,
  loading,
  updateForm,
  handleSubmit,
  onCancel,
}: DebtFlowFormProps) {
  const labels = getFieldLabels(selectedPreset.id);
  const isMortgage = selectedPreset.id === 'add_mortgage';

  // Calculate monthly payment when inputs change
  const monthlyPayment = useMemo(() => {
    const principal = parseFloat(form.debtPrincipal) || 0;
    const rate = parseFloat(form.debtInterestRate) / 100 || 0;
    const months = parseInt(form.debtTermMonths) || 0;
    return calculateMonthlyPayment(principal, rate, months);
  }, [form.debtPrincipal, form.debtInterestRate, form.debtTermMonths]);

  // Format currency for display
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: form.currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <>
      {/* Debt Name */}
      <Input
        label={isMortgage ? 'Mortgage Name' : 'Loan Name'}
        placeholder={isMortgage ? 'e.g., Home Mortgage' : 'e.g., Car Loan'}
        value={form.debtName}
        onChange={(e) => updateForm('debtName', e.target.value)}
        error={formErrors.debtName}
      />

      {/* Debt Type (only for loan, mortgage is fixed) */}
      {!isMortgage && (
        <Select
          label="Loan Type"
          options={DEBT_TYPE_OPTIONS.filter(o => o.value !== 'mortgage')}
          value={form.debtType}
          onChange={(e) => updateForm('debtType', e.target.value as DebtType)}
        />
      )}

      {/* Principal & Currency */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Loan Amount"
          type="number"
          placeholder="0.00"
          value={form.debtPrincipal}
          onChange={(e) => updateForm('debtPrincipal', e.target.value)}
          error={formErrors.debtPrincipal}
        />
        <CurrencyCombobox
          label="Currency"
          value={form.currency}
          onChange={(value) => updateForm('currency', value)}
        />
      </div>

      {/* Interest Rate & Term */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Interest Rate (%)"
          type="number"
          placeholder="6.5"
          value={form.debtInterestRate}
          onChange={(e) => updateForm('debtInterestRate', e.target.value)}
          hint="Annual rate"
        />
        <Input
          label={isMortgage ? 'Term (years)' : 'Term (months)'}
          type="number"
          placeholder={isMortgage ? '30' : '36'}
          value={
            isMortgage && form.debtTermMonths
              ? String(Math.round(parseInt(form.debtTermMonths) / 12))
              : form.debtTermMonths
          }
          onChange={(e) => {
            // For mortgage, convert years to months for storage
            if (isMortgage) {
              const years = parseInt(e.target.value) || 0;
              updateForm('debtTermMonths', String(years * 12));
            } else {
              updateForm('debtTermMonths', e.target.value);
            }
          }}
        />
      </div>

      {/* Start Date */}
      <Input
        label="Start Date"
        type="date"
        value={form.debtStartDate}
        onChange={(e) => updateForm('debtStartDate', e.target.value)}
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

      {/* Lender */}
      <Input
        label={labels.from}
        placeholder={labels.fromPlaceholder}
        value={form.fromExternalName}
        onChange={(e) => updateForm('fromExternalName', e.target.value)}
      />

      {/* Flow Arrow */}
      <div className="flex justify-center py-1">
        <span style={{ color: colors.muted, display: 'inline-block', transform: 'rotate(90deg)' }}>
          <IconArrow size={18} />
        </span>
      </div>

      {/* Deposit To (where loan money goes) */}
      {showToField && (
        <div>
          <Label variant="muted" className="block mb-1">{labels.to}</Label>
          <Select
            value={form.toAssetId}
            onChange={(e) => updateForm('toAssetId', e.target.value)}
            options={filteredToAssets.map((a) => ({
              value: a.id,
              label: a.name,
            }))}
            placeholder={labels.toPlaceholder}
            error={formErrors.toAsset}
          />
          <p className="text-[10px] mt-1" style={{ color: colors.muted }}>
            Where the loan money was deposited
          </p>
        </div>
      )}

      {/* Note */}
      <Input
        label="Note (optional)"
        placeholder="Add a note..."
        value={form.description}
        onChange={(e) => updateForm('description', e.target.value)}
      />

      {/* Actions */}
      <FormActions
        loading={loading}
        submitLabel={labels.button}
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />
    </>
  );
}
