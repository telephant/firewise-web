'use client';

import { useMemo } from 'react';
import type { FlowCategoryPreset, Debt, AssetWithBalance, DebtType } from '@/types/fire';
import { DEBT_TYPE_LABELS } from '@/types/fire';
import { useDebts } from '@/hooks/fire/use-fire-data';
import {
  colors,
  Input,
  CurrencyCombobox,
  IconArrow,
  IconDebt,
  IconHome,
  Select,
  PaymentSourceSelector,
} from '@/components/fire/ui';
import { FormActions } from './form-actions';
import { getFieldLabels } from './constants';
import type { FlowFormState, FlowFormErrors, NewAssetState } from './types';
import { formatCurrency } from '@/lib/fire/utils';

interface PayDebtFlowFormProps {
  selectedPreset: FlowCategoryPreset;
  form: FlowFormState;
  formErrors: FlowFormErrors;
  newAsset: NewAssetState;
  cashAssets: AssetWithBalance[];
  loading: boolean;
  updateForm: <K extends keyof FlowFormState>(field: K, value: FlowFormState[K]) => void;
  updateNewAsset: <K extends keyof NewAssetState>(field: K, value: NewAssetState[K]) => void;
  handleSubmit: () => void;
  onCancel: () => void;
}

const DEBT_ICONS: Record<DebtType, React.ComponentType<{ size?: number }>> = {
  mortgage: IconHome,
  personal_loan: IconDebt,
  credit_card: IconDebt,
  student_loan: IconDebt,
  auto_loan: IconDebt,
  other: IconDebt,
};

export function PayDebtFlowForm({
  selectedPreset,
  form,
  formErrors,
  cashAssets,
  loading,
  updateForm,
  handleSubmit,
  onCancel,
}: PayDebtFlowFormProps) {
  const labels = getFieldLabels(selectedPreset.id);

  // Fetch debts from the new debts table
  const { debts, isLoading: debtsLoading } = useDebts();

  // Get selected debt
  const selectedDebt = useMemo(() => {
    return debts.find(d => d.id === form.debtId);
  }, [debts, form.debtId]);

  // Get debt icon
  const DebtIcon = selectedDebt ? DEBT_ICONS[selectedDebt.debt_type] || IconDebt : IconDebt;

  // Calculate remaining balance
  const remainingBalance = selectedDebt?.current_balance || 0;

  // Calculate if this payment will pay off the debt
  const paymentAmount = parseFloat(form.amount) || 0;
  const willPayOff = paymentAmount >= remainingBalance && remainingBalance > 0;

  // Debt options for select
  const debtOptions = useMemo(() => {
    return debts.map(debt => ({
      value: debt.id,
      label: `${debt.name} (${DEBT_TYPE_LABELS[debt.debt_type]})`,
    }));
  }, [debts]);


  return (
    <>
      {/* Step 1: Select Debt */}
      <Select
        label="Which debt are you paying?"
        placeholder={debtsLoading ? 'Loading debts...' : 'Select debt...'}
        value={form.debtId || ''}
        options={debtOptions}
        onChange={(e) => {
          const debtId = e.target.value;
          updateForm('debtId', debtId || null);
          // Auto-set currency from debt
          const debt = debts.find(d => d.id === debtId);
          if (debt?.currency) {
            updateForm('currency', debt.currency);
          }
        }}
        error={formErrors.debtId}
      />

      {/* Show debt details if selected */}
      {selectedDebt && (
        <div
          className="p-3 rounded-md space-y-2"
          style={{ backgroundColor: colors.surfaceLight }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: colors.negative }}>
              <DebtIcon size={16} />
            </span>
            <span className="text-sm font-medium" style={{ color: colors.text }}>
              {selectedDebt.name}
            </span>
            <span className="text-xs" style={{ color: colors.muted }}>
              {DEBT_TYPE_LABELS[selectedDebt.debt_type]}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: colors.muted }}>Remaining Balance</span>
            <span className="font-bold" style={{ color: colors.negative }}>
              {formatCurrency(-remainingBalance, { currency: selectedDebt.currency })}
            </span>
          </div>
          {selectedDebt.interest_rate && (
            <div className="flex justify-between text-xs">
              <span style={{ color: colors.muted }}>Interest Rate</span>
              <span style={{ color: colors.text }}>
                {(selectedDebt.interest_rate * 100).toFixed(2)}% APR
              </span>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Payment Source */}
      <PaymentSourceSelector
        sourceType={form.payDebtSourceType}
        onSourceTypeChange={(value) => updateForm('payDebtSourceType', value)}
        cashAssetId={form.fromAssetId || ''}
        onCashAssetChange={(id) => updateForm('fromAssetId', id)}
        externalName={form.payDebtExternalName}
        onExternalNameChange={(name) => updateForm('payDebtExternalName', name)}
        cashAssets={cashAssets}
        cashAssetError={formErrors.fromAsset}
      />

      {/* Flow Arrow */}
      <div className="flex justify-center py-1">
        <span style={{ color: colors.muted, display: 'inline-block', transform: 'rotate(90deg)' }}>
          <IconArrow size={18} />
        </span>
      </div>

      {/* Payment Amount */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Payment Amount"
          type="number"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => updateForm('amount', e.target.value)}
          error={formErrors.amount}
        />
        <CurrencyCombobox
          label="Currency"
          value={form.currency}
          onChange={(value) => updateForm('currency', value)}
        />
      </div>

      {/* Pay off indicator */}
      {willPayOff && selectedDebt && (
        <div
          className="p-3 rounded-md text-center"
          style={{
            backgroundColor: colors.positive + '20',
            border: `1px solid ${colors.positive}`,
          }}
        >
          <p className="text-sm font-bold" style={{ color: colors.positive }}>
            This will pay off your debt completely!
          </p>
          <p className="text-xs mt-1" style={{ color: colors.text }}>
            Remaining after payment: {formatCurrency(0)}
          </p>
        </div>
      )}

      {/* Remaining after payment (if not paying off) */}
      {!willPayOff && selectedDebt && paymentAmount > 0 && (
        <div className="text-xs text-center" style={{ color: colors.muted }}>
          Remaining after payment:{' '}
          <span style={{ color: colors.negative, fontWeight: 500 }}>
            {formatCurrency(-(remainingBalance - paymentAmount), { currency: selectedDebt.currency })}
          </span>
        </div>
      )}

      {/* Date */}
      <Input
        label="Payment Date"
        type="date"
        value={form.date}
        onChange={(e) => updateForm('date', e.target.value)}
      />

      {/* Description */}
      <Input
        label="Note (optional)"
        placeholder="Add a note..."
        value={form.description}
        onChange={(e) => updateForm('description', e.target.value)}
      />

      {/* Actions */}
      <FormActions
        loading={loading}
        submitLabel={willPayOff ? 'Pay Off Debt' : labels.button}
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />
    </>
  );
}
