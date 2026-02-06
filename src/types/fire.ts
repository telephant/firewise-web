// Asset types (debt is now in separate debts table)
export type AssetType = 'cash' | 'deposit' | 'stock' | 'etf' | 'bond' | 'real_estate' | 'crypto' | 'other';

// Debt subtypes for more detailed tracking
export type DebtType = 'mortgage' | 'personal_loan' | 'credit_card' | 'student_loan' | 'auto_loan' | 'other';
export type DebtStatus = 'active' | 'paid_off';

// Metadata structure for debt assets (legacy - kept for backwards compatibility)
export interface DebtMetadata {
  debt_type: DebtType;
  principal?: number;           // Original loan amount (positive number)
  interest_rate?: number;       // Annual rate as decimal (e.g., 0.065 for 6.5%)
  term_months?: number;         // Loan term in months
  start_date?: string;          // When loan started (ISO date)
  monthly_payment?: number;     // Monthly payment amount
  property_asset_id?: string;   // Link to real estate asset (for mortgages)
}

// Debt entity (new dedicated debts table)
export interface Debt {
  id: string;
  user_id: string;
  name: string;
  debt_type: DebtType;
  currency: string;
  principal: number;
  interest_rate: number | null;
  term_months: number | null;
  start_date: string | null;
  current_balance: number;
  monthly_payment: number | null;
  balance_updated_at: string | null;
  status: DebtStatus;
  paid_off_date: string | null;
  property_asset_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Currency conversion fields (present when user has convert_all_to_preferred enabled)
  converted_balance?: number;
  converted_currency?: string;
  exchange_rate?: number;
}

export interface DebtFilters {
  status?: DebtStatus;
  debt_type?: DebtType;
  property_asset_id?: string;
  page?: number;
  limit?: number;
}

// Metadata structure for real estate assets
export interface RealEstateMetadata {
  country?: string;             // Country where property is located
  city?: string;                // City where property is located
  purchase_price?: number;      // Original purchase price
  purchase_date?: string;       // When property was purchased (ISO date)
  size_sqm?: number;            // Property size in square meters
}

