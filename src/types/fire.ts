// Asset types
export type AssetType = 'cash' | 'stock' | 'etf' | 'bond' | 'real_estate' | 'crypto' | 'debt' | 'other';

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
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// Alias for backward compatibility
export type AssetWithBalance = Asset;

// Flow types (Unified Flow Model)
// Income:   [External] → [Your Asset]
// Expense:  [Your Asset] → [External]
// Transfer: [Your Asset] → [Your Asset]
export type FlowType = 'income' | 'expense' | 'transfer';

// Recurring frequency options
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
  amount: number;
  currency: string;
  from_asset_id: string | null;
  to_asset_id: string | null;
  category: string | null;
  date: string;
  description: string | null;
  tax_withheld: number | null;
  recurring_frequency: RecurringFrequency | null;
  flow_expense_category_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface FlowWithDetails extends Flow {
  from_asset?: Asset | null;
  to_asset?: Asset | null;
  flow_expense_category?: FlowExpenseCategory | null;
}

export interface FlowFilters {
  type?: FlowType;
  start_date?: string;
  end_date?: string;
  asset_id?: string;
  page?: number;
  limit?: number;
}

export interface AssetFilters {
  type?: AssetType;
  page?: number;
  limit?: number;
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
}

export interface CreateFlowData {
  type: FlowType;
  amount: number;
  currency?: string;
  from_asset_id?: string | null;
  to_asset_id?: string | null;
  category?: string;
  date?: string;
  description?: string;
  tax_withheld?: number;
  recurring_frequency?: RecurringFrequency;
  flow_expense_category_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateFlowData {
  type?: FlowType;
  amount?: number;
  currency?: string;
  from_asset_id?: string | null;
  to_asset_id?: string | null;
  category?: string | null;
  date?: string;
  description?: string | null;
  tax_withheld?: number | null;
  flow_expense_category_id?: string | null;
  metadata?: Record<string, unknown>;
}

// Asset type labels for UI display
export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  cash: 'Cash',
  stock: 'Stock',
  etf: 'ETF',
  bond: 'Bond',
  real_estate: 'Real Estate',
  crypto: 'Crypto',
  debt: 'Debt',
  other: 'Other',
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
  extraFields?: ('tax_withheld' | 'shares' | 'price_per_share' | 'cost_basis' | 'linked_ledger')[];
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
    from: { type: 'external', defaultName: 'Tenant', editable: true },
    to: { type: 'asset', assetFilter: ['cash'] },
  },
  {
    id: 'gift',
    label: 'Gift',
    flowType: 'income',
    from: { type: 'external', defaultName: 'Family', editable: true },
    to: { type: 'asset', assetFilter: ['cash'] },
  },

  // Investment Income (Asset → Asset)
  {
    id: 'dividend',
    label: 'Dividend',
    flowType: 'transfer',
    from: { type: 'asset', assetFilter: ['stock', 'etf'] },
    to: { type: 'asset', assetFilter: ['cash'] },
    extraFields: ['tax_withheld'],
  },
  {
    id: 'interest',
    label: 'Interest',
    flowType: 'transfer',
    from: { type: 'asset', assetFilter: ['cash'] },
    to: { type: 'same_as_from' },
  },

  // Investment (Asset → Asset)
  {
    id: 'invest',
    label: 'Invest',
    flowType: 'transfer',
    from: { type: 'asset', assetFilter: ['cash'] },
    to: { type: 'asset', assetFilter: ['stock', 'etf', 'crypto', 'bond'], allowCreate: true },
    extraFields: ['shares', 'price_per_share'],
  },
  {
    id: 'sell',
    label: 'Sell',
    flowType: 'transfer',
    from: { type: 'asset', assetFilter: ['stock', 'etf', 'crypto', 'bond'] },
    to: { type: 'asset', assetFilter: ['cash'] },
    extraFields: ['shares', 'price_per_share'],
  },
  {
    id: 'reinvest',
    label: 'Reinvest',
    flowType: 'transfer',
    from: { type: 'asset', assetFilter: ['stock', 'etf', 'crypto'] },
    to: { type: 'asset', assetFilter: ['stock', 'etf', 'crypto'], allowCreate: true },
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
  {
    id: 'pay_debt',
    label: 'Pay Debt',
    flowType: 'transfer',
    from: { type: 'asset', assetFilter: ['cash'] },
    to: { type: 'asset', assetFilter: ['debt'] },
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
