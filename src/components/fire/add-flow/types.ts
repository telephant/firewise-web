import type { AssetType, RecurringFrequency, LinkedLedger } from '@/types/fire';
import type { InvestmentType } from './investment-type-selector';

// Form state for the add flow dialog
export interface FlowFormState {
  amount: string;
  currency: string;
  date: string;
  description: string;
  fromType: 'external' | 'asset';
  fromExternalName: string;
  fromAssetId: string;
  toType: 'external' | 'asset';
  toExternalName: string;
  toAssetId: string;
  taxWithheld: string;
  shares: string;
  pricePerShare: string;
  recurringFrequency: RecurringFrequency;
  // Expense-specific fields
  expenseCategoryId: string | null;
  linkedLedgers: LinkedLedger[];
  // Investment-specific fields
  investmentType: InvestmentType;
  selectedTicker: string;
  selectedTickerName: string;
}

// Form validation errors
export interface FlowFormErrors {
  amount?: string;
  shares?: string;
  ticker?: string;
  fromAsset?: string;
  toAsset?: string;
}

// State for creating a new asset inline
export interface NewAssetState {
  show: 'from' | 'to' | null;
  name: string;
  type: AssetType;
  ticker: string;
}

// Dialog navigation steps
export type DialogStep = 'category' | 'form';

// Expense tab options
export type ExpenseTab = 'link' | 'manual';

// Initial state factories
export const getInitialFormState = (): FlowFormState => ({
  amount: '',
  currency: 'USD',
  date: new Date().toISOString().split('T')[0],
  description: '',
  fromType: 'external',
  fromExternalName: '',
  fromAssetId: '',
  toType: 'asset',
  toExternalName: '',
  toAssetId: '',
  taxWithheld: '',
  shares: '',
  pricePerShare: '',
  recurringFrequency: 'none',
  expenseCategoryId: null,
  linkedLedgers: [],
  investmentType: 'us_stock',
  selectedTicker: '',
  selectedTickerName: '',
});

export const getInitialNewAssetState = (): NewAssetState => ({
  show: null,
  name: '',
  type: 'cash',
  ticker: '',
});
