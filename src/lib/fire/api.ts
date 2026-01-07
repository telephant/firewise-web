import { createClient } from '@/lib/supabase/client';
import { ledgerApi, expenseApi } from '@/lib/api';
import type { Ledger, Expense } from '@/types';
import type {
  Asset,
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
} from '@/types/fire';

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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
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
};

// Flow API
export const flowApi = {
  getAll: (params?: FlowFilters) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.asset_id) searchParams.set('asset_id', params.asset_id);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return fetchApi<{ flows: FlowWithDetails[]; total: number }>(
      `/fire/flows${query ? `?${query}` : ''}`
    );
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
  get: () => fetchApi<ExpenseStats>('/fire/expense-stats'),
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
