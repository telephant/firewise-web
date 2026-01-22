import type { AssetType } from '@/types/fire';
import { ASSET_TYPE_LABELS, RECURRING_FREQUENCY_OPTIONS } from '@/types/fire';
import type { PaymentPeriod } from '@/lib/fire/api';
import { PAYMENT_PERIOD_LABELS } from '@/lib/fire/api';

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

// Payment period options for interest settings
export const PAYMENT_PERIOD_OPTIONS = (Object.keys(PAYMENT_PERIOD_LABELS) as PaymentPeriod[]).map(p => ({
  value: p,
  label: PAYMENT_PERIOD_LABELS[p],
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
  rental: { from: 'Property', to: 'Deposit To', fromPlaceholder: 'Select property', toPlaceholder: 'Select account', button: 'Record Rental' },
  gift: { from: 'From', to: 'Deposit To', fromPlaceholder: 'Gift from', toPlaceholder: 'Select account', button: 'Record Gift' },

  // Investment income
  dividend: { from: 'From Stock', to: 'Deposit To', fromPlaceholder: 'Select stock/ETF', toPlaceholder: 'Select account', button: 'Record Dividend' },
  interest: { from: 'Account', to: 'To', fromPlaceholder: 'Select account', toPlaceholder: 'Select account', button: 'Record Interest' },
  deposit: { from: 'From Account', to: 'Deposit Account', fromPlaceholder: 'Select cash account', toPlaceholder: 'e.g. Chase Savings', button: 'Make Deposit' },

  // Investment
  invest: { from: 'Pay With', to: 'Buy', fromPlaceholder: 'Select cash account', toPlaceholder: 'Select investment', button: 'Buy' },
  sell: { from: 'Sell', to: 'Deposit To', fromPlaceholder: 'Select investment', toPlaceholder: 'Select account', button: 'Record Sale' },
  reinvest: { from: 'From', to: 'Into', fromPlaceholder: 'Select investment', toPlaceholder: 'Select investment', button: 'Record Reinvestment' },

  // Transfer
  transfer: { from: 'From', to: 'To', fromPlaceholder: 'Select account', toPlaceholder: 'Select account', button: 'Record Transfer' },
  pay_debt: { from: 'Pay From', to: 'Pay To', fromPlaceholder: 'Select account', toPlaceholder: 'Select debt', button: 'Record Payment' },

  // Debt
  add_mortgage: { from: 'Lender', to: 'Deposit To', fromPlaceholder: 'Bank name', toPlaceholder: 'Select account', button: 'Add Mortgage' },
  add_loan: { from: 'Lender', to: 'Deposit To', fromPlaceholder: 'Lender name', toPlaceholder: 'Select account', button: 'Add Loan' },

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
