import type { AssetType, RecurringFrequency, LinkedLedger, DebtType } from '@/types/fire';
import type { InvestmentType } from './investment-type-selector';
import type { PaymentPeriod } from '@/lib/fire/api';

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
  // Interest-specific fields
  interestPaymentPeriod: PaymentPeriod;
  depositBalance: string; // Balance for new deposit asset
  interestRate: string; // APY percentage for new deposit (e.g. "4.5" for 4.5%)
  depositMatured: boolean | null; // null = not yet selected, true = withdraw to cash, false = keep in deposit
  withdrawToCashAssetId: string; // Cash account to withdraw to when deposit matures
  // Debt-specific fields
  debtName: string;          // Name of the debt asset (e.g., "Home Mortgage")
  debtType: DebtType;        // Type: mortgage, personal_loan, etc.
  debtPrincipal: string;     // Original loan amount
  debtInterestRate: string;  // Annual rate as percentage (e.g., "6.5" for 6.5%)
  debtTermMonths: string;    // Loan term in months
  debtStartDate: string;     // When loan started
  // Pay debt fields
  debtId: string | null;                  // ID of the debt being paid (from new debts table)
  payDebtSourceType: 'cash' | 'external'; // Payment source type
  payDebtExternalName: string;            // External source name (e.g., "Bank Transfer")
  // Sell fields
  sellCostBasis: string;                  // Original purchase cost for capital gains
  sellFees: string;                       // Trading fees / closing costs
  sellMarkAsSold: boolean;                // For real estate: mark asset as sold/archived
}

// Form validation errors
export interface FlowFormErrors {
  amount?: string;
  shares?: string;
  ticker?: string;
  fromAsset?: string;
  toAsset?: string;
  depositBalance?: string;
  depositMatured?: string;
  debtName?: string;
  debtPrincipal?: string;
  debtId?: string;
  recurringFrequency?: string;
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
  shares: '',
  pricePerShare: '',
  recurringFrequency: 'none',
  expenseCategoryId: null,
  linkedLedgers: [],
  investmentType: 'us_stock',
  selectedTicker: '',
  selectedTickerName: '',
  interestPaymentPeriod: 'monthly',
  depositBalance: '',
  interestRate: '',
  depositMatured: null,
  withdrawToCashAssetId: '',
  debtName: '',
  debtType: 'mortgage',
  debtPrincipal: '',
  debtInterestRate: '',
  debtTermMonths: '',
  debtStartDate: new Date().toISOString().split('T')[0],
  debtId: null,
  payDebtSourceType: 'cash',
  payDebtExternalName: '',
  sellCostBasis: '',
  sellFees: '',
  sellMarkAsSold: false,
});

export const getInitialNewAssetState = (): NewAssetState => ({
  show: null,
  name: '',
  type: 'cash',
  ticker: '',
});
