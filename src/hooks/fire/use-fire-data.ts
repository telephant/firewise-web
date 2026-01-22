'use client';

import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import {
  assetApi,
  flowApi,
  debtApi,
  flowExpenseCategoryApi,
  fireLinkedLedgerApi,
  fireExpenseStatsApi,
  flowFreedomApi,
  runwayApi,
  stockPriceApi,
  assetInterestSettingsApi,
  userPreferencesApi,
  recurringScheduleApi,
  getLedgersForLinking,
} from '@/lib/fire/api';
import type { FlowFreedomData, RunwayData } from '@/lib/fire/api';
import type {
  Asset,
  AssetWithBalance,
  AssetFilters,
  FlowWithDetails,
  FlowFilters,
  FlowStats,
  FlowExpenseCategory,
  ExpenseStats,
  Debt,
  DebtFilters,
  RecurringScheduleWithDetails,
  RecurringScheduleFilters,
} from '@/types/fire';
import type { StockPrice, AssetInterestSettings, UserPreferences } from '@/lib/fire/api';

import type { Ledger } from '@/types';

// SWR Keys - use stable string keys to avoid reference comparison issues
const SWR_KEYS = {
  assets: (filters?: AssetFilters) => {
    const params = new URLSearchParams();
    if (filters?.type) params.set('type', filters.type);
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.limit) params.set('limit', filters.limit.toString());
    const query = params.toString();
    return `/fire/assets${query ? `?${query}` : ''}`;
  },
  flows: (filters?: FlowFilters) => {
    // Serialize filters to create stable cache key
    const params = new URLSearchParams();
    if (filters?.type) params.set('type', filters.type);
    if (filters?.start_date) params.set('start_date', filters.start_date);
    if (filters?.end_date) params.set('end_date', filters.end_date);
    if (filters?.asset_id) params.set('asset_id', filters.asset_id);
    if (filters?.needs_review) params.set('needs_review', 'true');
    if (filters?.exclude_category) params.set('exclude_category', filters.exclude_category);
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.limit) params.set('limit', filters.limit.toString());
    const query = params.toString();
    return `/fire/flows${query ? `?${query}` : ''}`;
  },
  stats: (filters?: { start_date?: string; end_date?: string }) => {
    const params = new URLSearchParams();
    if (filters?.start_date) params.set('start_date', filters.start_date);
    if (filters?.end_date) params.set('end_date', filters.end_date);
    const query = params.toString();
    return `/fire/stats${query ? `?${query}` : ''}`;
  },
  expenseCategories: '/fire/expense-categories',
  linkedLedgers: '/fire/linked-ledgers',
  ledgersForLinking: '/fire/ledgers-for-linking',
  expenseStats: (params?: { year?: number; month?: number }) => {
    const parts = ['/fire/expense-stats'];
    if (params?.year !== undefined || params?.month !== undefined) {
      const searchParams = new URLSearchParams();
      if (params?.year !== undefined) searchParams.set('year', params.year.toString());
      if (params?.month !== undefined) searchParams.set('month', params.month.toString());
      parts.push(`?${searchParams.toString()}`);
    }
    return parts.join('');
  },
  stockPrices: (symbols: string[]) => `/fire/stock-prices?symbols=${symbols.join(',')}`,
  assetInterestSettings: '/fire/asset-interest-settings',
  debts: (filters?: DebtFilters) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.debt_type) params.set('debt_type', filters.debt_type);
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.limit) params.set('limit', filters.limit.toString());
    const query = params.toString();
    return `/fire/debts${query ? `?${query}` : ''}`;
  },
  userPreferences: '/fire/user-preferences',
  recurringSchedules: (filters?: RecurringScheduleFilters) => {
    const params = new URLSearchParams();
    if (filters?.is_active !== undefined) params.set('is_active', filters.is_active.toString());
    if (filters?.frequency) params.set('frequency', filters.frequency);
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.limit) params.set('limit', filters.limit.toString());
    const query = params.toString();
    return `/fire/recurring-schedules${query ? `?${query}` : ''}`;
  },
  flowFreedom: '/fire/flow-freedom',
  runway: '/fire/runway',
  netWorthStats: '/fire/assets/stats/net-worth',
};

