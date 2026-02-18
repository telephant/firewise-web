'use client';

import type { AssetWithBalance, AssetType, FlowCategoryPreset } from '@/types/fire';
import { Button, Input, Select, Label } from '@/components/fire/ui';
import { NewAssetForm } from './new-asset-form';
import { ASSET_TYPE_OPTIONS } from './constants';
import type { NewAssetState } from './types';

interface AssetFieldSelectorProps {
  /** Label for the field */
  label: string;
  /** Placeholder text for the select/input */
  placeholder: string;
  /** Field configuration from preset */
  presetConfig: FlowCategoryPreset['from'] | FlowCategoryPreset['to'];
  /** Currently selected asset ID */
  selectedAssetId: string;
  /** External name value (for external type) */
  externalName: string;
  /** Available assets to choose from */
  assets: AssetWithBalance[];
  /** New asset state */
  newAsset: NewAssetState;
  /** Which field is showing new asset form ('from' | 'to' | null) */
  showNewAssetFor: 'from' | 'to' | null;
  /** Current field type ('from' or 'to') */
  fieldType: 'from' | 'to';
  /** Error message */
  error?: string;
  /** Disable the selector */
  disabled?: boolean;
  /** Callback when asset is selected */
  onAssetSelect: (assetId: string) => void;
  /** Callback when external name changes */
  onExternalNameChange: (name: string) => void;
  /** Callback to show new asset form */
  onShowNewAsset: () => void;
  /** Callback to update new asset state */
  updateNewAsset: <K extends keyof NewAssetState>(field: K, value: NewAssetState[K]) => void;
  /** Custom label mapper for assets */
  assetLabelMapper?: (asset: AssetWithBalance) => string;
}

export function AssetFieldSelector({
  label,
  placeholder,
  presetConfig,
  selectedAssetId,
  externalName,
  assets,
  newAsset,
  showNewAssetFor,
  fieldType,
  error,
  disabled,
  onAssetSelect,
  onExternalNameChange,
  onShowNewAsset,
  updateNewAsset,
  assetLabelMapper,
}: AssetFieldSelectorProps) {
  const isShowingNewAssetForm = showNewAssetFor === fieldType;
  const defaultLabelMapper = (a: AssetWithBalance) =>
    a.ticker ? `${a.name} (${a.ticker})` : a.name;
  const getAssetLabel = assetLabelMapper || defaultLabelMapper;

  // External field type - just show an input
  if (presetConfig.type === 'external') {
    // Only 'from' config has 'editable' property
    const isEditable = 'editable' in presetConfig ? presetConfig.editable : true;
    return (
      <div>
        <Label variant="muted" className="block mb-1">{label}</Label>
        <Input
          placeholder={placeholder}
          value={externalName}
          onChange={(e) => onExternalNameChange(e.target.value)}
          disabled={!isEditable}
        />
      </div>
    );
  }

  // Asset field type - show new asset form or select with + button
  // Only 'to' config has 'allowCreate' property
  const canCreate = 'allowCreate' in presetConfig ? presetConfig.allowCreate : true;

  return (
    <div>
      <Label variant="muted" className="block mb-1">{label}</Label>
      {isShowingNewAssetForm ? (
        <NewAssetForm
          name={newAsset.name}
          setName={(v) => updateNewAsset('name', v)}
          type={newAsset.type}
          setType={(v) => updateNewAsset('type', v as AssetType)}
          ticker={newAsset.ticker}
          setTicker={(v) => updateNewAsset('ticker', v)}
          onCancel={() => updateNewAsset('show', null)}
          assetTypeOptions={ASSET_TYPE_OPTIONS}
          suggestedTypes={presetConfig.assetFilter}
        />
      ) : (
        <div className="flex gap-2">
          <div className="flex-1">
            <Select
              value={selectedAssetId}
              onChange={(e) => onAssetSelect(e.target.value)}
              options={assets.map((a) => ({
                value: a.id,
                label: getAssetLabel(a),
              }))}
              placeholder={placeholder}
              error={error}
              disabled={disabled}
            />
          </div>
          {canCreate && !disabled && (
            <Button onClick={onShowNewAsset}>+</Button>
          )}
        </div>
      )}
    </div>
  );
}
