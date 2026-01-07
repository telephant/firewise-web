'use client';

import { useEffect, useState } from 'react';
import type { AssetType } from '@/types/fire';
import { retroStyles, Button, Input, Select } from '@/components/fire/ui';

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

  // Set default type to first suggested type
  useEffect(() => {
    if (suggestedTypes && suggestedTypes.length > 0 && !suggestedTypes.includes(type)) {
      setType(suggestedTypes[0]);
    }
  }, [suggestedTypes, type, setType]);

  return (
    <div
      className="mt-2 p-3 rounded-sm space-y-3"
      style={retroStyles.sunken}
    >
      <Input
        label="Asset Name"
        placeholder="e.g., Chase Checking, AAPL"
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
