'use client';

import { useMemo, useEffect, useRef } from 'react';
import type { FlowCategoryPreset, AssetWithBalance } from '@/types/fire';
import { colors, Input, AssetCombobox } from '@/components/fire/ui';
import { FormActions } from './form-actions';
import type { FlowFormState, FlowFormErrors, NewAssetState } from './types';
import { formatCurrency } from '@/lib/fire/utils';

interface ReinvestFlowFormProps {
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

export function ReinvestFlowForm({
  form,
  formErrors,
  filteredFromAssets,
  loading,
  updateForm,
  handleSubmit,
  onCancel,
}: ReinvestFlowFormProps) {
  const prevFromAssetIdRef = useRef(form.fromAssetId);

  // Get selected asset (same for from and to in DRIP)
  const selectedAsset = useMemo(() => {
    return filteredFromAssets.find((a) => a.id === form.fromAssetId);
  }, [filteredFromAssets, form.fromAssetId]);

  // Calculate values
  const amount = parseFloat(form.amount) || 0;
  const shares = parseFloat(form.shares) || 0;
  const pricePerShare = shares > 0 ? amount / shares : 0;

  // Calculate new total shares
  const currentShares = selectedAsset?.balance || 0;
  const newTotalShares = currentShares + shares;

  // Sync toAssetId with fromAssetId (DRIP = same asset)
  useEffect(() => {
    if (form.fromAssetId && form.fromAssetId !== prevFromAssetIdRef.current) {
      prevFromAssetIdRef.current = form.fromAssetId;
      const asset = filteredFromAssets.find((a) => a.id === form.fromAssetId);
      if (asset) {
        // Set toAssetId same as fromAssetId (DRIP)
        updateForm('toAssetId', form.fromAssetId);
        // Set currency from asset
        updateForm('currency', asset.currency);
      }
    }
  }, [form.fromAssetId, filteredFromAssets, updateForm]);

  return (
    <>
      {/* Stock selector - single asset for DRIP */}
      <AssetCombobox
        label="Stock"
        placeholder="Select stock..."
        value={form.fromAssetId}
        assets={filteredFromAssets}
        onChange={(id) => updateForm('fromAssetId', id)}
        error={formErrors.fromAsset}
        showBalance={true}
      />

      {/* Show current shares */}
      {selectedAsset && (
        <div
          className="px-3 py-2 rounded-md text-xs"
          style={{ backgroundColor: colors.surfaceLight }}
        >
          <span style={{ color: colors.muted }}>
            Current: {currentShares.toLocaleString()} shares of {selectedAsset.ticker || selectedAsset.name}
          </span>
        </div>
      )}

      {/* Dividend Amount & Shares Acquired */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Dividend Amount"
          type="number"
          step="any"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => updateForm('amount', e.target.value)}
          error={formErrors.amount}
        />
        <Input
          label="Shares Acquired"
          type="number"
          step="any"
          placeholder="0"
          value={form.shares}
          onChange={(e) => updateForm('shares', e.target.value)}
          error={formErrors.shares}
        />
      </div>

      {/* Calculated price per share */}
      {amount > 0 && shares > 0 && (
        <div className="text-xs text-right -mt-2" style={{ color: colors.muted }}>
          Price: {formatCurrency(pricePerShare, { currency: form.currency })}/share
        </div>
      )}

      {/* Summary */}
      {selectedAsset && shares > 0 && (
        <div
          className="p-3 rounded-md"
          style={{ backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-2 text-sm">
            <span style={{ color: colors.positive }}>+{shares.toLocaleString()}</span>
            <span style={{ color: colors.muted }}>shares →</span>
            <span style={{ color: colors.text, fontWeight: 500 }}>
              {newTotalShares.toLocaleString()} total
            </span>
          </div>
        </div>
      )}

      {/* Date */}
      <Input
        label="Date"
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
        submitLabel="Reinvest Dividend"
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />
    </>
  );
}
