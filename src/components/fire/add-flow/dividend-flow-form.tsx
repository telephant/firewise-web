'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import type { FlowCategoryPreset, AssetWithBalance } from '@/types/fire';
import { retro, Input, CurrencyCombobox, IconArrow } from '@/components/fire/ui';
import { AssetFieldSelector } from './asset-field-selector';
import { FormActions } from './form-actions';
import { TaxSettingsDialog } from '@/components/fire/tax-settings-dialog';
import { CURRENCY_OPTIONS, getFieldLabels } from './constants';
import type { FlowFormState, FlowFormErrors, NewAssetState } from './types';
import { userTaxSettingsApi } from '@/lib/fire/api';
import { formatCurrency as formatCurrencyUtil } from '@/lib/fire/utils';

interface DividendFlowFormProps {
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

export function DividendFlowForm({
  selectedPreset,
  form,
  formErrors,
  newAsset,
  filteredFromAssets,
  filteredToAssets,
  showFromField,
  showToField,
  loading,
  updateForm,
  updateNewAsset,
  handleSubmit,
  onCancel,
}: DividendFlowFormProps) {
  const labels = getFieldLabels(selectedPreset.id);
  const [taxSettingsOpen, setTaxSettingsOpen] = useState(false);

  // Fetch user tax settings for tax calculation
  const { data: taxSettings } = useSWR(
    '/fire/tax-settings',
    async () => {
      const res = await userTaxSettingsApi.get();
      if (!res.success) return null;
      return res.data;
    }
  );

  // Calculate tax and net amount
  const taxInfo = useMemo(() => {
    const grossAmount = parseFloat(form.amount) || 0;
    const taxRate = taxSettings?.us_dividend_withholding_rate ?? 0.30;
    const taxWithheld = grossAmount * taxRate;
    const netAmount = grossAmount - taxWithheld;
    return {
      grossAmount,
      taxRate,
      taxWithheld,
      netAmount,
    };
  }, [form.amount, taxSettings]);

  const formatAmount = (amount: number) => {
    return formatCurrencyUtil(amount, { currency: form.currency });
  };

  return (
    <>
      {/* From Stock - always show for dividend */}
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

      {/* Gross Amount & Currency */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Gross Amount"
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

      {/* Tax Calculation Display */}
      {taxInfo.grossAmount > 0 ? (
        <div
          className="p-3 rounded-sm space-y-2 text-xs"
          style={{ backgroundColor: retro.surfaceLight }}
        >
          <div className="flex justify-between">
            <span style={{ color: retro.muted }}>Tax Withheld ({(taxInfo.taxRate * 100).toFixed(0)}%)</span>
            <span style={{ color: retro.negative }}>-{formatAmount(taxInfo.taxWithheld)}</span>
          </div>
          <div
            className="flex justify-between pt-2"
            style={{ borderTop: `1px solid ${retro.border}` }}
          >
            <span className="font-medium" style={{ color: retro.text }}>Net Amount</span>
            <span className="font-bold" style={{ color: retro.positive }}>{formatAmount(taxInfo.netAmount)}</span>
          </div>
          {/* Tip to update tax rate */}
          <button
            type="button"
            onClick={() => setTaxSettingsOpen(true)}
            className="w-full text-left pt-2 hover:underline"
            style={{ color: retro.info, borderTop: `1px dashed ${retro.border}` }}
          >
            Tax rate: {(taxInfo.taxRate * 100).toFixed(0)}%. Click to update in Settings
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setTaxSettingsOpen(true)}
          className="text-xs hover:underline text-left"
          style={{ color: retro.info }}
        >
          Current tax rate: {((taxSettings?.us_dividend_withholding_rate ?? 0.30) * 100).toFixed(0)}%. Click to update
        </button>
      )}

      {/* Flow Arrow */}
      <div className="flex justify-center py-1">
        <span style={{ color: retro.muted, display: 'inline-block', transform: 'rotate(90deg)' }}>
          <IconArrow size={18} />
        </span>
      </div>

      {/* Deposit To */}
      {showToField && (
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
          assetLabelMapper={(a) => a.name}
        />
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
        submitLabel={labels.button}
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />

      {/* Tax Settings Dialog */}
      <TaxSettingsDialog
        open={taxSettingsOpen}
        onOpenChange={setTaxSettingsOpen}
      />
    </>
  );
}
