import { createClient } from '@/lib/supabase/client';
import { ledgerApi, expenseApi } from '@/lib/api';
import type { Ledger, Expense } from '@/types';
import type {
  Asset,
  AssetType,
  AssetWithBalance,
  AssetFilters,
  Flow,
  FlowWithDetails,
  FlowFilters,
  FlowStats,
  FlowExpenseCategory,
  CreateAssetData,
  UpdateAssetData,
  CreateFlowData,
  UpdateFlowData,
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

// Flow API
export const flowApi = {
  getAll: async (params?: FlowFilters) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.asset_id) searchParams.set('asset_id', params.asset_id);
    if (params?.needs_review) searchParams.set('needs_review', 'true');
    if (params?.exclude_category) searchParams.set('exclude_category', params.exclude_category);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    const url = `/fire/flows${query ? `?${query}` : ''}`;
    return fetchApi<{ flows: FlowWithDetails[]; total: number }>(url);
  },

  get: (id: string) => fetchApi<FlowWithDetails>(`/fire/flows/${id}`),

  create: (data: CreateFlowData) =>
    fetchApi<Flow>('/fire/flows', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateFlowData) =>
    fetchApi<Flow>(`/fire/flows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi(`/fire/flows/${id}`, {
      method: 'DELETE',
    }),

  getStats: (params?: { start_date?: string; end_date?: string; currency?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.currency) searchParams.set('currency', params.currency);

    const query = searchParams.toString();
    return fetchApi<FlowStats>(`/fire/flows/stats${query ? `?${query}` : ''}`);
  },

  // Mark a flow as reviewed (sets needs_review to false)
  markReviewed: (id: string) =>
    fetchApi<Flow>(`/fire/flows/${id}/review`, {
      method: 'PATCH',
    }),

  // Get count of flows needing review
  getReviewCount: () => fetchApi<{ count: number }>('/fire/flows/review-count'),
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
    fetchApi<{ payments: Flow[]; total: number }>(`/fire/debts/${id}/payments`),

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

// Flow Expense Category API (FIRE-specific expense categories)
export const flowExpenseCategoryApi = {
  getAll: () => fetchApi<FlowExpenseCategory[]>('/fire/flow-expense-categories'),

  create: (data: { name: string; icon?: string; color?: string }) =>
    fetchApi<FlowExpenseCategory>('/fire/flow-expense-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name?: string; icon?: string; color?: string; sort_order?: number }) =>
    fetchApi<FlowExpenseCategory>(`/fire/flow-expense-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi(`/fire/flow-expense-categories/${id}`, {
      method: 'DELETE',
    }),
};

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

// Stock Symbol API (for investment flow ticker autocomplete)
export interface StockSymbol {
  symbol: string;
  name: string;
}

export const stockSymbolApi = {
  searchUs: (search: string, limit: number = 20) => {
    const searchParams = new URLSearchParams();
    searchParams.set('search', search);
    searchParams.set('limit', limit.toString());
    return fetchApi<{ symbols: StockSymbol[]; total: number }>(
      `/fire/stock-symbols/us?${searchParams.toString()}`
    );
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

// User Tax Settings API
export interface UserTaxSettings {
  id: string;
  user_id: string;
  us_dividend_withholding_rate: number;
  us_capital_gains_rate: number;
  created_at: string;
  updated_at: string;
}

export const userTaxSettingsApi = {
  get: () => fetchApi<UserTaxSettings>('/fire/tax-settings'),

  update: (data: {
    us_dividend_withholding_rate?: number;
    us_capital_gains_rate?: number;
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
// Use this to recalculate an asset's total_realized_pl from its sell flows if data gets out of sync
export async function reconcileAssetRealizedPL(assetId: string): Promise<{ success: boolean; totalPL: number }> {
  try {
    // Fetch all sell flows for this asset
    const flowsResponse = await flowApi.getAll({ asset_id: assetId, limit: 10000 });
    if (!flowsResponse.success || !flowsResponse.data) {
      return { success: false, totalPL: 0 };
    }

    // Sum up realized P/L from all sell flows where this asset was sold
    const sellFlows = flowsResponse.data.flows.filter(
      f => f.from_asset_id === assetId && f.category === 'sell'
    );

    let totalPL = 0;
    for (const flow of sellFlows) {
      const realizedPL = (flow.metadata as { realized_pl?: number })?.realized_pl || 0;
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

  // Get flows generated by a specific schedule
  getGeneratedFlows: (id: string) =>
    fetchApi<{ flows: FlowWithDetails[]; total: number }>(`/fire/recurring-schedules/${id}/flows`),
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
