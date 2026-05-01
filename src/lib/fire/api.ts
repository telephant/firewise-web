import { createClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Portfolio {
  id: string;
  belong_id: string;
  name: string;
  currency: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  portfolio_id: string;
  ticker: string;
  market: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  currency: string;
  date: string;
  notes: string | null;
  created_at: string;
}

export interface Holding {
  ticker: string;
  market: string;
  currency: string;
  shares: number;
  avg_cost: number;
  current_price: number | null;
  value: number | null;
  cost: number;
  unrealized_pl: number | null;
  unrealized_pl_pct: number | null;
}

export interface Dividend {
  id: string;
  portfolio_id: string;
  ticker: string;
  shares_at_exdate: number;
  amount_per_share: number;
  total_amount: number;
  currency: string;
  tax_rate: number;
  tax_withheld: number;
  ex_date: string;
  pay_date: string | null;
  source: 'auto' | 'manual';
  created_at: string;
}

export interface PortfolioSnapshot {
  id: string;
  portfolio_id: string;
  snapshot_date: string;
  total_value: number;
  total_cost: number;
  unrealized_pl: number;
  realized_pl: number;
  currency: string;
  detail: {
    ticker: string;
    shares: number;
    price: number;
    value: number;
    cost: number;
    unrealized_pl: number;
  }[];
  created_at: string;
}

export interface PortfolioStats {
  total_value: number;
  total_cost: number;
  unrealized_pl: number;
  realized_pl: number;
  dividend_ytd: number;
  dividend_mtd: number;
  mom_gain: number | null;
  mom_gain_pct: number | null;
  currency: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  profile?: {
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface Family {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  members?: FamilyMember[];
}

export interface FamilyInvitation {
  id: string;
  family_id: string;
  email: string;
  token: string;
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export interface CreateTradeData {
  ticker: string;
  market: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  currency: string;
  date: string;
  notes?: string;
}

export interface CreateDividendData {
  ticker: string;
  amount_per_share: number;
  total_amount: number;
  currency: string;
  tax_rate?: number;
  ex_date: string;
  pay_date?: string;
}

export interface RealizedPLItem {
  ticker: string;
  realized_pl: number;
  trade_count: number;
}

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

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
): Promise<{ success: boolean; data?: T; error?: string }> {
  const authHeader = await getAuthHeader();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeader,
  };
  // Send selected family ID with every fire request
  if (typeof window !== 'undefined') {
    const selectedFamilyId = localStorage.getItem('fire_selected_family_id');
    if (selectedFamilyId) {
      headers['x-family-id'] = selectedFamilyId;
    }
  }
  if (options.headers) {
    Object.assign(headers, options.headers as Record<string, string>);
  }
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  return response.json();
}

// ── API ────────────────────────────────────────────────────────────────────

export const portfolioApi = {
  list: () => fetchApi<Portfolio[]>('/portfolios'),
  get: (id: string) => fetchApi<Portfolio>(`/portfolios/${id}`),
  create: (data: { name: string; currency: string; description?: string }) =>
    fetchApi<Portfolio>('/portfolios', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; currency: string; description: string }>) =>
    fetchApi<Portfolio>(`/portfolios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchApi(`/portfolios/${id}`, { method: 'DELETE' }),
  getRealizedPL: (id: string) => fetchApi<RealizedPLItem[]>(`/portfolios/${id}/realized-pl`),
};

export const tradeApi = {
  list: (portfolioId: string) => fetchApi<Trade[]>(`/portfolios/${portfolioId}/trades`),
  create: (portfolioId: string, data: CreateTradeData) =>
    fetchApi<Trade>(`/portfolios/${portfolioId}/trades`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (portfolioId: string, tradeId: string, data: Partial<CreateTradeData>) =>
    fetchApi<Trade>(`/portfolios/${portfolioId}/trades/${tradeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (portfolioId: string, tradeId: string) =>
    fetchApi(`/portfolios/${portfolioId}/trades/${tradeId}`, { method: 'DELETE' }),
};

export const holdingApi = {
  list: (portfolioId: string) => fetchApi<Holding[]>(`/portfolios/${portfolioId}/holdings`),
};

export const dividendApi = {
  list: (portfolioId: string, params?: { year?: number; month?: number }) => {
    const q = new URLSearchParams();
    if (params?.year) q.set('year', String(params.year));
    if (params?.month) q.set('month', String(params.month));
    return fetchApi<Dividend[]>(
      `/portfolios/${portfolioId}/dividends${q.toString() ? `?${q}` : ''}`
    );
  },
  create: (portfolioId: string, data: CreateDividendData) =>
    fetchApi<Dividend>(`/portfolios/${portfolioId}/dividends`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (portfolioId: string, dividendId: string, data: Partial<CreateDividendData>) =>
    fetchApi<Dividend>(`/portfolios/${portfolioId}/dividends/${dividendId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (portfolioId: string, dividendId: string) =>
    fetchApi(`/portfolios/${portfolioId}/dividends/${dividendId}`, { method: 'DELETE' }),
};

export const portfolioStatsApi = {
  getStats: (portfolioId: string) =>
    fetchApi<PortfolioStats>(`/portfolios/${portfolioId}/stats`),
  getSnapshots: (portfolioId: string) =>
    fetchApi<PortfolioSnapshot[]>(`/portfolios/${portfolioId}/snapshots`),
};

export const exchangeRateApi = {
  get: (base: string, codes: string[]) =>
    fetchApi<ExchangeRates>(`/exchange-rates?base=${base}&codes=${codes.join(',')}`),
};

export const familyApi = {
  ensurePersonal: () =>
    fetchApi<Family>('/fire/families/ensure-personal', { method: 'POST' }),

  getAll: () => fetchApi<Family[]>('/fire/families/me'),

  create: (data: { name: string }) =>
    fetchApi<Family>('/fire/families', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: { name: string }) =>
    fetchApi<Family>(`/fire/families/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  invite: (familyId: string, email: string) =>
    fetchApi(`/fire/families/${familyId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  removeMember: (familyId: string, userId: string) =>
    fetchApi(`/fire/families/${familyId}/members/${userId}`, { method: 'DELETE' }),

  leave: (familyId: string) =>
    fetchApi(`/fire/families/${familyId}/leave`, { method: 'POST' }),

  getInvitations: (familyId: string) =>
    fetchApi<FamilyInvitation[]>(`/fire/families/${familyId}/invitations`),

  resendInvitation: (familyId: string, invitationId: string) =>
    fetchApi(`/fire/families/${familyId}/invitations/${invitationId}/resend`, { method: 'POST' }),

  cancelInvitation: (familyId: string, invitationId: string) =>
    fetchApi(`/fire/families/${familyId}/invitations/${invitationId}`, { method: 'DELETE' }),
};

export const invitationApi = {
  get: (token: string) =>
    fetchApi<{ invitation: FamilyInvitation; family: Family }>(`/fire/invitations/${token}`),

  accept: (token: string) =>
    fetchApi(`/fire/invitations/${token}/accept`, { method: 'POST' }),
};

// Feedback API
export type FeedbackType = 'missing_stock' | 'bug' | 'feature_request' | 'other';

export const feedbackApi = {
  create: (type: FeedbackType, data: Record<string, unknown>) =>
    fetchApi('/fire/feedback', { method: 'POST', body: JSON.stringify({ type, ...data }) }),
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
  region?: string;
  type?: SymbolType | SymbolType[] | 'all';
  limit?: number;
}

export const stockSymbolApi = {
  search: (options: SymbolSearchOptions) => {
    const searchParams = new URLSearchParams();
    searchParams.set('q', options.q);
    if (options.region) searchParams.set('region', options.region);
    if (options.type) {
      const typeValue = Array.isArray(options.type) ? options.type.join(',') : options.type;
      searchParams.set('type', typeValue);
    }
    if (options.limit) searchParams.set('limit', options.limit.toString());
    return fetchApi<{ symbols: StockSymbol[]; total: number }>(
      `/fire/symbols/ticker-search?${searchParams.toString()}`
    );
  },
};

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

// ── DCA ────────────────────────────────────────────────────────────────────

export type DcaFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type DcaMode = 'amount' | 'shares';

export interface DcaPlan {
  id: string;
  portfolio_id: string;
  ticker: string;
  market: string;
  currency: string;
  frequency: DcaFrequency;
  mode: DcaMode;
  amount: number | null;
  shares: number | null;
  next_run_date: string;
  last_run_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DcaPending {
  id: string;
  dca_plan_id: string;
  portfolio_id: string;
  ticker: string;
  market: string;
  currency: string;
  scheduled_date: string;
  mode: DcaMode;
  amount: number | null;
  shares: number | null;
  suggested_price: number | null;
  suggested_shares: number | null;
  status: 'pending' | 'confirmed' | 'skipped';
  confirmed_price: number | null;
  confirmed_shares: number | null;
  trade_id: string | null;
  created_at: string;
}

export interface CreateDcaPlanData {
  portfolio_id: string;
  ticker: string;
  market: string;
  currency: string;
  frequency: DcaFrequency;
  mode: DcaMode;
  amount?: number;
  shares?: number;
  start_date: string;
  notes?: string;
}

export const dcaApi = {
  listPlans: () => fetchApi<DcaPlan[]>('/fire/dca/plans'),
  createPlan: (data: CreateDcaPlanData) =>
    fetchApi<DcaPlan>('/fire/dca/plans', { method: 'POST', body: JSON.stringify(data) }),
  updatePlan: (id: string, data: Partial<CreateDcaPlanData & { is_active: boolean; next_run_date: string }>) =>
    fetchApi<DcaPlan>(`/fire/dca/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlan: (id: string) =>
    fetchApi(`/fire/dca/plans/${id}`, { method: 'DELETE' }),
  listPending: (portfolioId?: string) => {
    const q = portfolioId ? `?portfolio_id=${portfolioId}` : '';
    return fetchApi<DcaPending[]>(`/fire/dca/pending${q}`);
  },
  confirmPending: (id: string, data: { confirmed_price: number; confirmed_shares: number }) =>
    fetchApi<DcaPending>(`/fire/dca/pending/${id}/confirm`, { method: 'POST', body: JSON.stringify(data) }),
  skipPending: (id: string) =>
    fetchApi<DcaPending>(`/fire/dca/pending/${id}/skip`, { method: 'POST' }),
};
