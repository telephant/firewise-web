import { createClient } from '@/lib/supabase/client';
import { ledgerApi, expenseApi } from '@/lib/api';
import type { Ledger, Expense } from '@/types';
import type {
  Asset,
  AssetType,
  AssetWithBalance,
  AssetFilters,
  ExpenseCategory,
  CreateAssetData,
  UpdateAssetData,
  ExpenseStats,
  Debt,
  DebtFilters,
  CreateDebtData,
  UpdateDebtData,
  RecurringSchedule,
  RecurringScheduleWithDetails,
  RecurringScheduleFilters,
  CreateRecurringScheduleData,
  UpdateRecurringScheduleData,
  ProcessRecurringResult,
  Transaction,
  TransactionWithDetails,
  TransactionFilters,
  TransactionStats,
} from '@/types/fire';
import { getCurrentViewMode } from '@/contexts/fire/view-mode-context';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token
    ? { Authorization: `Bearer ${data.session.access_token}` }
    : {};
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const authHeader = await getAuthHeader();

  // Get current view mode for X-View-Mode header
  const viewMode = getCurrentViewMode();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-View-Mode': viewMode,
    ...authHeader,
  };

  if (options.headers) {
    const optHeaders = options.headers as Record<string, string>;
    Object.assign(headers, optHeaders);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  return response.json();
}

