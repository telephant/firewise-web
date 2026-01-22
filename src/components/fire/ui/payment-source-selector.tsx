'use client';

import { useMemo } from 'react';
import { RadioOptionGroup, type RadioOption } from './radio-option-group';
import { Select } from './select';
import { Input } from './input';
import type { AssetWithBalance } from '@/types/fire';
import { formatCurrency } from '@/lib/fire/utils';

export type PaymentSourceType = 'cash' | 'external';

interface PaymentSourceSelectorProps {
  /** Currently selected source type */
  sourceType: PaymentSourceType | null;
  /** Callback when source type changes */
  onSourceTypeChange: (type: PaymentSourceType) => void;
  /** Currently selected cash asset ID */
  cashAssetId?: string;
  /** Callback when cash asset changes */
  onCashAssetChange?: (assetId: string) => void;
  /** External source name */
  externalName?: string;
  /** Callback when external name changes */
  onExternalNameChange?: (name: string) => void;
  /** Available cash assets to choose from */
  cashAssets: AssetWithBalance[];
  /** Error message for cash asset selection */
  cashAssetError?: string;
  /** Which options to show (default: both) */
  showOptions?: ('cash' | 'external')[];
  /** Custom label for the group (default: "Payment Source") */
  label?: string;
  /** Custom label for cash option (default: "From my cash account") */
  cashLabel?: string;
  /** Custom description for cash option */
  cashDescription?: string;
  /** Custom label for external option (default: "From external source") */
  externalLabel?: string;
  /** Custom description for external option (default: "Payment not from your tracked accounts") */
  externalDescription?: string;
  /** Placeholder for external name input */
  externalPlaceholder?: string;
  /** Show external name input field (default: true) */
  showExternalInput?: boolean;
}

export function PaymentSourceSelector({
  sourceType,
  onSourceTypeChange,
  cashAssetId = '',
  onCashAssetChange,
  externalName = '',
  onExternalNameChange,
  cashAssets,
  cashAssetError,
  showOptions = ['cash', 'external'],
  label = 'Payment Source',
  cashLabel = 'From my cash account',
  cashDescription = 'Pay from one of your tracked accounts',
  externalLabel = 'From external source',
  externalDescription = 'Payment not from your tracked accounts',
  externalPlaceholder = 'e.g., Bank Transfer, Gift, etc.',
  showExternalInput = true,
}: PaymentSourceSelectorProps) {
  // Build cash asset options for select
  const cashOptions = useMemo(() => {
    return cashAssets.map(asset => ({
      value: asset.id,
      label: `${asset.name} (${formatCurrency(asset.balance, { currency: asset.currency })})`,
    }));
  }, [cashAssets]);

  // Build radio options based on showOptions
  const options: RadioOption<PaymentSourceType>[] = useMemo(() => {
    const allOptions: RadioOption<PaymentSourceType>[] = [];

    if (showOptions.includes('cash')) {
      allOptions.push({
        value: 'cash',
        label: cashLabel,
        description: cashDescription,
        content: onCashAssetChange ? (
          <Select
            placeholder="Select cash account..."
            value={cashAssetId}
            options={cashOptions}
            onChange={(e) => onCashAssetChange(e.target.value)}
            error={cashAssetError}
          />
        ) : undefined,
      });
    }

    if (showOptions.includes('external')) {
      allOptions.push({
        value: 'external',
        label: externalLabel,
        description: externalDescription,
        content: showExternalInput && onExternalNameChange ? (
          <Input
            placeholder={externalPlaceholder}
            value={externalName}
            onChange={(e) => onExternalNameChange(e.target.value)}
          />
        ) : undefined,
      });
    }

    return allOptions;
  }, [
    showOptions,
    cashLabel,
    cashDescription,
    externalLabel,
    externalDescription,
    externalPlaceholder,
    showExternalInput,
    cashAssetId,
    cashOptions,
    cashAssetError,
    externalName,
    onCashAssetChange,
    onExternalNameChange,
  ]);

  return (
    <RadioOptionGroup
      label={label}
      value={sourceType}
      onChange={onSourceTypeChange}
      options={options}
    />
  );
}
