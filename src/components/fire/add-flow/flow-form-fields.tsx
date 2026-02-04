'use client';

import type { FlowCategoryPreset, AssetWithBalance, AssetType, RecurringFrequency } from '@/types/fire';
import {
  colors,
  Button,
  Input,
  Select,
  CurrencyCombobox,
  Label,
  IconArrow,
} from '@/components/fire/ui';
import { NewAssetForm } from './new-asset-form';
import { InvestmentTypeSelector, type InvestmentType, getInvestmentTypeConfig } from './investment-type-selector';
import { StockTickerInput } from './stock-ticker-input';
import { CURRENCY_OPTIONS, ASSET_TYPE_OPTIONS, RECURRING_OPTIONS, getFieldLabels } from './constants';
import type { FlowFormState, FlowFormErrors, NewAssetState } from './types';

interface FlowFormFieldsProps {
  selectedPreset: FlowCategoryPreset;
  form: FlowFormState;
  formErrors: FlowFormErrors;
  newAsset: NewAssetState;
  filteredFromAssets: AssetWithBalance[];
  filteredToAssets: AssetWithBalance[];
  showFromField: boolean;
  showToField: boolean;
  computedPricePerShare: string | null;
  isUsStockInvestment: boolean;
  loading: boolean;
  updateForm: <K extends keyof FlowFormState>(field: K, value: FlowFormState[K]) => void;
  updateNewAsset: <K extends keyof NewAssetState>(field: K, value: NewAssetState[K]) => void;
  handleInvestmentTypeChange: (type: InvestmentType) => void;
  handleTickerSelect: (ticker: string, name: string) => void;
  handleSubmit: () => void;
  onCancel: () => void;
}

