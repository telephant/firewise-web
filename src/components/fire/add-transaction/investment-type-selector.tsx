'use client';

import { ButtonGroup, type ButtonGroupOption } from '@/components/fire/ui';

export type InvestmentType = 'us_stock' | 'sgx_stock' | 'cn_stock' | 'metals' | 'crypto' | 'real_estate' | 'other';

export interface InvestmentTypeOption {
  id: InvestmentType;
  label: string;
  icon: string;
  currency: string | null; // null = user selects
  market: string | null;
  enabled: boolean;
  comingSoon?: boolean;
}

export const INVESTMENT_TYPE_OPTIONS: InvestmentTypeOption[] = [
  {
    id: 'us_stock',
    label: 'US Stock',
    icon: '🇺🇸',
    currency: 'USD',
    market: 'US',
    enabled: true,
  },
  {
    id: 'sgx_stock',
    label: 'SGX',
    icon: '🇸🇬',
    currency: 'SGD',
    market: 'SG',
    enabled: true,
  },
  {
    id: 'cn_stock',
    label: 'A-Share',
    icon: '🇨🇳',
    currency: 'CNY',
    market: 'CN',
    enabled: false,
    comingSoon: true,
  },
  {
    id: 'metals',
    label: 'Metals',
    icon: '🥇',
    currency: null,
    market: null,
    enabled: true,
  },
  {
    id: 'crypto',
    label: 'Crypto',
    icon: '🪙',
    currency: 'USD',
    market: null,
    enabled: false,
    comingSoon: true,
  },
  {
    id: 'real_estate',
    label: 'Property',
    icon: '🏠',
    currency: null,
    market: null,
    enabled: true,
  },
  {
    id: 'other',
    label: 'Other',
    icon: '📦',
    currency: null,
    market: null,
    enabled: true,
  },
];

export interface InvestmentTypeSelectorProps {
  value: InvestmentType;
  onChange: (type: InvestmentType) => void;
  disabled?: boolean;
}

// Convert to ButtonGroup options format
const buttonGroupOptions: ButtonGroupOption<InvestmentType>[] = INVESTMENT_TYPE_OPTIONS.map((opt) => ({
  id: opt.id,
  label: opt.label,
  icon: opt.icon,
  disabled: !opt.enabled,
  badge: opt.comingSoon ? '(soon)' : undefined,
}));

export function InvestmentTypeSelector({
  value,
  onChange,
  disabled = false,
}: InvestmentTypeSelectorProps) {
  return (
    <ButtonGroup<InvestmentType>
      options={buttonGroupOptions}
      value={value}
      onChange={onChange}
      label="Type"
      columns={3}
      size="sm"
      disabled={disabled}
    />
  );
}

// Helper to get investment type configuration
export function getInvestmentTypeConfig(type: InvestmentType): InvestmentTypeOption | undefined {
  return INVESTMENT_TYPE_OPTIONS.find((opt) => opt.id === type);
}
