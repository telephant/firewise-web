'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import type { FlowCategoryPreset, AssetWithBalance } from '@/types/fire';
import { colors, Input, DateInput, CurrencyCombobox, IconArrow } from '@/components/fire/ui';
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
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  // Get selected from asset to determine market
  const selectedFromAsset = useMemo(() => {
    return filteredFromAssets.find(a => a.id === form.fromAssetId);
  }, [filteredFromAssets, form.fromAssetId]);

  // Determine tax rate based on asset's market
  const getTaxRateForMarket = (market: string | null | undefined) => {
    if (market === 'SG') {
      return taxSettings?.sg_dividend_withholding_rate ?? 0.00;
    }
    // Default to US rate
    return taxSettings?.us_dividend_withholding_rate ?? 0.30;
  };

  // Calculate tax and net amount
  const taxInfo = useMemo(() => {
    const grossAmount = parseFloat(form.amount) || 0;
    const market = selectedFromAsset?.market;
    const taxRate = getTaxRateForMarket(market);
    const taxWithheld = grossAmount * taxRate;
    const netAmount = grossAmount - taxWithheld;
    return {
      grossAmount,
      taxRate,
      taxWithheld,
      netAmount,
      market,
    };
  }, [form.amount, taxSettings, selectedFromAsset]);

  const formatAmount = (amount: number) => {
    return formatCurrencyUtil(amount, { currency: form.currency, decimals: 2 });
  };

  return (
    <div className="space-y-4">
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

      {/* Tax Calculation Display - compact */}
      {taxInfo.grossAmount > 0 ? (
        <div
          className="p-2.5 rounded-md text-xs"
          style={{ backgroundColor: colors.surfaceLight }}
        >
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setTaxSettingsOpen(true)}
              className="hover:underline transition-colors duration-150"
              style={{ color: colors.muted }}
            >
              {taxInfo.market === 'SG' ? '🇸🇬' : '🇺🇸'} Tax ({(taxInfo.taxRate * 100).toFixed(0)}%)
            </button>
            <span style={{ color: colors.negative }}>-{formatAmount(taxInfo.taxWithheld)}</span>
          </div>
          <div className="flex justify-between items-center mt-1.5 pt-1.5" style={{ borderTop: `1px solid ${colors.border}` }}>
            <span className="font-medium" style={{ color: colors.text }}>Net</span>
            <span className="font-bold" style={{ color: colors.positive }}>{formatAmount(taxInfo.netAmount)}</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setTaxSettingsOpen(true)}
          className="text-xs hover:underline text-left transition-colors duration-150"
          style={{ color: colors.muted }}
        >
          Tax rate: {(getTaxRateForMarket(selectedFromAsset?.market) * 100).toFixed(0)}% (click to configure)
        </button>
      )}

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
      <DateInput
        label="Date"
        value={form.date}
        onChange={(val) => updateForm('date', val)}
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
    </div>
  );
}
