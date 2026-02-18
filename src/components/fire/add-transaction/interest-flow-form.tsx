'use client';

import { useMemo } from 'react';
import type { FlowCategoryPreset, AssetWithBalance } from '@/types/fire';
import { colors, Input, DateInput, Select, CurrencyCombobox, AssetCombobox, Label, IconArrow } from '@/components/fire/ui';
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

type InterestMode = 'with_account' | 'without_account';

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

  // Mode toggle state
  const interestMode: InterestMode = noAsset ? 'without_account' : 'with_account';

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
    <div className="space-y-4">
      {/* Mode Toggle - With Account vs Without Account */}
      <div
        className="p-1 rounded-lg flex gap-1"
        style={{ backgroundColor: colors.surfaceLight }}
      >
        <button
          type="button"
          onClick={() => onToggleNoAsset(false)}
          className="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-150"
          style={{
            backgroundColor: interestMode === 'with_account' ? colors.accent : 'transparent',
            color: interestMode === 'with_account' ? '#ffffff' : colors.muted,
          }}
        >
          With Account
        </button>
        <button
          type="button"
          onClick={() => onToggleNoAsset(true)}
          className="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-150"
          style={{
            backgroundColor: interestMode === 'without_account' ? colors.accent : 'transparent',
            color: interestMode === 'without_account' ? '#ffffff' : colors.muted,
          }}
        >
          Without Account
        </button>
      </div>

      {/* Account selection based on mode */}
      {interestMode === 'without_account' ? (
        <div className="space-y-3">
          <div
            className="p-3 rounded-md"
            style={{ backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}` }}
          >
            <p className="text-sm font-medium" style={{ color: colors.text }}>
              Quick interest record
            </p>
            <p className="text-xs mt-1" style={{ color: colors.muted }}>
              Track interest without updating any account balance
            </p>
          </div>
          <Input
            label="Principal Amount (optional)"
            type="number"
            placeholder="e.g. 10000"
            value={form.interestPrincipal}
            onChange={(e) => updateForm('interestPrincipal', e.target.value)}
            hint="For tracking interest rate calculation"
          />
        </div>
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
        <div className="text-xs" style={{ color: colors.muted }}>
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
          className="p-3 rounded-md space-y-2 text-xs"
          style={{ backgroundColor: colors.surfaceLight }}
        >
          <div className="flex justify-between">
            <span style={{ color: colors.muted }}>
              {PAYMENT_PERIOD_OPTIONS.find(p => p.value === form.interestPaymentPeriod)?.label} Rate
            </span>
            <span style={{ color: colors.text }}>{formatPercent(rateInfo.periodRate * 100)}</span>
          </div>
          <div
            className="flex justify-between pt-2"
            style={{ borderTop: `1px solid ${colors.border}` }}
          >
            <span className="font-medium" style={{ color: colors.text }}>Annualized Rate (APY)</span>
            <span className="font-bold" style={{ color: colors.positive }}>{formatPercent(rateInfo.annualizedRate * 100)}</span>
          </div>
          {existingSettings && !isNewAsset && (
            <div
              className="flex justify-between pt-2 text-[10px]"
              style={{ borderTop: `1px solid ${colors.border}` }}
            >
              <span style={{ color: colors.muted }}>Previously Saved Rate</span>
              <span style={{ color: colors.muted }}>{formatPercent(existingSettings.interest_rate * 100)} APY</span>
            </div>
          )}
        </div>
      )}

      {/* Deposit Maturity Confirmation - only with asset */}
      {hasAsset && (
        <div
          className="p-3 rounded-md space-y-3"
          style={{
            backgroundColor: colors.surfaceLight,
            border: `1px solid ${form.depositMatured === null && formErrors.depositMatured ? colors.negative : colors.border}`,
          }}
        >
          <Label variant="muted" className="block text-xs uppercase tracking-wide">
            What happens to this deposit?
          </Label>

          <div
            className="flex items-start gap-3 rounded-md p-2 -m-2 cursor-pointer transition-colors duration-150 hover:bg-white/[0.03]"
            onClick={() => updateForm('depositMatured', false)}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); updateForm('depositMatured', false); }}
              className="flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 mt-0.5 transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#5E6AD2]/50"
              style={{
                backgroundColor: form.depositMatured === false ? colors.accent : 'transparent',
                border: `2px solid ${form.depositMatured === false ? colors.accent : 'rgba(255,255,255,0.15)'}`,
              }}
            >
              {form.depositMatured === false && (
                <span className="w-2 h-2 rounded-full bg-white" />
              )}
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: colors.text }}>
                Keep in deposit account
              </p>
              <p className="text-xs" style={{ color: colors.muted }}>
                Interest adds to balance, deposit continues
              </p>
            </div>
          </div>

          <div
            className="flex items-start gap-3 rounded-md p-2 -m-2 cursor-pointer transition-colors duration-150 hover:bg-white/[0.03]"
            style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '12px', marginTop: '0' }}
            onClick={() => updateForm('depositMatured', true)}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); updateForm('depositMatured', true); }}
              className="flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 mt-0.5 transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#5E6AD2]/50"
              style={{
                backgroundColor: form.depositMatured === true ? colors.accent : 'transparent',
                border: `2px solid ${form.depositMatured === true ? colors.accent : 'rgba(255,255,255,0.15)'}`,
              }}
            >
              {form.depositMatured === true && (
                <span className="w-2 h-2 rounded-full bg-white" />
              )}
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: colors.text }}>
                Withdraw to cash account
              </p>
              <p className="text-xs" style={{ color: colors.muted }}>
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
            <span style={{ color: colors.muted, display: 'inline-block', transform: 'rotate(90deg)' }}>
              <IconArrow size={18} />
            </span>
          </div>

          <div
            className="p-2 rounded-md text-xs"
            style={{ backgroundColor: colors.surfaceLight, color: colors.muted }}
          >
            {form.depositMatured === true ? (
              <>
                Principal + Interest will move to:{' '}
                <span style={{ color: colors.text, fontWeight: 500 }}>
                  {cashAssets.find(a => a.id === form.withdrawToCashAssetId)?.name || 'Select account'}
                </span>
              </>
            ) : (
              <>
                Interest will be added to:{' '}
                <span style={{ color: colors.text, fontWeight: 500 }}>{accountName}</span>
              </>
            )}
          </div>
        </>
      )}

      {/* Date */}
      <DateInput
        label="Payment Date"
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
    </div>
  );
}
