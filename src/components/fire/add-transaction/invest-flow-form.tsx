'use client';

import type { FlowCategoryPreset, AssetWithBalance, AssetType } from '@/types/fire';
import { colors, Input, DateInput, Select, Label, Button, IconArrow } from '@/components/fire/ui';
import { InvestmentTypeSelector, type InvestmentType, getInvestmentTypeConfig } from './investment-type-selector';
import { StockTickerInput } from './stock-ticker-input';
import { MetalsSelector, type MetalType, type MetalUnit, getUnitConfig } from './metals-selector';
import { NewAssetForm } from './new-asset-form';
import { FormActions } from './form-actions';
import { ASSET_TYPE_OPTIONS, getFieldLabels } from './constants';
import type { FlowFormState, FlowFormErrors, NewAssetState } from './types';

interface InvestFlowFormProps {
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
  stockMarket?: string;
  loading: boolean;
  updateForm: <K extends keyof FlowFormState>(field: K, value: FlowFormState[K]) => void;
  updateNewAsset: <K extends keyof NewAssetState>(field: K, value: NewAssetState[K]) => void;
  handleInvestmentTypeChange: (type: InvestmentType) => void;
  handleTickerSelect: (ticker: string, name: string) => void;
  handleSubmit: () => void;
  onCancel: () => void;
}

export function InvestFlowForm({
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
  stockMarket = 'US',
  loading,
  updateForm,
  updateNewAsset,
  handleInvestmentTypeChange,
  handleTickerSelect,
  handleSubmit,
  onCancel,
}: InvestFlowFormProps) {
  const labels = getFieldLabels(selectedPreset.id);

  // Check investment type
  const isValueBasedInvestment = form.investmentType === 'real_estate' || form.investmentType === 'other';
  const isMetalsInvestment = form.investmentType === 'metals';
  const unitConfig = isMetalsInvestment ? getUnitConfig(form.metalUnit) : null;

  return (
    <div className="space-y-4">
      {/* Investment Type Selector */}
      <InvestmentTypeSelector
        value={form.investmentType}
        onChange={handleInvestmentTypeChange}
      />

      {/* Stock Ticker Input (for US/SGX Stock) */}
      {isUsStockInvestment && (
        <StockTickerInput
          label="Stock Ticker"
          value={form.selectedTicker}
          selectedName={form.selectedTickerName}
          onChange={handleTickerSelect}
          placeholder={stockMarket === 'SG' ? 'Search ticker (e.g. D05)' : 'Search ticker (e.g. AAPL)'}
          error={formErrors.ticker}
          region={stockMarket}
        />
      )}


      {/* Metals Selector (for Precious Metals) */}
      {isMetalsInvestment && (
        <MetalsSelector
          metal={form.metalType}
          unit={form.metalUnit}
          onMetalChange={(metal) => updateForm('metalType', metal)}
          onUnitChange={(unit) => updateForm('metalUnit', unit)}
        />
      )}

      {/* From Field (Pay With) - hidden for metals */}
      {showFromField && !isMetalsInvestment && (
        <div>
          <Label variant="muted" className="block mb-1">{labels.from}</Label>
          {newAsset.show === 'from' ? (
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

      {/* Amount & Shares/Value row */}
      {isValueBasedInvestment ? (
        /* Real estate / Other: Bought Value + Current Value */
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={`Bought Value (${form.currency})`}
            type="number"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => updateForm('amount', e.target.value)}
            error={formErrors.amount}
          />
          <Input
            label={`Current Value (${form.currency})`}
            type="number"
            placeholder="0.00"
            value={form.currentValue}
            onChange={(e) => updateForm('currentValue', e.target.value)}
            error={formErrors.currentValue}
          />
        </div>
      ) : (
        /* Stocks / ETFs / Metals: Total Cost + Qty */
        <>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={isMetalsInvestment ? `Cost (${form.currency}, optional)` : `Total Cost (${form.currency})`}
              type="number"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => updateForm('amount', e.target.value)}
              error={formErrors.amount}
            />
            <Input
              label={isMetalsInvestment ? `Quantity (${unitConfig?.shortLabel || 'g'})` : 'Qty'}
              type="number"
              placeholder={isMetalsInvestment ? '10' : '0'}
              step="any"
              value={form.shares}
              onChange={(e) => updateForm('shares', e.target.value)}
              error={formErrors.shares}
            />
          </div>

          {/* Computed price per share/unit */}
          {computedPricePerShare && (
            <p className="text-xs -mt-2" style={{ color: colors.muted }}>
              @ ${computedPricePerShare} per {isMetalsInvestment ? unitConfig?.shortLabel || 'unit' : 'share'}
            </p>
          )}
        </>
      )}

      {/* To Field (only if NOT US stock and NOT metals) */}
      {showToField && !isUsStockInvestment && !isMetalsInvestment && (
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
    </div>
  );
}
