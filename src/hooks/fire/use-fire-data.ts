'use client';

import useSWR, { mutate } from 'swr';
import {
  assetApi,
  flowApi,
  flowExpenseCategoryApi,
  fireLinkedLedgerApi,
  fireExpenseStatsApi,
  stockPriceApi,
  getLedgersForLinking,
} from '@/lib/fire/api';
import type {
  Asset,
  FlowWithDetails,
  FlowFilters,
  FlowStats,
  FlowExpenseCategory,
  ExpenseStats,
} from '@/types/fire';
import type { StockPrice } from '@/lib/fire/api';

import type { Ledger } from '@/types';

// SWR Keys
const SWR_KEYS = {
  assets: '/fire/assets',
  flows: (filters?: FlowFilters) => ['/fire/flows', filters],
  stats: (filters?: { start_date?: string; end_date?: string }) => ['/fire/stats', filters],
  expenseCategories: '/fire/expense-categories',
  linkedLedgers: '/fire/linked-ledgers',
  ledgersForLinking: '/fire/ledgers-for-linking',
  expenseStats: '/fire/expense-stats',
  stockPrices: (symbols: string[]) => ['/fire/stock-prices', symbols.join(',')],
};

// ═══════════════════════════════════════════════════════════════
// Assets Hook
// ═══════════════════════════════════════════════════════════════

interface UseAssetsReturn {
  assets: Asset[];
  isLoading: boolean;
  error: string | null;
  mutate: () => Promise<void>;
}

export function useAssets(): UseAssetsReturn {
  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    SWR_KEYS.assets,
    async () => {
      const response = await assetApi.getAll({ limit: 100 });
      if (response.success && response.data) {
        // Deduplicate assets by id
        return response.data.assets.filter(
          (asset, index, self) => self.findIndex((a) => a.id === asset.id) === index
        );
      }
      throw new Error(response.error || 'Failed to fetch assets');
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    assets: data || [],
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
  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    SWR_KEYS.flows(filters),
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

export function useExpenseStats(): UseExpenseStatsReturn {
  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    SWR_KEYS.expenseStats,
    async () => {
      const response = await fireExpenseStatsApi.get();
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
// Mutation helpers (for optimistic updates)
// ═══════════════════════════════════════════════════════════════

export async function mutateAssets() {
  await mutate(SWR_KEYS.assets);
}

export async function mutateFlows() {
  // Mutate all flows queries
  await mutate((key) => Array.isArray(key) && key[0] === '/fire/flows');
}

export async function mutateStats() {
  await mutate((key) => Array.isArray(key) && key[0] === '/fire/stats');
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

export async function mutateAllFireData() {
  await Promise.all([
    mutateAssets(),
    mutateFlows(),
    mutateStats(),
    mutateExpenseStats(),
  ]);
}
