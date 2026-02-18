'use client';

import type { FlowCategoryPreset, AssetWithBalance, AssetType, RecurringFrequency } from '@/types/fire';
import { colors, Input, DateInput, Select, CurrencyCombobox, Label, Button, IconArrow } from '@/components/fire/ui';
import { NewAssetForm } from './new-asset-form';
import { FormActions } from './form-actions';
import { CURRENCY_OPTIONS, ASSET_TYPE_OPTIONS, RECURRING_OPTIONS, getFieldLabels } from './constants';
import type { FlowFormState, FlowFormErrors, NewAssetState } from './types';

interface TransferFlowFormProps {
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

export function TransferFlowForm({
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
}: TransferFlowFormProps) {
  const labels = getFieldLabels(selectedPreset.id);

  return (
    <div className="space-y-4">
      {/* From Field */}
      {showFromField && (
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

      {/* Amount & Currency */}
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
        />
      </div>

      {/* Extra fields for sell/reinvest flows */}
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

      {/* Flow Arrow */}
      <div className="flex justify-center py-1">
        <span style={{ color: colors.muted, display: 'inline-block', transform: 'rotate(90deg)' }}>
          <IconArrow size={18} />
        </span>
      </div>

      {/* To Field */}
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

      {/* Date & Recurring */}
      <div className="grid grid-cols-2 gap-3">
        <DateInput
          label="Date"
          value={form.date}
          onChange={(val) => updateForm('date', val)}
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
      <FormActions
        loading={loading}
        submitLabel={labels.button}
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
