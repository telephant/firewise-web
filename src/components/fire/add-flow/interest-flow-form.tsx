'use client';

import { useMemo } from 'react';
import type { FlowCategoryPreset, AssetWithBalance } from '@/types/fire';
import { retro, Input, Select, CurrencyCombobox, AssetCombobox, Label, IconArrow } from '@/components/fire/ui';
import { NewAssetForm } from './new-asset-form';
import { FormActions } from './form-actions';
import { ASSET_TYPE_OPTIONS, PAYMENT_PERIOD_OPTIONS, getFieldLabels } from './constants';
import type { AssetType } from '@/types/fire';
import type { FlowFormState, FlowFormErrors, NewAssetState } from './types';
import type { PaymentPeriod, AssetInterestSettings } from '@/lib/fire/api';
import { formatPercent } from '@/lib/fire/utils';

interface InterestFlowFormProps {
  selectedPreset: FlowCategoryPreset;
  form: FlowFormState;
  formErrors: FlowFormErrors;
  newAsset: NewAssetState;
  filteredFromAssets: AssetWithBalance[];
  filteredToAssets: AssetWithBalance[];
  cashAssets: AssetWithBalance[];
  showFromField: boolean;
  showToField: boolean;
  loading: boolean;
  noAsset: boolean;
  onToggleNoAsset: (value: boolean) => void;
  interestSettingsMap?: Record<string, AssetInterestSettings>;
  updateForm: <K extends keyof FlowFormState>(field: K, value: FlowFormState[K]) => void;
  updateNewAsset: <K extends keyof NewAssetState>(field: K, value: NewAssetState[K]) => void;
  handleSubmit: () => void;
  onCancel: () => void;
}

