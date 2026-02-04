'use client';

import type { FlowCategoryPreset, AssetWithBalance } from '@/types/fire';
import { colors, Input, Select, CurrencyCombobox, IconArrow } from '@/components/fire/ui';
import { AssetFieldSelector } from './asset-field-selector';
import { FormActions } from './form-actions';
import { CURRENCY_OPTIONS, PAYMENT_PERIOD_OPTIONS, getFieldLabels } from './constants';
import type { FlowFormState, FlowFormErrors, NewAssetState } from './types';
import type { PaymentPeriod } from '@/lib/fire/api';

interface DepositFlowFormProps {
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

export function DepositFlowForm({
  selectedPreset,
  form,
  formErrors,
  newAsset,
  filteredFromAssets,
  filteredToAssets,
  showFromField,
  loading,
  updateForm,
  updateNewAsset,
  handleSubmit,
  onCancel,
}: DepositFlowFormProps) {
  const labels = getFieldLabels(selectedPreset.id);

  // Check if creating new deposit asset
  const isCreatingNewDeposit = newAsset.show === 'to';

  return (
    <>
      {/* From Account */}
      <AssetFieldSelector
        label={labels.from}
        placeholder={labels.fromPlaceholder}
        presetConfig={selectedPreset.from}
        selectedAssetId={form.fromAssetId}
        externalName={form.fromExternalName}
        assets={filteredFromAssets}
        newAsset={newAsset}
        showNewAssetFor={newAsset.show}
        fieldType="from"
        error={formErrors.fromAsset}
        onAssetSelect={(id) => updateForm('fromAssetId', id)}
        onExternalNameChange={(name) => updateForm('fromExternalName', name)}
        onShowNewAsset={() => updateNewAsset('show', 'from')}
        updateNewAsset={updateNewAsset}
      />

      {/* Amount & Currency */}
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Amount"
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

      {/* Arrow */}
      <div className="flex justify-center">
        <span style={{ color: colors.muted, display: 'inline-block', transform: 'rotate(90deg)' }}>
          <IconArrow size={16} />
        </span>
      </div>

      {/* To Deposit Account */}
      <AssetFieldSelector
        label={labels.to}
        placeholder={labels.toPlaceholder}
        presetConfig={selectedPreset.to}
        selectedAssetId={form.toAssetId}
        externalName={form.toExternalName}
        assets={filteredToAssets}
        newAsset={newAsset}
        showNewAssetFor={newAsset.show}
        fieldType="to"
        error={formErrors.toAsset}
        onAssetSelect={(id) => updateForm('toAssetId', id)}
        onExternalNameChange={(name) => updateForm('toExternalName', name)}
        onShowNewAsset={() => updateNewAsset('show', 'to')}
        updateNewAsset={updateNewAsset}
      />

      {/* Interest Rate Settings - only when creating new deposit */}
      {isCreatingNewDeposit && (
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="APY %"
            type="number"
            step="0.01"
            placeholder="optional"
            value={form.interestRate}
            onChange={(e) => updateForm('interestRate', e.target.value)}
          />
          <Select
            label="Interest Period"
            value={form.interestPaymentPeriod}
            onChange={(e) => updateForm('interestPaymentPeriod', e.target.value as PaymentPeriod)}
            options={PAYMENT_PERIOD_OPTIONS}
          />
        </div>
      )}

      {/* Date & Note */}
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) => updateForm('date', e.target.value)}
        />
        <Input
          label="Note"
          placeholder="optional"
          value={form.description}
          onChange={(e) => updateForm('description', e.target.value)}
        />
      </div>

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