// Asset API
export const assetApi = {
  getAll: (params?: AssetFilters) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const query = searchParams.toString();
    return fetchApi<{ assets: AssetWithBalance[]; total: number }>(
      `/fire/assets${query ? `?${query}` : ''}`
    );
  },

  get: (id: string) => fetchApi<AssetWithBalance>(`/fire/assets/${id}`),

  create: (data: CreateAssetData) =>
    fetchApi<Asset>('/fire/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateAssetData) =>
    fetchApi<Asset>(`/fire/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi(`/fire/assets/${id}`, {
      method: 'DELETE',
    }),

  getNetWorthStats: () =>
    fetchApi<{
      totalAssets: number;
      totalDebts: number;
      netWorth: number;
      currency: string;
    }>('/fire/assets/stats/net-worth'),

  // Import endpoints
  analyzeImport: (data: { file: string; fileType: 'pdf' | 'csv' | 'xlsx'; fileName?: string }) =>
    fetchApi<{
      extracted: ExtractedAsset[];
      source_info: SourceInfo;
      warnings: string[];
      confidence: number;
      existing_tickers: Record<string, { asset_id: string; name: string; balance: number }>;
    }>('/fire/assets/import/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  confirmImport: (data: {
    assets: AssetToImport[];
    duplicate_actions: Record<string, 'skip' | 'update' | 'create'>;
  }) =>
    fetchApi<{
      created: number;
      updated: number;
      skipped: number;
      assets: Asset[];
    }>('/fire/assets/import/confirm', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Import types
export interface ExtractedAsset {
  name: string;
  type: AssetType;
  ticker: string | null;
  shares: number;
  currency: string;
  market: string | null;
  current_price: number | null;
  total_value: number | null;
  confidence: number;
}

export interface SourceInfo {
  broker: string | null;
  statement_date: string | null;
  account_type: string | null;
}

export interface AssetToImport {
  name: string;
  type: AssetType;
  ticker: string | null;
  shares: number;
  currency: string;
  market: string | null;
}

// =============================================================================
// Domain-Specific Transaction APIs
// These are the new atomic APIs that directly update balances and log to flows
// =============================================================================

// Asset Transaction API (invest, sell, transfer, add)
export interface AssetTransactionData {
  type: 'invest' | 'sell' | 'transfer' | 'add';
  amount: number;
  ticker?: string;
  shares?: number;
  asset_type?: 'stock' | 'etf' | 'crypto' | 'bond' | 'real_estate' | 'cash' | 'deposit';
  from_asset_id?: string;
  to_asset_id?: string;
  name?: string;
  currency?: string;
  date?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface AssetTransactionResult {
  transaction_id: string;
  flow_id: string;
  asset?: Asset;
  from_asset?: Asset;
  to_asset?: Asset;
}

export const assetTransactionApi = {
  create: (data: AssetTransactionData) =>
    fetchApi<AssetTransactionResult>('/fire/assets/transaction', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Income API
export interface IncomeData {
  category: string;  // Any category string (salary, bonus, dividend, interest, adjustment, deposit, etc.)
  amount: number;
  to_asset_id: string;
  from_asset_id?: string;
  currency?: string;
  date?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface IncomeResult {
  transaction_id: string;
  to_asset: Asset;
  amount_added: number;
}

export const incomeApi = {
  create: (data: IncomeData) =>
    fetchApi<IncomeResult>('/fire/income', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Expense API (FIRE expenses, not ledger expenses)
export interface FireExpenseData {
  category: string;
  amount: number;
  from_asset_id: string;
  currency?: string;
  date?: string;
  description?: string;
  flow_expense_category_id?: string;
  metadata?: Record<string, unknown>;
}

export interface FireExpenseResult {
  transaction_id: string;
  from_asset: Asset;
  amount_deducted: number;
}

export const fireExpenseApi = {
  create: (data: FireExpenseData) =>
    fetchApi<FireExpenseResult>('/fire/expense', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Debt Transaction API (create, pay)
export interface DebtTransactionData {
  type: 'create' | 'pay';
  amount: number;
  name?: string;
  debt_type?: 'mortgage' | 'personal_loan' | 'credit_card' | 'student_loan' | 'auto_loan' | 'other';
  principal?: number;
  interest_rate?: number;
  term_months?: number;
  start_date?: string;
  monthly_payment?: number;
  debt_id?: string;
  from_asset_id?: string;
  disburse_to_asset_id?: string;
  recurring_frequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  currency?: string;
  date?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface DebtTransactionResult {
  transaction_id?: string;
  debt: Debt;
  from_asset?: Asset;
  to_asset?: Asset;
}

export const debtTransactionApi = {
  create: (data: DebtTransactionData) =>
    fetchApi<DebtTransactionResult>('/fire/debts/transaction', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// =============================================================================
// Transaction API - Unified API for all transaction operations
// =============================================================================
// For creating transactions, use the domain-specific APIs:
// - incomeApi.create() for income
// - fireExpenseApi.create() for expenses
// - assetTransactionApi.create() for invest/sell/transfer/add
// - debtTransactionApi.create() for debt payments
// =============================================================================

export const transactionApi = {
  /**
   * Get all transactions with optional filters
   */
  getAll: async (params?: TransactionFilters): Promise<ApiResponse<{ transactions: TransactionWithDetails[]; total: number }>> => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.asset_id) searchParams.set('asset_id', params.asset_id);
    if (params?.needs_review) searchParams.set('needs_review', 'true');
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return fetchApi<{ transactions: TransactionWithDetails[]; total: number }>(
      `/fire/transactions${query ? `?${query}` : ''}`
    );
  },

  /**
   * Get a single transaction by ID
   */
  get: (id: string) => fetchApi<TransactionWithDetails>(`/fire/transactions/${id}`),

  /**
   * Delete a transaction (for manual cleanup only)
   */
  delete: (id: string) =>
    fetchApi(`/fire/transactions/${id}`, {
      method: 'DELETE',
    }),

  /**
   * Get transaction statistics for a date range
   */
  getStats: (params?: { start_date?: string; end_date?: string; currency?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.currency) searchParams.set('currency', params.currency);

    const query = searchParams.toString();
    return fetchApi<TransactionStats>(`/fire/transactions/stats${query ? `?${query}` : ''}`);
  },

  /**
   * Mark a transaction as reviewed
   */
  markReviewed: (id: string) =>
    fetchApi<Transaction>(`/fire/transactions/${id}/review`, {
      method: 'PATCH',
    }),

  /**
   * Get count of transactions needing review
   */
  getReviewCount: () => fetchApi<{ count: number }>('/fire/transactions/review-count'),
};

// Debt API
export const debtApi = {
  getAll: (params?: DebtFilters) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.debt_type) searchParams.set('debt_type', params.debt_type);
    if (params?.property_asset_id) searchParams.set('property_asset_id', params.property_asset_id);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return fetchApi<{ debts: Debt[]; total: number }>(
      `/fire/debts${query ? `?${query}` : ''}`
    );
  },

  get: (id: string) => fetchApi<Debt>(`/fire/debts/${id}`),

  create: (data: CreateDebtData) =>
    fetchApi<Debt>('/fire/debts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateDebtData) =>
    fetchApi<Debt>(`/fire/debts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi(`/fire/debts/${id}`, {
      method: 'DELETE',
    }),

  getPayments: (id: string) =>
    fetchApi<{ payments: TransactionWithDetails[]; total: number }>(`/fire/debts/${id}/payments`),

  getAmortization: (id: string) =>
    fetchApi<{
      schedule: Array<{
        month: number;
        date: string;
        payment: number;
        principal: number;
        interest: number;
        balance: number;
      }>;
      summary: {
        principal: number;
        totalInterest: number;
        totalPaid: number;
        monthlyPayment: number;
        payoffDate: string | null;
      };
    }>(`/fire/debts/${id}/amortization`),
};

// Expense Category API (FIRE-specific expense categories)
export const expenseCategoryApi = {
  getAll: () => fetchApi<ExpenseCategory[]>('/fire/expense-categories'),

  create: (data: { name: string; icon?: string; color?: string }) =>
    fetchApi<ExpenseCategory>('/fire/expense-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name?: string; icon?: string; color?: string; sort_order?: number }) =>
    fetchApi<ExpenseCategory>(`/fire/expense-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi(`/fire/expense-categories/${id}`, {
      method: 'DELETE',
    }),
};

// Backward compatibility alias
export const flowExpenseCategoryApi = expenseCategoryApi;

// Helper to get all user's ledgers for linking expenses
export async function getLedgersForLinking(): Promise<Ledger[]> {
  const ledgersRes = await ledgerApi.getAll();
  if (!ledgersRes.success || !ledgersRes.data) return [];
  return ledgersRes.data;
}

// Fire Linked Ledger API (which ledgers are linked for FIRE expense tracking)
export interface FireLinkedLedger {
  id: string;
  user_id: string;
  ledger_id: string;
  created_at: string;
  ledger?: {
    id: string;
    name: string;
    description: string | null;
  };
}

export const fireLinkedLedgerApi = {
  getAll: () => fetchApi<FireLinkedLedger[]>('/fire/linked-ledgers'),

  set: (ledgerIds: string[]) =>
    fetchApi<FireLinkedLedger[]>('/fire/linked-ledgers', {
      method: 'POST',
      body: JSON.stringify({ ledger_ids: ledgerIds }),
    }),
};

// Fire Expense Stats API (aggregated expense data for dashboard)
export const fireExpenseStatsApi = {
  get: (params?: { year?: number; month?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.year !== undefined) searchParams.set('year', params.year.toString());
    if (params?.month !== undefined) searchParams.set('month', params.month.toString());
    const query = searchParams.toString();
    return fetchApi<ExpenseStats>(`/fire/expense-stats${query ? `?${query}` : ''}`);
  },
};

// Flow Freedom API
export interface FlowFreedomData {
  passiveIncome: {
    annual: number;
    monthly: number;
    breakdown: {
      dividends: number;
      rental: number;
      interest: number;
      other: number;
    };
  };
  expenses: {
    annual: number;
    monthly: number;
    living: number;
    debtPayments: number;
    debtBreakdown: Array<{
      name: string;
      monthlyPayment: number;
      type: string;
    }>;
  };
  flowFreedom: {
    current: number;
    afterDebtsPaid: number;
    debtPayoffYear: number | null;
  };
  timeToFreedom: {
    years: number | null;
    confidence: 'low' | 'medium' | 'high';
    dataMonths: number;
    trend: {
      monthlyGrowthRate: number | null;
      direction: 'up' | 'down' | 'stable';
    };
  };
  pendingReview: {
    count: number;
    hasPassiveIncome: boolean;
    hasExpenses: boolean;
  };
  // Currency all values are converted to
  currency: string;
}

export const flowFreedomApi = {
  get: () => fetchApi<FlowFreedomData>('/fire/flow-freedom'),
};

// Symbol API (for ticker autocomplete - stocks, ETFs, futures, crypto, etc.)
export type SymbolType = 'stock' | 'etf' | 'future' | 'crypto' | 'index' | 'currency' | 'other';

export interface StockSymbol {
  symbol: string;
  name: string;
  longName?: string;
  type?: SymbolType;
  exchange?: string;
  exchangeDisplay?: string;
  sector?: string;
  industry?: string;
  logoUrl?: string;
}

export interface SymbolSearchOptions {
  q: string;
  region?: string; // 'US', 'HK', 'UK', etc.
  type?: SymbolType | SymbolType[] | 'all'; // single type, array of types, or 'all'
  limit?: number;
}

export const stockSymbolApi = {
  /**
   * Search for symbols (stocks, ETFs, futures, crypto, etc.)
   */
  search: (options: SymbolSearchOptions) => {
    const searchParams = new URLSearchParams();
    searchParams.set('q', options.q);
    if (options.region) searchParams.set('region', options.region);
    if (options.type) {
      // Support both single type and array of types
      const typeValue = Array.isArray(options.type) ? options.type.join(',') : options.type;
      searchParams.set('type', typeValue);
    }
    if (options.limit) searchParams.set('limit', options.limit.toString());

    return fetchApi<{ symbols: StockSymbol[]; total: number }>(
      `/fire/symbols/ticker-search?${searchParams.toString()}`
    );
  },

  /**
   * Search US stocks/ETFs (convenience method)
   * @deprecated Use search() with region: 'US' instead
   */
  searchUs: (
    search: string,
    optionsOrLimit?: number | { limit?: number; type?: SymbolType | SymbolType[] | 'all' }
  ) => {
    const options: SymbolSearchOptions = { q: search, region: 'US' };

    if (typeof optionsOrLimit === 'number') {
      options.limit = optionsOrLimit;
    } else if (optionsOrLimit) {
      if (optionsOrLimit.limit) options.limit = optionsOrLimit.limit;
      if (optionsOrLimit.type) options.type = optionsOrLimit.type;
    }

    return stockSymbolApi.search(options);
  },
};

// Stock Price API (real-time stock prices from Yahoo Finance)
export interface StockPrice {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: string;
}

export const stockPriceApi = {
  getPrices: (symbols: string[]) => {
    const searchParams = new URLSearchParams();
    searchParams.set('symbols', symbols.join(','));
    return fetchApi<Record<string, StockPrice>>(
      `/fire/stock-prices?${searchParams.toString()}`
    );
  },
};

// Currency Exchange API
export interface CurrencyExchange {
  code: string;
  name: string;
  rate: number; // Rate relative to USD (1 USD = X currency)
}

export const currencyExchangeApi = {
  getRate: (code: string) =>
    fetchApi<CurrencyExchange>(`/fire/currency-exchange/${code.toLowerCase()}`),
};

// User Tax Settings API
export interface UserTaxSettings {
  id: string;
  user_id: string;
  us_dividend_withholding_rate: number;
  us_capital_gains_rate: number;
  sg_dividend_withholding_rate: number;
  sg_capital_gains_rate: number;
  created_at: string;
  updated_at: string;
}

export const userTaxSettingsApi = {
  get: () => fetchApi<UserTaxSettings>('/fire/tax-settings'),

  update: (data: {
    us_dividend_withholding_rate?: number;
    us_capital_gains_rate?: number;
    sg_dividend_withholding_rate?: number;
    sg_capital_gains_rate?: number;
  }) =>
    fetchApi<UserTaxSettings>('/fire/tax-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Asset Interest Settings API (for deposit accounts)
export type PaymentPeriod =
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'semi_annual'
  | 'annual'
  | 'biennial'      // 2 years
  | 'triennial'     // 3 years
  | 'quinquennial'; // 5 years

export interface AssetInterestSettings {
  id: string;
  asset_id: string;
  interest_rate: number; // Decimal (e.g., 0.045 for 4.5%)
  payment_period: PaymentPeriod;
  created_at: string;
  updated_at: string;
}

export const PAYMENT_PERIOD_LABELS: Record<PaymentPeriod, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
  biennial: '2 Years',
  triennial: '3 Years',
  quinquennial: '5 Years',
};

export const assetInterestSettingsApi = {
  getAll: () => fetchApi<AssetInterestSettings[]>('/fire/asset-interest-settings'),

  get: (assetId: string) =>
    fetchApi<AssetInterestSettings>(`/fire/asset-interest-settings/${assetId}`),

  upsert: (assetId: string, data: { interest_rate: number; payment_period?: PaymentPeriod }) =>
    fetchApi<AssetInterestSettings>(`/fire/asset-interest-settings/${assetId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (assetId: string) =>
    fetchApi(`/fire/asset-interest-settings/${assetId}`, {
      method: 'DELETE',
    }),
};

// Reconciliation utility for realized P/L
// Use this to recalculate an asset's total_realized_pl from its sell transactions if data gets out of sync
export async function reconcileAssetRealizedPL(assetId: string): Promise<{ success: boolean; totalPL: number }> {
  try {
    // Fetch all sell transactions for this asset
    const txnResponse = await transactionApi.getAll({ asset_id: assetId, limit: 10000 });
    if (!txnResponse.success || !txnResponse.data) {
      return { success: false, totalPL: 0 };
    }

    // Sum up realized P/L from all sell transactions where this asset was sold
    const sellTxns = txnResponse.data.transactions.filter(
      t => (t.from_asset_id === assetId || t.source_asset_id === assetId) && t.category === 'sell'
    );

    let totalPL = 0;
    for (const txn of sellTxns) {
      const realizedPL = (txn.metadata as { realized_pl?: number })?.realized_pl || 0;
      totalPL += realizedPL;
    }

    // Update the asset with recalculated total
    const updateResponse = await assetApi.update(assetId, { total_realized_pl: totalPL });
    if (!updateResponse.success) {
      return { success: false, totalPL };
    }

    return { success: true, totalPL };
  } catch {
    return { success: false, totalPL: 0 };
  }
}

// Feedback API
export type FeedbackType = 'missing_stock' | 'bug_report' | 'feature_request' | 'other';

export interface Feedback {
  id: string;
  user_id: string | null;
  type: FeedbackType;
  content: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
}

export const feedbackApi = {
  create: (type: FeedbackType, content: Record<string, unknown>) =>
    fetchApi<Feedback>('/fire/feedback', {
      method: 'POST',
      body: JSON.stringify({ type, content }),
    }),

  getAll: () => fetchApi<Feedback[]>('/fire/feedback'),
};

// User Preferences API (currency settings, expandable for future preferences)
export interface UserPreferences {
  id: string;
  user_id: string;
  preferred_currency: string;
  convert_all_to_preferred: boolean;
  created_at: string;
  updated_at: string;
}

export const userPreferencesApi = {
  get: () => fetchApi<UserPreferences>('/fire/user-preferences'),

  update: (data: Partial<Pick<UserPreferences, 'preferred_currency' | 'convert_all_to_preferred'>>) =>
    fetchApi<UserPreferences>('/fire/user-preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Recurring Schedule API
export const recurringScheduleApi = {
  getAll: (params?: RecurringScheduleFilters) => {
    const searchParams = new URLSearchParams();
    if (params?.is_active !== undefined) searchParams.set('is_active', params.is_active.toString());
    if (params?.frequency) searchParams.set('frequency', params.frequency);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return fetchApi<{ schedules: RecurringScheduleWithDetails[]; total: number }>(
      `/fire/recurring-schedules${query ? `?${query}` : ''}`
    );
  },

  get: (id: string) => fetchApi<RecurringScheduleWithDetails>(`/fire/recurring-schedules/${id}`),

  create: (data: CreateRecurringScheduleData) =>
    fetchApi<RecurringSchedule>('/fire/recurring-schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateRecurringScheduleData) =>
    fetchApi<RecurringSchedule>(`/fire/recurring-schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi(`/fire/recurring-schedules/${id}`, {
      method: 'DELETE',
    }),

  // Activate/deactivate a schedule
  setActive: (id: string, isActive: boolean) =>
    fetchApi<RecurringSchedule>(`/fire/recurring-schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive }),
    }),

  // Process all due recurring schedules (creates flows, adjusts balances)
  process: () =>
    fetchApi<ProcessRecurringResult>('/fire/recurring-schedules/process', {
      method: 'POST',
    }),

  // Get transactions generated by a specific schedule
  getGeneratedTransactions: (id: string) =>
    fetchApi<{ transactions: TransactionWithDetails[]; total: number }>(`/fire/recurring-schedules/${id}/flows`),
};

// Runway API - Year-by-year projection of how long money will last
// Types match the agent service response (snake_case from Python)
export interface YearProjection {
  year: number;
  net_worth: number;
  assets: number;
  debts: number;
  expenses: number;
  passive_income: number;
  gap: number;
  notes: string | null;
}

export interface Milestone {
  year: number;
  event: string;
  impact: string;
}

export interface RunwayAssumptions {
  inflation_rate: number;
  growth_rates: Record<string, number>;
  reasoning: string;
}

export interface RunwayStrategy {
  withdrawal_order: string[];
  keep_assets: string[];
  reasoning: string;
}

export interface DataQuality {
  confidence: 'very_low' | 'low' | 'medium' | 'good' | 'high';
  months_of_data: number;
  warning: string | null;
}

// Agent projection result
export interface RunwayProjection {
  assumptions: RunwayAssumptions;
  strategy: RunwayStrategy;
  projection: YearProjection[];
  milestones: Milestone[];
  suggestions: string[];
  runway_years: number;
  runway_status: 'infinite' | 'finite' | 'critical';
}

// Full runway response with summary stats
export interface RunwayData {
  summary: {
    net_worth: number;
    monthly: {
      passive_income: number;
      expenses: number;
      gap: number;
    };
    annual: {
      passive_income: number;
      expenses: number;
      gap: number;
    };
    currency: string;
    data_quality: {
      income: DataQuality;
      expenses: DataQuality;
    };
  };
  projection: RunwayProjection;
}

export const runwayApi = {
  get: (timezone?: string) => {
    const params = timezone ? `?timezone=${encodeURIComponent(timezone)}` : '';
    return fetchApi<RunwayData>(`/fire/runway${params}`);
  },
};

// Financial Stats API (shared cached stats for dashboard)
export interface FinancialStats {
  passiveIncome: {
    monthly: number;
    annual: number;
    breakdown: {
      dividends: number;
      rental: number;
      interest: number;
      other: number;
    };
    dataQuality: DataQuality;
  };
  expenses: {
    living: number;      // Annual living expenses (without debt)
    debtPayments: number; // Annual debt payments
    total: number;        // Annual total (living + debt)
    monthly: number;      // Monthly total
    dataQuality: DataQuality;
  };
  debts: {
    total: number;
    monthlyPayments: number;
    breakdown: Array<{
      id: string;
      name: string;
      type: string;
      balance: number;
      interestRate: number;
      monthlyPayment: number;
    }>;
  };
  netWorth: number;
  currency: string;
  monthlyHistory: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
}

export const financialStatsApi = {
  get: (forceRefresh = false) => {
    const params = forceRefresh ? '?refresh=true' : '';
    return fetchApi<FinancialStats>(`/fire/financial-stats${params}`);
  },
  clearCache: () => {
    return fetchApi<{ cleared: boolean }>('/fire/financial-stats/clear-cache', {
      method: 'POST',
    });
  },
};

// Dividend Calendar types
export interface MonthDividend {
  ticker: string;
  assetId: string;
  amount: number;
  originalAmount?: number;
  originalCurrency?: string;
  isForecasted: boolean;
  date?: string;
  frequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | null;
  market?: string | null; // 'US', 'SG', etc.
}

export interface MonthData {
  month: number;
  name: string;
  dividends: MonthDividend[];
  total: number;
}

export interface TaxRates {
  us: number; // US dividend withholding rate (e.g., 0.30)
  sg: number; // SG dividend withholding rate (e.g., 0.00)
}

export interface DividendCalendarData {
  year: number;
  months: MonthData[];
  annualTotal: number;
  currency: string;
  taxRate: number; // @deprecated - use taxRates instead
  taxRates: TaxRates; // Tax rates by market
  debug?: {
    stockCount: number;
    dividendCount: number;
    historicalCount: number;
  };
}

export const dividendCalendarApi = {
  get: (year?: number) => {
    const params = year ? `?year=${year}` : '';
    return fetchApi<DividendCalendarData>(`/fire/dividend-calendar${params}`);
  },
};

// Passive Income Stats Types
export interface PassiveIncomeCategoryBreakdown {
  category: string;
  amount: number;
  count: number;
}

export interface PassiveIncomeStats {
  thisMonth: {
    total: number;
    breakdown: PassiveIncomeCategoryBreakdown[];
  };
  annual: {
    total: number;
    breakdown: PassiveIncomeCategoryBreakdown[];
  };
  currency: string;
  year: number;
  month: number;
}

export const passiveIncomeApi = {
  get: (params?: { year?: number; month?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.year) searchParams.set('year', params.year.toString());
    if (params?.month) searchParams.set('month', params.month.toString());
    const query = searchParams.toString();
    return fetchApi<PassiveIncomeStats>(`/fire/passive-income${query ? `?${query}` : ''}`);
  },
};

// Monthly Summary Types
export interface MonthlySummaryCategoryBreakdown {
  category: string;
  amount: number;
  count: number;
}

export interface MonthlySummaryLedgerBreakdown {
  ledger_id: string;
  ledger_name: string;
  amount: number;
  count: number;
}

export interface MonthlySummaryStats {
  income: {
    total: number;
    active: {
      total: number;
      breakdown: MonthlySummaryCategoryBreakdown[];
    };
    passive: {
      total: number;
      breakdown: MonthlySummaryCategoryBreakdown[];
    };
  };
  expenses: {
    total: number;
    local: {
      total: number;
      byCategory: MonthlySummaryCategoryBreakdown[];
    };
    ledgers: {
      total: number;
      breakdown: MonthlySummaryLedgerBreakdown[];
    };
  };
  debtPayments: {
    total: number;
    count: number;
  };
  net: number;
  currency: string;
  year: number;
  month: number;
}

export const monthlySummaryApi = {
  get: (params?: { year?: number; month?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.year) searchParams.set('year', params.year.toString());
    if (params?.month) searchParams.set('month', params.month.toString());
    const query = searchParams.toString();
    return fetchApi<MonthlySummaryStats>(`/fire/monthly-summary${query ? `?${query}` : ''}`);
  },
};

// Monthly Financial Snapshot Types
export interface MonthlySnapshot {
  id: string;
  belong_id: string;
  year: number;
  month: number;
  snapshot_date: string;
  currency: string;
  total_assets: number;
  total_debts: number;
  net_worth: number;
  total_income: number;
  active_income: number;
  passive_income: number;
  avg_passive_income_12m: number;
  total_expenses: number;
  assets: Array<{
    id: string;
    name: string;
    type: string;
    ticker: string | null;
    balance: number;
    currency: string;
    balance_usd: number;
  }>;
  debts: Array<{
    id: string;
    name: string;
    debt_type: string;
    current_balance: number;
    currency: string;
    balance_usd: number;
  }>;
  assets_by_type: Record<string, number>;
  income_by_category: Record<string, number>;
  expenses_by_category: Record<string, number>;
  created_at: string;
  // Converted amounts in user's preferred currency
  converted_currency?: string;
  converted_total_assets?: number;
  converted_total_debts?: number;
  converted_net_worth?: number;
  converted_total_income?: number;
  converted_passive_income?: number;
  converted_avg_passive_income_12m?: number;
  converted_total_expenses?: number;
}

export interface SnapshotTrendPoint {
  year: number;
  month: number;
  net_worth: number;
  total_assets: number;
  total_debts: number;
  passive_income: number;
}

export interface SnapshotComparison {
  from: MonthlySnapshot | null;
  to: MonthlySnapshot | null;
  changes: {
    net_worth: number;
    net_worth_pct: number;
    total_assets: number;
    total_debts: number;
    total_income: number;
    passive_income: number;
    total_expenses: number;
  } | null;
}

export const snapshotApi = {
  // Get list of snapshots
  getAll: (params?: { year?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.year) searchParams.set('year', params.year.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString();
    return fetchApi<{ snapshots: MonthlySnapshot[] }>(`/fire/snapshots${query ? `?${query}` : ''}`);
  },

  // Get specific month's snapshot
  get: (year: number, month: number) =>
    fetchApi<MonthlySnapshot>(`/fire/snapshots/${year}/${month}`),

  // Compare two months
  compare: (from: string, to: string) =>
    fetchApi<SnapshotComparison>(`/fire/snapshots/compare?from=${from}&to=${to}`),

  // Get net worth trend
  getTrend: (months?: number) => {
    const searchParams = new URLSearchParams();
    if (months) searchParams.set('months', months.toString());
    const query = searchParams.toString();
    return fetchApi<{ trend: SnapshotTrendPoint[] }>(`/fire/snapshots/trend${query ? `?${query}` : ''}`);
  },
};