// ═══════════════════════════════════════════════════════════════
// Assets Hook
// ═══════════════════════════════════════════════════════════════

interface UseAssetsReturn {
  assets: AssetWithBalance[];
  total: number;
  isLoading: boolean;
  error: string | null;
  mutate: () => Promise<void>;
}

export function useAssets(filters?: AssetFilters): UseAssetsReturn {
  // Generate stable key from filters
  const swrKey = SWR_KEYS.assets(filters);

  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    swrKey,
    async () => {
      const response = await assetApi.getAll({ limit: 100, ...filters });
      if (response.success && response.data) {
        // Deduplicate assets by id
        // Cast to AssetWithBalance since backend adds converted fields when enabled
        const assets = response.data.assets.filter(
          (asset, index, self) => self.findIndex((a) => a.id === asset.id) === index
        ) as AssetWithBalance[];
        return { assets, total: response.data.total };
      }
      throw new Error(response.error || 'Failed to fetch assets');
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    assets: data?.assets || [],
    total: data?.total || 0,
    isLoading,
    error: error?.message || null,
    mutate: async () => {
      await swrMutate();
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Net Worth Stats Hook
// ═══════════════════════════════════════════════════════════════

interface UseNetWorthStatsReturn {
  totalAssets: number;
  totalDebts: number;
  netWorth: number;
  currency: string;
  isLoading: boolean;
  error: string | null;
  mutate: () => Promise<void>;
}

export function useNetWorthStats(): UseNetWorthStatsReturn {
  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    SWR_KEYS.netWorthStats,
    async () => {
      const response = await assetApi.getNetWorthStats();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch net worth stats');
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    totalAssets: data?.totalAssets || 0,
    totalDebts: data?.totalDebts || 0,
    netWorth: data?.netWorth || 0,
    currency: data?.currency || 'USD',
    isLoading,
    error: error?.message || null,
    mutate: async () => {
      await swrMutate();
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Debts Hook
// ═══════════════════════════════════════════════════════════════

interface UseDebtsReturn {
  debts: Debt[];
  total: number;
  isLoading: boolean;
  error: string | null;
  mutate: () => Promise<void>;
}

export function useDebts(filters?: DebtFilters): UseDebtsReturn {
  const swrKey = SWR_KEYS.debts(filters);

  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    swrKey,
    async () => {
      const response = await debtApi.getAll({ limit: 100, ...filters });
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch debts');
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    debts: data?.debts || [],
    total: data?.total || 0,
    isLoading,
    error: error?.message || null,
    mutate: async () => {
      await swrMutate();
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Flows Hook
// ═══════════════════════════════════════════════════════════════

interface UseFlowsReturn {
  flows: FlowWithDetails[];
  total: number;
  isLoading: boolean;
  error: string | null;
  mutate: () => Promise<void>;
}

export function useFlows(filters?: FlowFilters): UseFlowsReturn {
  // Generate stable key from filters
  const swrKey = SWR_KEYS.flows(filters);

  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    swrKey,
    async () => {
      const response = await flowApi.getAll(filters);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch flows');
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    flows: data?.flows || [],
    total: data?.total || 0,
    isLoading,
    error: error?.message || null,
    mutate: async () => {
      await swrMutate();
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Flow Stats Hook
// ═══════════════════════════════════════════════════════════════

interface UseFlowStatsReturn {
  stats: FlowStats | null;
  isLoading: boolean;
  error: string | null;
  mutate: () => Promise<void>;
}

export function useFlowStats(params?: {
  start_date?: string;
  end_date?: string;
}): UseFlowStatsReturn {
  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    SWR_KEYS.stats(params),
    async () => {
      const response = await flowApi.getStats(params);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch stats');
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    stats: data || null,
    isLoading,
    error: error?.message || null,
    mutate: async () => {
      await swrMutate();
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Expense Categories Hook
// ═══════════════════════════════════════════════════════════════

interface UseExpenseCategoriesReturn {
  categories: FlowExpenseCategory[];
  isLoading: boolean;
  error: string | null;
  mutate: () => Promise<void>;
}

export function useExpenseCategories(): UseExpenseCategoriesReturn {
  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    SWR_KEYS.expenseCategories,
    async () => {
      const response = await flowExpenseCategoryApi.getAll();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch expense categories');
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Cache for 30 seconds
    }
  );

  return {
    categories: data || [],
    isLoading,
    error: error?.message || null,
    mutate: async () => {
      await swrMutate();
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Linked Ledgers Hook
// ═══════════════════════════════════════════════════════════════

interface LinkedLedger {
  ledger_id: string;
  ledger_name: string;
}

interface UseLinkedLedgersReturn {
  linkedLedgers: LinkedLedger[];
  isLoading: boolean;
  error: string | null;
  mutate: () => Promise<void>;
}

export function useLinkedLedgers(): UseLinkedLedgersReturn {
  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    SWR_KEYS.linkedLedgers,
    async () => {
      const response = await fireLinkedLedgerApi.getAll();
      if (response.success && response.data) {
        return response.data
          .filter((item) => item.ledger)
          .map((item) => ({
            ledger_id: item.ledger_id,
            ledger_name: item.ledger!.name,
          }));
      }
      throw new Error(response.error || 'Failed to fetch linked ledgers');
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    linkedLedgers: data || [],
    isLoading,
    error: error?.message || null,
    mutate: async () => {
      await swrMutate();
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Ledgers For Linking Hook (all user ledgers for expense linking)
// ═══════════════════════════════════════════════════════════════

interface UseLedgersForLinkingReturn {
  ledgers: Ledger[];
  isLoading: boolean;
  error: string | null;
  mutate: () => Promise<void>;
}

export function useLedgersForLinking(): UseLedgersForLinkingReturn {
  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    SWR_KEYS.ledgersForLinking,
    async () => {
      return await getLedgersForLinking();
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    ledgers: data || [],
    isLoading,
    error: error?.message || null,
    mutate: async () => {
      await swrMutate();
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Expense Stats Hook (for dashboard)
// ═══════════════════════════════════════════════════════════════

interface UseExpenseStatsReturn {
  stats: ExpenseStats | null;
  isLoading: boolean;
  error: string | null;
  mutate: () => Promise<void>;
}

export function useExpenseStats(params?: { year?: number; month?: number }): UseExpenseStatsReturn {
  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    SWR_KEYS.expenseStats(params),
    async () => {
      const response = await fireExpenseStatsApi.get(params);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch expense stats');
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    stats: data || null,
    isLoading,
    error: error?.message || null,
    mutate: async () => {
      await swrMutate();
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Stock Prices Hook
// ═══════════════════════════════════════════════════════════════

interface UseStockPricesReturn {
  prices: Record<string, StockPrice>;
  isLoading: boolean;
  error: string | null;
  mutate: () => Promise<void>;
}

export function useStockPrices(symbols: string[]): UseStockPricesReturn {
  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    symbols.length > 0 ? SWR_KEYS.stockPrices(symbols) : null,
    async () => {
      const response = await stockPriceApi.getPrices(symbols);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch stock prices');
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 15 * 60 * 1000, // 15 minutes cache
      refreshInterval: 15 * 60 * 1000, // Auto refresh every 15 minutes
    }
  );

  return {
    prices: data || {},
    isLoading,
    error: error?.message || null,
    mutate: async () => {
      await swrMutate();
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Asset Interest Settings Hook (for deposit accounts)
// ═══════════════════════════════════════════════════════════════

interface UseAssetInterestSettingsReturn {
  settings: AssetInterestSettings[];
  settingsMap: Record<string, AssetInterestSettings>; // asset_id -> settings
  isLoading: boolean;
  error: string | null;
  mutate: () => Promise<void>;
}

export function useAssetInterestSettings(): UseAssetInterestSettingsReturn {
  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    SWR_KEYS.assetInterestSettings,
    async () => {
      const response = await assetInterestSettingsApi.getAll();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch asset interest settings');
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  // Create a map for quick lookup by asset_id
  const settingsMap: Record<string, AssetInterestSettings> = {};
  if (data) {
    for (const setting of data) {
      settingsMap[setting.asset_id] = setting;
    }
  }

  return {
    settings: data || [],
    settingsMap,
    isLoading,
    error: error?.message || null,
    mutate: async () => {
      await swrMutate();
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// User Preferences Hook (currency settings, etc.)
// ═══════════════════════════════════════════════════════════════

interface UseUserPreferencesReturn {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;
  mutate: () => Promise<void>;
  updatePreferences: (data: Partial<Pick<UserPreferences, 'preferred_currency' | 'convert_all_to_preferred'>>) => Promise<boolean>;
}

export function useUserPreferences(): UseUserPreferencesReturn {
  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    SWR_KEYS.userPreferences,
    async () => {
      const response = await userPreferencesApi.get();
      if (response.success && response.data) {
        return response.data;
      }
      // Return default preferences if not found (new user)
      if (response.error === 'User preferences not found') {
        return null;
      }
      throw new Error(response.error || 'Failed to fetch user preferences');
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const updatePreferences = async (
    updateData: Partial<Pick<UserPreferences, 'preferred_currency' | 'convert_all_to_preferred'>>
  ): Promise<boolean> => {
    try {
      const response = await userPreferencesApi.update(updateData);
      if (response.success) {
        await swrMutate();
        // Also mutate all data that might be affected by currency conversion
        await mutateAllFireData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return {
    preferences: data || null,
    isLoading,
    error: error?.message || null,
    mutate: async () => {
      await swrMutate();
    },
    updatePreferences,
  };
}

// ═══════════════════════════════════════════════════════════════
// Mutation helpers (for optimistic updates)
// ═══════════════════════════════════════════════════════════════

export async function mutateAssets() {
  // Mutate all asset queries (keys are now strings starting with /fire/assets)
  await mutate((key) => typeof key === 'string' && key.startsWith('/fire/assets'));
}

export async function mutateFlows() {
  // Mutate all flows queries (keys are now strings starting with /fire/flows)
  await mutate((key) => typeof key === 'string' && key.startsWith('/fire/flows'));
}

export async function mutateStats() {
  // Mutate all stats queries (keys are now strings starting with /fire/stats)
  await mutate((key) => typeof key === 'string' && key.startsWith('/fire/stats'));
}

export async function mutateExpenseCategories() {
  await mutate(SWR_KEYS.expenseCategories);
}

export async function mutateLinkedLedgers() {
  await mutate(SWR_KEYS.linkedLedgers);
}

export async function mutateExpenseStats() {
  await mutate(SWR_KEYS.expenseStats);
}

export async function mutateAssetInterestSettings() {
  await mutate(SWR_KEYS.assetInterestSettings);
}

export async function mutateDebts() {
  // Mutate all debt queries (keys are now strings starting with /fire/debts)
  await mutate((key) => typeof key === 'string' && key.startsWith('/fire/debts'));
}

export async function mutateUserPreferences() {
  await mutate(SWR_KEYS.userPreferences);
}

export async function mutateRecurringSchedules() {
  await mutate((key) => typeof key === 'string' && key.startsWith('/fire/recurring-schedules'));
}

export async function mutateAllFireData() {
  await Promise.all([
    mutateAssets(),
    mutateFlows(),
    mutateDebts(),
    mutateStats(),
    mutateExpenseStats(),
    mutateRecurringSchedules(),
  ]);
}

// ═══════════════════════════════════════════════════════════════
// Recurring Schedules Hook
// ═══════════════════════════════════════════════════════════════

interface UseRecurringSchedulesReturn {
  schedules: RecurringScheduleWithDetails[];
  total: number;
  isLoading: boolean;
  error: string | null;
  mutate: () => Promise<void>;
}

export function useRecurringSchedules(filters?: RecurringScheduleFilters): UseRecurringSchedulesReturn {
  const swrKey = SWR_KEYS.recurringSchedules(filters);

  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    swrKey,
    async () => {
      const response = await recurringScheduleApi.getAll(filters);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch recurring schedules');
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    schedules: data?.schedules || [],
    total: data?.total || 0,
    isLoading,
    error: error?.message || null,
    mutate: async () => {
      await swrMutate();
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Flow Freedom Hook
// ═══════════════════════════════════════════════════════════════

interface UseFlowFreedomReturn {
  data: FlowFreedomData | null;
  isLoading: boolean;
  error: string | null;
  mutate: () => Promise<void>;
}

export function useFlowFreedom(): UseFlowFreedomReturn {
  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    SWR_KEYS.flowFreedom,
    async () => {
      const response = await flowFreedomApi.get();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch flow freedom data');
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Cache for 30 seconds
    }
  );

  return {
    data: data || null,
    isLoading,
    error: error?.message || null,
    mutate: async () => {
      await swrMutate();
    },
  };
}

export async function mutateFlowFreedom() {
  await mutate(SWR_KEYS.flowFreedom);
}

// ═══════════════════════════════════════════════════════════════
// Runway Hook (AI-powered financial projection)
// With localStorage caching - stale-while-revalidate pattern
// ═══════════════════════════════════════════════════════════════

const RUNWAY_CACHE_KEY = 'firewise_runway_cache';
const RUNWAY_CACHE_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

interface RunwayCacheData {
  data: RunwayData;
  timestamp: number;
}

function getRunwayCache(): RunwayCacheData | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(RUNWAY_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as RunwayCacheData;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function setRunwayCache(data: RunwayData): void {
  if (typeof window === 'undefined') return;
  try {
    const cacheData: RunwayCacheData = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(RUNWAY_CACHE_KEY, JSON.stringify(cacheData));
  } catch {
    // Ignore storage errors
  }
}

function isCacheExpired(cache: RunwayCacheData): boolean {
  const age = Date.now() - cache.timestamp;
  return age >= RUNWAY_CACHE_TTL_MS;
}

interface UseRunwayReturn {
  data: RunwayData | null;
  isLoading: boolean;
  isRefreshing: boolean; // True when fetching new data but have cached data
  error: string | null;
  mutate: () => Promise<void>;
}

export function useRunway(): UseRunwayReturn {
  // Use state to avoid hydration mismatch - only read localStorage after mount
  const [cachedData, setCachedData] = useState<RunwayCacheData | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Read cache after component mounts (client-side only)
  useEffect(() => {
    const cache = getRunwayCache();
    setCachedData(cache);
    setHasMounted(true);
  }, []);

  // Only auto-fetch if no cache or cache is expired (8 hours)
  const hasValidCache = cachedData && !isCacheExpired(cachedData);

  // Get user's timezone for region-specific inflation
  const timezone = typeof window !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : undefined;

  const { data, error, isLoading } = useSWR(
    // Only auto-fetch if: mounted AND no valid cache
    hasMounted && !hasValidCache ? SWR_KEYS.runway : null,
    async () => {
      const response = await runwayApi.get(timezone);
      if (response.success && response.data) {
        // Cache the new data
        setRunwayCache(response.data);
        setCachedData({
          data: response.data,
          timestamp: Date.now(),
        });
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch runway data');
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      revalidateIfStale: false,
    }
  );

  // Manual refresh function - directly calls API
  const manualRefresh = async () => {
    if (!timezone) return;
    setIsManualRefreshing(true);
    try {
      const response = await runwayApi.get(timezone);
      if (response.success && response.data) {
        setRunwayCache(response.data);
        setCachedData({
          data: response.data,
          timestamp: Date.now(),
        });
        // Also update SWR cache
        await mutate(SWR_KEYS.runway, response.data, false);
      }
    } finally {
      setIsManualRefreshing(false);
    }
  };

  // Before mount, always show loading to match server render
  if (!hasMounted) {
    return {
      data: null,
      isLoading: true,
      isRefreshing: false,
      error: null,
      mutate: async () => {},
    };
  }

  // Determine if we're refreshing (auto or manual)
  const isRefreshing = (isLoading || isManualRefreshing) && cachedData !== null;

  return {
    // Prioritize cachedData since manual refresh updates it directly
    data: cachedData?.data || data || null,
    isLoading: (isLoading || isManualRefreshing) && !cachedData,
    isRefreshing,
    error: error?.message || null,
    mutate: manualRefresh,
  };
}

export async function mutateRunway() {
  await mutate(SWR_KEYS.runway);
}
