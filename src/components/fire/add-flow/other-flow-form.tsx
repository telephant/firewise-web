'use client';

import type { FlowCategoryPreset, AssetWithBalance, AssetType } from '@/types/fire';
import { Input, CurrencyCombobox, AssetCombobox, Label, Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/fire/ui';
import { NewAssetForm } from './new-asset-form';
import { FormActions } from './form-actions';
import { ASSET_TYPE_OPTIONS } from './constants';
import type { FlowFormState, FlowFormErrors, NewAssetState } from './types';

interface OtherFlowFormProps {
  selectedPreset: FlowCategoryPreset;
  form: FlowFormState;
  formErrors: FlowFormErrors;
  newAsset: NewAssetState;
  filteredFromAssets: AssetWithBalance[];
  filteredToAssets: AssetWithBalance[];
  showFromField: boolean;
  showToField: boolean;
  loading: boolean;
  allAssets: AssetWithBalance[];
  updateForm: <K extends keyof FlowFormState>(field: K, value: FlowFormState[K]) => void;
  updateNewAsset: <K extends keyof NewAssetState>(field: K, value: NewAssetState[K]) => void;
  handleSubmit: () => void;
  onCancel: () => void;
}

export function OtherFlowForm({
  form,
  formErrors,
  newAsset,
  allAssets,
  loading,
  updateForm,
  updateNewAsset,
  handleSubmit,
  onCancel,
}: OtherFlowFormProps) {
  return (
    <>
      {/* From Field with External/Asset toggle */}
      <div>
        <Label variant="muted" className="block mb-1">From</Label>
        <Tabs
          value={form.fromType}
          onValueChange={(v) => updateForm('fromType', v as 'external' | 'asset')}
        >
          <TabsList className="mb-6">
            <TabsTrigger value="external">External</TabsTrigger>
            <TabsTrigger value="asset">Asset</TabsTrigger>
          </TabsList>

          <TabsContent value="external">
            <Input
              placeholder="Enter source name (e.g., Insurance Co.)"
              value={form.fromExternalName}
              onChange={(e) => updateForm('fromExternalName', e.target.value)}
            />
          </TabsContent>

          <TabsContent value="asset">
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
              />
            ) : (
              <div className="flex gap-2">
                <div className="flex-1">
                  <AssetCombobox
                    placeholder="Select source asset..."
                    value={form.fromAssetId}
                    assets={allAssets}
                    onChange={(id) => updateForm('fromAssetId', id)}
                    error={formErrors.fromAsset}
                    showBalance={true}
                  />
                </div>
                <Button onClick={() => updateNewAsset('show', 'from')}>+</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* To Field (always asset for "other") */}
      <div>
        <Label variant="muted" className="block mb-1">To</Label>
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
          />
        ) : (
          <div className="flex gap-2">
            <div className="flex-1">
              <AssetCombobox
                placeholder="Select destination asset..."
                value={form.toAssetId}
                assets={allAssets}
                onChange={(id) => updateForm('toAssetId', id)}
                error={formErrors.toAsset}
                showBalance={true}
              />
            </div>
            <Button onClick={() => updateNewAsset('show', 'to')}>+</Button>
          </div>
        )}
      </div>

      {/* Amount & Currency */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Amount"
          type="number"
          step="any"
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
        submitLabel="Record Flow"
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />
    </>
  );
}
