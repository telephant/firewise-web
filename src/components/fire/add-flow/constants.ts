import type { AssetType } from '@/types/fire';
import { ASSET_TYPE_LABELS, RECURRING_FREQUENCY_OPTIONS } from '@/types/fire';

// Currency options for flow forms
export const CURRENCY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'CNY', label: 'CNY' },
  { value: 'GBP', label: 'GBP' },
];

// Asset type options derived from labels
export const ASSET_TYPE_OPTIONS = (Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map((t) => ({
  value: t,
  label: ASSET_TYPE_LABELS[t],
}));

// Recurring frequency options
export const RECURRING_OPTIONS = RECURRING_FREQUENCY_OPTIONS.map(opt => ({
  value: opt.value,
  label: opt.label,
}));

// Context-aware labels based on flow category
export const FLOW_CATEGORY_LABELS: Record<string, {
  from: string;
  to: string;
  fromPlaceholder: string;
  toPlaceholder: string;
  button: string;
}> = {
  // Income categories
  salary: { from: 'Source', to: 'Deposit To', fromPlaceholder: 'Employer name', toPlaceholder: 'Select account', button: 'Record Income' },
  bonus: { from: 'Source', to: 'Deposit To', fromPlaceholder: 'Employer name', toPlaceholder: 'Select account', button: 'Record Bonus' },
  freelance: { from: 'Client', to: 'Deposit To', fromPlaceholder: 'Client name', toPlaceholder: 'Select account', button: 'Record Income' },
  rental: { from: 'Tenant', to: 'Deposit To', fromPlaceholder: 'Tenant name', toPlaceholder: 'Select account', button: 'Record Rental' },
  gift: { from: 'From', to: 'Deposit To', fromPlaceholder: 'Gift from', toPlaceholder: 'Select account', button: 'Record Gift' },

  // Investment income
  dividend: { from: 'From Stock', to: 'Deposit To', fromPlaceholder: 'Select stock/ETF', toPlaceholder: 'Select account', button: 'Record Dividend' },
  interest: { from: 'Account', to: 'To', fromPlaceholder: 'Select account', toPlaceholder: 'Select account', button: 'Record Interest' },

  // Investment
  invest: { from: 'Pay With', to: 'Buy', fromPlaceholder: 'Select cash account', toPlaceholder: 'Select investment', button: 'Buy' },
  sell: { from: 'Sell', to: 'Deposit To', fromPlaceholder: 'Select investment', toPlaceholder: 'Select account', button: 'Record Sale' },
  reinvest: { from: 'From', to: 'Into', fromPlaceholder: 'Select investment', toPlaceholder: 'Select investment', button: 'Record Reinvestment' },

  // Transfer
  transfer: { from: 'From', to: 'To', fromPlaceholder: 'Select account', toPlaceholder: 'Select account', button: 'Record Transfer' },
  pay_debt: { from: 'Pay From', to: 'Pay To', fromPlaceholder: 'Select account', toPlaceholder: 'Select debt', button: 'Record Payment' },

  // Expense
  expense: { from: 'Pay From', to: 'Spend On', fromPlaceholder: 'Select account', toPlaceholder: 'What did you spend on?', button: 'Record Expense' },

  // Other
  other: { from: 'From', to: 'To', fromPlaceholder: 'Source', toPlaceholder: 'Destination', button: 'Record' },
};

export const DEFAULT_FIELD_LABELS = {
  from: 'From',
  to: 'To',
  fromPlaceholder: 'Source',
  toPlaceholder: 'Destination',
  button: 'Record',
};

export function getFieldLabels(categoryId: string | undefined) {
  if (!categoryId) return DEFAULT_FIELD_LABELS;
  return FLOW_CATEGORY_LABELS[categoryId] || DEFAULT_FIELD_LABELS;
}