export function FlowFormFields({
  selectedPreset,
  form,
  formErrors,
  newAsset,
  filteredFromAssets,
  filteredToAssets,
  showFromField,
  showToField,
  computedPricePerShare,
  isUsStockInvestment,
  loading,
  updateForm,
  updateNewAsset,
  handleInvestmentTypeChange,
  handleTickerSelect,
  handleSubmit,
  onCancel,
}: FlowFormFieldsProps) {
  const labels = getFieldLabels(selectedPreset.id);
  const investConfig = selectedPreset.id === 'invest' ? getInvestmentTypeConfig(form.investmentType) : null;
  const currencyLocked = !!investConfig?.currency;

  return (
    <>
      {/* Investment Type Selector (only for invest category) */}
      {selectedPreset.id === 'invest' && (
        <InvestmentTypeSelector
          value={form.investmentType}
          onChange={handleInvestmentTypeChange}
        />
      )}

      {/* Stock Ticker Input (for US Stock investment type) */}
      {isUsStockInvestment && (
        <StockTickerInput
          label="Stock Ticker"
          value={form.selectedTicker}
          selectedName={form.selectedTickerName}
          onChange={handleTickerSelect}
          placeholder="Search ticker (e.g. AAPL)"
          error={formErrors.ticker}
        />
      )}

      {/* From Field */}
      {showFromField && (
        <div>
          <Label variant="muted" className="block mb-1">{labels.from}</Label>
          {selectedPreset.from.type === 'external' ? (
            <Input
              placeholder={labels.fromPlaceholder}
              value={form.fromExternalName}
              onChange={(e) => updateForm('fromExternalName', e.target.value)}
              disabled={!selectedPreset.from.editable}
            />
          ) : newAsset.show === 'from' ? (
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
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  value={form.fromAssetId}
                  onChange={(e) => updateForm('fromAssetId', e.target.value)}
                  options={filteredFromAssets.map((a) => ({
                    value: a.id,
                    label: a.name,
                  }))}
                  placeholder={labels.fromPlaceholder}
                  error={formErrors.fromAsset}
                />
              </div>
              <Button onClick={() => updateNewAsset('show', 'from')}>+</Button>
            </div>
          )}
        </div>
      )}

      {/* Amount, Currency & Shares for invest flow */}
      {selectedPreset.id === 'invest' ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`Total Cost (${form.currency})`}
              type="number"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => updateForm('amount', e.target.value)}
              error={formErrors.amount}
            />
            <Input
              label="Qty"
              type="number"
              placeholder="0"
              value={form.shares}
              onChange={(e) => updateForm('shares', e.target.value)}
              error={formErrors.shares}
            />
          </div>
          {computedPricePerShare && (
            <p className="text-xs -mt-2" style={{ color: colors.muted }}>
              @ ${computedPricePerShare} per share
            </p>
          )}
        </>
      ) : (
        <>
          {/* Amount & Currency for non-invest flows */}
          <div className="grid grid-cols-2 gap-3">
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
              disabled={currencyLocked}
            />
          </div>

          {/* Extra Fields based on category */}
          {selectedPreset.extraFields?.includes('shares') && (
            <Input
              label="Shares"
              type="number"
              placeholder="0"
              value={form.shares}
              onChange={(e) => updateForm('shares', e.target.value)}
            />
          )}

          {selectedPreset.extraFields?.includes('price_per_share') && (
            <Input
              label="Price per Share"
              type="number"
              placeholder="0.00"
              value={form.pricePerShare}
              onChange={(e) => updateForm('pricePerShare', e.target.value)}
            />
          )}

          {/* Flow Arrow Indicator */}
          <div className="flex justify-center py-1">
            <span style={{ color: colors.muted, display: 'inline-block', transform: 'rotate(90deg)' }}>
              <IconArrow size={18} />
            </span>
          </div>

          {/* To Field (non-invest flows) */}
          {showToField && (
            <div>
              <Label variant="muted" className="block mb-1">{labels.to}</Label>
              {selectedPreset.to.type === 'external' ? (
                <Input
                  placeholder={labels.toPlaceholder}
                  value={form.toExternalName}
                  onChange={(e) => updateForm('toExternalName', e.target.value)}
                />
              ) : newAsset.show === 'to' ? (
                <NewAssetForm
                  name={newAsset.name}
                  setName={(v) => updateNewAsset('name', v)}
                  type={newAsset.type}
                  setType={(v) => updateNewAsset('type', v as AssetType)}
                  ticker={newAsset.ticker}
                  setTicker={(v) => updateNewAsset('ticker', v)}
                  onCancel={() => updateNewAsset('show', null)}
                  assetTypeOptions={ASSET_TYPE_OPTIONS}
                  suggestedTypes={selectedPreset.to.assetFilter}
                />
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1">
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
                  </div>
                  {selectedPreset.to.allowCreate && (
                    <Button onClick={() => updateNewAsset('show', 'to')}>+</Button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* To Field for invest flow (only if NOT US stock) */}
      {selectedPreset.id === 'invest' && showToField && !isUsStockInvestment && (
        <>
          <div className="flex justify-center py-1">
            <span style={{ color: colors.muted, display: 'inline-block', transform: 'rotate(90deg)' }}>
              <IconArrow size={18} />
            </span>
          </div>
          <div>
            <Label variant="muted" className="block mb-1">{labels.to}</Label>
            {newAsset.show === 'to' ? (
              <NewAssetForm
                name={newAsset.name}
                setName={(v) => updateNewAsset('name', v)}
                type={newAsset.type}
                setType={(v) => updateNewAsset('type', v as AssetType)}
                ticker={newAsset.ticker}
                setTicker={(v) => updateNewAsset('ticker', v)}
                onCancel={() => updateNewAsset('show', null)}
                assetTypeOptions={ASSET_TYPE_OPTIONS}
                suggestedTypes={selectedPreset.to.assetFilter}
              />
            ) : (
              <div className="flex gap-2">
                <div className="flex-1">
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
                </div>
                {selectedPreset.to.allowCreate && (
                  <Button onClick={() => updateNewAsset('show', 'to')}>+</Button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Date & Recurring */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) => updateForm('date', e.target.value)}
        />
        <Select
          label="Recurring"
          options={RECURRING_OPTIONS}
          value={form.recurringFrequency}
          onChange={(e) => updateForm('recurringFrequency', e.target.value as RecurringFrequency)}
        />
      </div>

      {/* Description */}
      <Input
        label="Note (optional)"
        placeholder="Add a note..."
        value={form.description}
        onChange={(e) => updateForm('description', e.target.value)}
      />

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving...' : labels.button}
        </Button>
      </div>
    </>
  );
}