export function InterestFlowForm({
  selectedPreset,
  form,
  formErrors,
  newAsset,
  filteredFromAssets,
  cashAssets,
  loading,
  noAsset,
  onToggleNoAsset,
  interestSettingsMap = {},
  updateForm,
  updateNewAsset,
  handleSubmit,
  onCancel,
}: InterestFlowFormProps) {
  const labels = getFieldLabels(selectedPreset.id);

  // Check if user selected an existing asset or is creating new
  const isNewAsset = newAsset.show === 'from';
  const selectedAsset = useMemo(() => {
    return filteredFromAssets.find(a => a.id === form.fromAssetId);
  }, [filteredFromAssets, form.fromAssetId]);

  // Get existing interest settings for selected asset
  const existingSettings = form.fromAssetId ? interestSettingsMap[form.fromAssetId] : null;

  // Get number of payment periods per year for selected payment period
  const getPeriodsPerYear = (period: PaymentPeriod): number => {
    switch (period) {
      case 'weekly': return 52;
      case 'monthly': return 12;
      case 'quarterly': return 4;
      case 'semi_annual': return 2;
      case 'annual': return 1;
      case 'biennial': return 0.5;
      case 'triennial': return 1/3;
      case 'quinquennial': return 0.2;
      default: return 12;
    }
  };

  // Get balance - from new asset input or selected existing asset
  const currentBalance = useMemo(() => {
    if (isNewAsset) {
      return parseFloat(form.depositBalance) || 0;
    }
    return selectedAsset?.balance || 0;
  }, [isNewAsset, form.depositBalance, selectedAsset?.balance]);

  // Calculate annualized interest rate based on selected payment period
  const rateInfo = useMemo(() => {
    const interestAmount = parseFloat(form.amount) || 0;
    const balance = currentBalance;

    if (interestAmount <= 0 || balance <= 0) {
      return null;
    }

    const periodsPerYear = getPeriodsPerYear(form.interestPaymentPeriod);
    const periodRate = interestAmount / balance;

    // Calculate APY: (1 + period_rate)^periods_per_year - 1
    const annualizedRate = Math.pow(1 + periodRate, periodsPerYear) - 1;

    return {
      interestAmount,
      balance,
      periodRate,
      annualizedRate,
    };
  }, [form.amount, currentBalance, form.interestPaymentPeriod]);

  // Get display name for the account
  const accountName = isNewAsset ? (newAsset.name || 'New account') : (selectedAsset?.name || 'Selected account');

  const hasAsset = !noAsset && (isNewAsset || !!form.fromAssetId);

  return (
    <>
      {/* Account selection or no-asset mode */}
      {noAsset ? (
        <>
          <div
            className="p-3 rounded-sm text-xs"
            style={{ backgroundColor: retro.surfaceLight }}
          >
            <p className="text-sm" style={{ color: retro.text }}>
              Recording interest as income
            </p>
            <button
              type="button"
              className="mt-1 underline"
              style={{ color: retro.accent }}
              onClick={() => onToggleNoAsset(false)}
            >
              Link to a deposit account
            </button>
          </div>
          <AssetCombobox
            label="Deposit to"
            placeholder="Select cash account..."
            value={form.toAssetId}
            assets={cashAssets}
            onChange={(id) => updateForm('toAssetId', id)}
            error={formErrors.toAsset}
            showBalance={true}
          />
        </>
      ) : isNewAsset ? (
        <NewAssetForm
          name={newAsset.name}
          setName={(v) => updateNewAsset('name', v)}
          type={newAsset.type}
          setType={(v) => updateNewAsset('type', v as AssetType)}
          ticker={newAsset.ticker}
          setTicker={(v) => updateNewAsset('ticker', v)}
          onCancel={() => updateNewAsset('show', null)}
          assetTypeOptions={ASSET_TYPE_OPTIONS}
          suggestedTypes={selectedPreset.from.assetFilter}
        />
      ) : (
        <div>
          <AssetCombobox
            label={labels.from}
            placeholder={labels.fromPlaceholder}
            value={form.fromAssetId}
            assets={filteredFromAssets}
            onChange={(id) => updateForm('fromAssetId', id)}
            error={formErrors.fromAsset}
            showBalance={true}
            allowCreate={true}
            onCreateNew={() => updateNewAsset('show', 'from')}
          />
          <button
            type="button"
            className="mt-1 text-xs underline"
            style={{ color: retro.muted }}
            onClick={() => onToggleNoAsset(true)}
          >
            No specific account? Record as income
          </button>
        </div>
      )}

      {/* Balance input - only show when creating new asset */}
      {!noAsset && isNewAsset && (
        <Input
          label="Current Balance"
          type="number"
          placeholder="0.00"
          value={form.depositBalance}
          onChange={(e) => updateForm('depositBalance', e.target.value)}
          error={formErrors.depositBalance}
        />
      )}

      {/* Show current balance if existing asset selected */}
      {!noAsset && !isNewAsset && selectedAsset && (
        <div className="text-xs" style={{ color: retro.muted }}>
          Current balance: {selectedAsset.balance.toLocaleString()} {selectedAsset.currency}
        </div>
      )}

      {/* Interest Amount & Payment Period */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Interest Received"
          type="number"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => updateForm('amount', e.target.value)}
          error={formErrors.amount}
        />
        <Select
          label="Payment Period"
          value={form.interestPaymentPeriod}
          onChange={(e) => updateForm('interestPaymentPeriod', e.target.value as PaymentPeriod)}
          options={PAYMENT_PERIOD_OPTIONS}
        />
      </div>

      {/* Currency */}
      <CurrencyCombobox
        label="Currency"
        value={form.currency}
        onChange={(value) => updateForm('currency', value)}
      />

      {/* Interest Rate Calculation Display - only with asset */}
      {hasAsset && rateInfo && (
        <div
          className="p-3 rounded-sm space-y-2 text-xs"
          style={{ backgroundColor: retro.surfaceLight }}
        >
          <div className="flex justify-between">
            <span style={{ color: retro.muted }}>
              {PAYMENT_PERIOD_OPTIONS.find(p => p.value === form.interestPaymentPeriod)?.label} Rate
            </span>
            <span style={{ color: retro.text }}>{formatPercent(rateInfo.periodRate * 100)}</span>
          </div>
          <div
            className="flex justify-between pt-2"
            style={{ borderTop: `1px solid ${retro.border}` }}
          >
            <span className="font-medium" style={{ color: retro.text }}>Annualized Rate (APY)</span>
            <span className="font-bold" style={{ color: retro.positive }}>{formatPercent(rateInfo.annualizedRate * 100)}</span>
          </div>
          {existingSettings && !isNewAsset && (
            <div
              className="flex justify-between pt-2 text-[10px]"
              style={{ borderTop: `1px solid ${retro.border}` }}
            >
              <span style={{ color: retro.muted }}>Previously Saved Rate</span>
              <span style={{ color: retro.muted }}>{formatPercent(existingSettings.interest_rate * 100)} APY</span>
            </div>
          )}
        </div>
      )}

      {/* Deposit Maturity Confirmation - only with asset */}
      {hasAsset && (
        <div
          className="p-3 rounded-sm space-y-3"
          style={{
            backgroundColor: retro.surfaceLight,
            border: `1px solid ${form.depositMatured === null && formErrors.depositMatured ? '#c53030' : retro.border}`,
          }}
        >
          <Label variant="muted" className="block text-xs uppercase tracking-wide">
            What happens to this deposit?
          </Label>

          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => updateForm('depositMatured', false)}
              className="flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 mt-0.5"
              style={{
                backgroundColor: form.depositMatured === false ? retro.accent : 'transparent',
                border: `2px solid ${form.depositMatured === false ? retro.accent : retro.border}`,
              }}
            >
              {form.depositMatured === false && (
                <span className="w-2 h-2 rounded-full bg-white" />
              )}
            </button>
            <div
              className="flex-1 cursor-pointer"
              onClick={() => updateForm('depositMatured', false)}
            >
              <p className="text-sm font-medium" style={{ color: retro.text }}>
                Keep in deposit account
              </p>
              <p className="text-xs" style={{ color: retro.muted }}>
                Interest adds to balance, deposit continues
              </p>
            </div>
          </div>

          <div
            className="flex items-start gap-3"
            style={{ borderTop: `1px solid ${retro.border}`, paddingTop: '12px' }}
          >
            <button
              type="button"
              onClick={() => updateForm('depositMatured', true)}
              className="flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 mt-0.5"
              style={{
                backgroundColor: form.depositMatured === true ? retro.accent : 'transparent',
                border: `2px solid ${form.depositMatured === true ? retro.accent : retro.border}`,
              }}
            >
              {form.depositMatured === true && (
                <span className="w-2 h-2 rounded-full bg-white" />
              )}
            </button>
            <div
              className="flex-1 cursor-pointer"
              onClick={() => updateForm('depositMatured', true)}
            >
              <p className="text-sm font-medium" style={{ color: retro.text }}>
                Withdraw to cash account
              </p>
              <p className="text-xs" style={{ color: retro.muted }}>
                Deposit matured, move principal + interest to cash
              </p>
            </div>
          </div>

          {/* Cash account selector - only show when withdrawing */}
          {form.depositMatured === true && (
            <div className="pt-2">
              <AssetCombobox
                label="Withdraw to"
                placeholder="Select cash account..."
                value={form.withdrawToCashAssetId}
                assets={cashAssets}
                onChange={(id) => updateForm('withdrawToCashAssetId', id)}
                error={formErrors.toAsset}
                showBalance={true}
              />
            </div>
          )}
        </div>
      )}

      {/* Destination info - only with asset and when user has made a selection */}
      {hasAsset && form.depositMatured !== null && (
        <>
          {/* Flow Arrow */}
          <div className="flex justify-center py-1">
            <span style={{ color: retro.muted, display: 'inline-block', transform: 'rotate(90deg)' }}>
              <IconArrow size={18} />
            </span>
          </div>

          <div
            className="p-2 rounded-sm text-xs"
            style={{ backgroundColor: retro.surfaceLight, color: retro.muted }}
          >
            {form.depositMatured === true ? (
              <>
                Principal + Interest will move to:{' '}
                <span style={{ color: retro.text, fontWeight: 500 }}>
                  {cashAssets.find(a => a.id === form.withdrawToCashAssetId)?.name || 'Select account'}
                </span>
              </>
            ) : (
              <>
                Interest will be added to:{' '}
                <span style={{ color: retro.text, fontWeight: 500 }}>{accountName}</span>
              </>
            )}
          </div>
        </>
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
    </>
  );
}
