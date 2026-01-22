'use client';

import { useState, useMemo, useRef } from 'react';
import type { AssetType } from '@/types/fire';
import { retroStyles, Button, Input, Select } from '@/components/fire/ui';

// Placeholder examples based on asset type
const ASSET_NAME_PLACEHOLDERS: Record<AssetType, string> = {
  cash: 'e.g. Chase Checking',
  stock: 'e.g. Apple Inc.',
  etf: 'e.g. Vanguard S&P 500',
  bond: 'e.g. Treasury Bond',
  crypto: 'e.g. Bitcoin',
  deposit: 'e.g. Chase Savings',
  real_estate: 'e.g. Primary Home',
  other: 'e.g. Gold, Art',
};

interface NewAssetFormProps {
  name: string;
  setName: (v: string) => void;
  type: AssetType;
  setType: (v: AssetType) => void;
  ticker: string;
  setTicker: (v: string) => void;
  onCancel: () => void;
  assetTypeOptions: Array<{ value: string; label: string }>;
  suggestedTypes?: AssetType[];
  /** Error message to show on the name field */
  nameError?: string;
}

export function NewAssetForm({
  name,
  setName,
  type,
  setType,
  ticker,
  setTicker,
  onCancel,
  assetTypeOptions,
  suggestedTypes,
  nameError,
}: NewAssetFormProps) {
  const showTicker = ['stock', 'etf'].includes(type);
  const [touched, setTouched] = useState(false);

  // Filter options if suggestedTypes is provided
  const filteredOptions = suggestedTypes
    ? assetTypeOptions.filter((opt) => suggestedTypes.includes(opt.value as AssetType))
    : assetTypeOptions;

  // Track previous suggested types to detect changes
  const prevSuggestedTypesRef = useRef<AssetType[] | undefined>(undefined);

  // Set default type to first suggested type when suggestedTypes changes
  // This happens during render, not in useEffect
  if (suggestedTypes !== prevSuggestedTypesRef.current) {
    prevSuggestedTypesRef.current = suggestedTypes;
    if (suggestedTypes && suggestedTypes.length > 0 && !suggestedTypes.includes(type)) {
      // Schedule the update after render to avoid setState during render
      queueMicrotask(() => setType(suggestedTypes[0]));
    }
  }

  // Get placeholder based on current asset type
  const namePlaceholder = useMemo(() => {
    return ASSET_NAME_PLACEHOLDERS[type] || 'Enter asset name';
  }, [type]);

  return (
    <div
      className="mt-2 p-3 rounded-sm space-y-3"
      style={retroStyles.sunken}
    >
      <Input
        label="Asset Name"
        placeholder={namePlaceholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => setTouched(true)}
        error={touched && !name.trim() ? 'Asset name is required' : nameError}
      />
      <Select
        label="Asset Type"
        value={type}
        onChange={(e) => setType(e.target.value as AssetType)}
        options={filteredOptions}
      />
      {showTicker && (
        <Input
          label="Ticker Symbol"
          placeholder="e.g., AAPL, VOO"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
        />
      )}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