export interface Asset {
  id: string;
  user_id: string;
  name: string;
  type: AssetType;
  ticker: string | null;
  currency: string;
  market: string | null;
  balance: number;
  balance_updated_at: string | null;
  total_realized_pl: number | null; // Cumulative realized P/L from all sell transactions
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// Extended asset with currency conversion fields
export interface AssetWithBalance extends Asset {
  // Currency conversion fields (present when user has convert_all_to_preferred enabled)
  converted_balance?: number;
  converted_currency?: string;
  exchange_rate?: number;
}

// Flow types (Unified Flow Model)
// Income:   [External] → [Your Asset]
// Expense:  [Your Asset] → [External]
// Transfer: [Your Asset] → [Your Asset]
// Other:    Balance corrections, misc adjustments
export type FlowType = 'income' | 'expense' | 'transfer' | 'other';

// Recurring frequency options (used when creating flows to trigger schedule creation)
export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'none';

export const RECURRING_FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'none', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

// FIRE-specific expense categories (separate from ledger categories)
export interface FlowExpenseCategory {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// For linking to a ledger (stored in metadata)
export interface LinkedLedger {
  ledger_id: string;
  ledger_name: string;
}

export interface Flow {
  id: string;
  user_id: string;
  type: FlowType;
  amount: number; // For dividends, this is GROSS amount (tax calculated from user_tax_settings)
  currency: string;
  from_asset_id: string | null;
  to_asset_id: string | null;
  debt_id: string | null; // Reference to debt for debt payments
  category: string | null;
  date: string;
  description: string | null;
  flow_expense_category_id: string | null;
  schedule_id: string | null; // Reference to recurring schedule that generated this flow
  metadata: Record<string, unknown> | null;
  needs_review: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlowWithDetails extends Flow {
  from_asset?: Asset | null;
  to_asset?: Asset | null;
  debt?: Debt | null;
  flow_expense_category?: FlowExpenseCategory | null;
  // Currency conversion fields (present when user has convert_all_to_preferred enabled)
  converted_amount?: number;
  converted_currency?: string;
  exchange_rate?: number;
}

export interface FlowFilters {
  type?: FlowType;
  start_date?: string;
  end_date?: string;
  asset_id?: string;
  needs_review?: boolean;
  exclude_category?: string;
  page?: number;
  limit?: number;
}

export type AssetSortField = 'name' | 'type' | 'balance' | 'created_at' | 'updated_at';
export type SortOrder = 'asc' | 'desc';

export interface AssetFilters {
  type?: AssetType;
  page?: number;
  limit?: number;
  sortBy?: AssetSortField;
  sortOrder?: SortOrder;
}

export interface FlowStats {
  total_income: number;
  total_expense: number;
  total_transfer: number;
  net_flow: number;
  currency: string;
  start_date: string;
  end_date: string;
}

// Form data types
export interface CreateAssetData {
  name: string;
  type: AssetType;
  ticker?: string;
  currency?: string;
  market?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateAssetData {
  name?: string;
  type?: AssetType;
  ticker?: string | null;
  currency?: string;
  market?: string | null;
  metadata?: Record<string, unknown>;
  balance?: number;
  total_realized_pl?: number | null;
}

export interface CreateFlowData {
  type: FlowType;
  amount: number;
  currency?: string;
  from_asset_id?: string | null;
  to_asset_id?: string | null;
  debt_id?: string | null;
  category?: string;
  date?: string;
  description?: string;
  recurring_frequency?: RecurringFrequency;
  flow_expense_category_id?: string | null;
  metadata?: Record<string, unknown>;
  adjust_balances?: boolean; // If true, adjusts related asset balances with currency conversion
}

export interface UpdateFlowData {
  type?: FlowType;
  amount?: number;
  currency?: string;
  from_asset_id?: string | null;
  to_asset_id?: string | null;
  debt_id?: string | null;
  category?: string | null;
  date?: string;
  description?: string | null;
  flow_expense_category_id?: string | null;
  metadata?: Record<string, unknown>;
  needs_review?: boolean;
  adjust_balances?: boolean; // If true, adjusts related asset balances when amount changes
  recurring_frequency?: RecurringFrequency; // To create/update recurring schedule
}

export interface CreateDebtData {
  name: string;
  debt_type?: DebtType;
  currency?: string;
  principal: number;
  interest_rate?: number | null;
  term_months?: number | null;
  start_date?: string | null;
  monthly_payment?: number | null;
  property_asset_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateDebtData {
  name?: string;
  debt_type?: DebtType;
  currency?: string;
  principal?: number;
  current_balance?: number;
  interest_rate?: number | null;
  term_months?: number | null;
  start_date?: string | null;
  monthly_payment?: number | null;
  property_asset_id?: string | null;
  status?: DebtStatus;
  metadata?: Record<string, unknown>;
}

// Asset type labels for UI display
export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  cash: 'Cash',
  deposit: 'Deposit/Savings',
  stock: 'Stock',
  etf: 'ETF',
  bond: 'Bond',
  real_estate: 'Real Estate',
  crypto: 'Crypto',
  other: 'Other',
};

// Debt type labels for UI display
export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  mortgage: 'Mortgage',
  personal_loan: 'Personal Loan',
  credit_card: 'Credit Card',
  student_loan: 'Student Loan',
  auto_loan: 'Auto Loan',
  other: 'Other Debt',
};


// ═══════════════════════════════════════════════════════════════
// Flow Category Presets (Category-First Dialog Design)
// ═══════════════════════════════════════════════════════════════

export interface FlowCategoryPreset {
  id: string;
  label: string;
  flowType: FlowType;
  // From field configuration
  from: {
    type: 'external' | 'asset' | 'user_select';
    defaultName?: string; // For external type
    assetFilter?: AssetType[]; // Filter assets by type
    editable?: boolean; // Can user change the default?
  };
  // To field configuration
  to: {
    type: 'external' | 'asset' | 'user_select' | 'same_as_from';
    defaultName?: string;
    assetFilter?: AssetType[];
    allowCreate?: boolean; // Can create new asset inline?
  };
  // Extra fields for this category
  extraFields?: ('shares' | 'price_per_share' | 'cost_basis' | 'linked_ledger' | 'debt_details')[];
}

export const FLOW_CATEGORY_PRESETS: FlowCategoryPreset[] = [
  // Income (External → Asset)
  {
    id: 'salary',
    label: 'Salary',
    flowType: 'income',
    from: { type: 'external', defaultName: 'Work', editable: true },
    to: { type: 'asset', assetFilter: ['cash'] },
  },
  {
    id: 'bonus',
    label: 'Bonus',
    flowType: 'income',
    from: { type: 'external', defaultName: 'Work', editable: true },
    to: { type: 'asset', assetFilter: ['cash'] },
  },
  {
    id: 'freelance',
    label: 'Freelance',
    flowType: 'income',
    from: { type: 'external', defaultName: 'Client', editable: true },
    to: { type: 'asset', assetFilter: ['cash'] },
  },
  {
    id: 'rental',
    label: 'Rental',
    flowType: 'income',
    from: { type: 'asset', assetFilter: ['real_estate'] }, // Which property generated the income
    to: { type: 'asset', assetFilter: ['cash'] },
  },
  {
    id: 'gift',
    label: 'Gift',
    flowType: 'income',
    from: { type: 'external', defaultName: 'Family', editable: true },
    to: { type: 'asset', assetFilter: ['cash'] },
  },

  // Investment Income (Stock/ETF → Cash)
  // Note: flow.amount is GROSS, tax calculated on display from user_tax_settings
  {
    id: 'dividend',
    label: 'Dividend',
    flowType: 'income',
    from: { type: 'asset', assetFilter: ['stock', 'etf'] },
    to: { type: 'asset', assetFilter: ['cash'] },
  },
  {
    id: 'interest',
    label: 'Interest',
    flowType: 'transfer',
    from: { type: 'asset', assetFilter: ['deposit'] },
    to: { type: 'same_as_from' },
  },
  {
    id: 'deposit',
    label: 'Deposit',
    flowType: 'transfer',
    from: { type: 'asset', assetFilter: ['cash'] },
    to: { type: 'asset', assetFilter: ['deposit'], allowCreate: true },
  },

  // Investment (Asset → Asset)
  {
    id: 'invest',
    label: 'Invest',
    flowType: 'transfer',
    from: { type: 'asset', assetFilter: ['cash'] },
    to: { type: 'asset', assetFilter: ['stock', 'etf', 'crypto', 'bond', 'real_estate', 'other'], allowCreate: true },
    extraFields: ['shares', 'price_per_share'],
  },
  {
    id: 'sell',
    label: 'Sell',
    flowType: 'transfer',
    from: { type: 'asset', assetFilter: ['stock', 'etf', 'crypto', 'bond', 'real_estate'] },
    to: { type: 'asset', assetFilter: ['cash'] },
    extraFields: ['shares', 'price_per_share'],
  },
  {
    id: 'reinvest',
    label: 'Reinvest',
    flowType: 'transfer',
    from: { type: 'asset', assetFilter: ['stock', 'etf', 'crypto', 'bond'] },
    to: { type: 'asset', assetFilter: ['stock', 'etf', 'crypto', 'bond'], allowCreate: true },
    extraFields: ['shares'],
  },

  // Transfer (Asset → Asset)
  {
    id: 'transfer',
    label: 'Transfer',
    flowType: 'transfer',
    from: { type: 'asset' },
    to: { type: 'asset' },
  },

  // Pay Debt (uses dedicated debt selection - handled by PayDebtFlowForm component)
  {
    id: 'pay_debt',
    label: 'Pay Debt',
    flowType: 'expense',
    from: { type: 'asset', assetFilter: ['cash'] },
    to: { type: 'external' }, // Debt selection handled separately in PayDebtFlowForm
  },

  // Debt (creates debt asset + optional income flow)
  {
    id: 'add_mortgage',
    label: 'Mortgage',
    flowType: 'income', // Money received from bank
    from: { type: 'external', defaultName: 'Bank', editable: true },
    to: { type: 'asset', assetFilter: ['cash'] },
    extraFields: ['debt_details'],
  },
  {
    id: 'add_loan',
    label: 'Loan',
    flowType: 'income', // Money received from lender
    from: { type: 'external', defaultName: 'Lender', editable: true },
    to: { type: 'asset', assetFilter: ['cash'] },
    extraFields: ['debt_details'],
  },

  // Expense (Asset → External)
  {
    id: 'expense',
    label: 'Expense',
    flowType: 'expense',
    from: { type: 'asset', assetFilter: ['cash'] },
    to: { type: 'external' },
    extraFields: ['linked_ledger'],
  },

  // Other
  {
    id: 'other',
    label: 'Other',
    flowType: 'transfer',
    from: { type: 'user_select' },
    to: { type: 'user_select', allowCreate: true },
  },
];

// Helper to get preset by ID
export function getFlowCategoryPreset(id: string): FlowCategoryPreset | undefined {
  return FLOW_CATEGORY_PRESETS.find((p) => p.id === id);
}

// ═══════════════════════════════════════════════════════════════
// Expense Stats (for FIRE Dashboard)
// ═══════════════════════════════════════════════════════════════

export interface ExpenseCategoryBreakdown {
  category_id: string | null;
  category_name: string;
  category_icon: string;
  amount: number;
  percentage: number;
}

export interface ExpenseStats {
  current_month: {
    total: number;
    by_category: ExpenseCategoryBreakdown[];
    source_count: {
      manual_flows: number;
      linked_ledgers: number;
    };
    days_in_month: number;
    monthly_average: number;
  };
  previous_month: {
    total: number;
  };
  trend: {
    amount_change: number;
    percentage_change: number;
    direction: 'up' | 'down' | 'same';
  };
  income_this_month: number;
  expense_to_income_ratio: number | null;
}

// ═══════════════════════════════════════════════════════════════
// Recurring Schedules
// ═══════════════════════════════════════════════════════════════

// Schedule frequency (excludes 'none' since schedules are always recurring)
export type ScheduleFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

// Flow template stored in schedule - contains all data needed to create a flow
export interface FlowTemplate {
  type: FlowType;
  amount: number;
  currency: string;
  from_asset_id: string | null;
  to_asset_id: string | null;
  debt_id: string | null;
  category: string | null;
  description: string | null;
  flow_expense_category_id: string | null;
  metadata: Record<string, unknown> | null;
}

export interface RecurringSchedule {
  id: string;
  user_id: string;
  source_flow_id: string | null; // The original flow that created this schedule
  frequency: ScheduleFrequency;
  next_run_date: string;
  last_run_date: string | null;
  is_active: boolean;
  flow_template: FlowTemplate;
  created_at: string;
  updated_at: string;
}

// Extended with related data
export interface RecurringScheduleWithDetails extends RecurringSchedule {
  source_flow?: Flow | null;
  // Count of flows generated from this schedule
  generated_count?: number;
}

export interface RecurringScheduleFilters {
  is_active?: boolean;
  frequency?: ScheduleFrequency;
  page?: number;
  limit?: number;
}

export interface CreateRecurringScheduleData {
  source_flow_id?: string;
  frequency: ScheduleFrequency;
  next_run_date: string;
  flow_template: FlowTemplate;
}

export interface UpdateRecurringScheduleData {
  frequency?: ScheduleFrequency;
  next_run_date?: string;
  is_active?: boolean;
  flow_template?: Partial<FlowTemplate>;
}

// Response from processing recurring schedules
export interface ProcessRecurringResult {
  processed: number;
  created_flows: string[]; // IDs of created flows
  errors: { schedule_id: string; error: string }[];
}
