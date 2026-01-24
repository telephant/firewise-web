'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { financialStatsApi, FinancialStats } from '@/lib/fire/api';

interface FinancialStatsContextValue {
  stats: FinancialStats | null;
  isLoading: boolean;
  error: Error | null;
  refresh: (force?: boolean) => Promise<void>;
  clearCache: () => Promise<void>;
}

const FinancialStatsContext = createContext<FinancialStatsContextValue | null>(null);

// SWR fetcher
const fetcher = async () => {
  const response = await financialStatsApi.get();
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch financial stats');
  }
  return response.data;
};

interface FinancialStatsProviderProps {
  children: React.ReactNode;
}

export function FinancialStatsProvider({ children }: FinancialStatsProviderProps) {
  const { data, error, isLoading, mutate } = useSWR<FinancialStats>(
    'financial-stats',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute deduplication
    }
  );

  const refresh = useCallback(async (force = false) => {
    if (force) {
      // Force refresh from server
      await financialStatsApi.clearCache();
    }
    await mutate();
  }, [mutate]);

  const clearCache = useCallback(async () => {
    await financialStatsApi.clearCache();
    await mutate();
  }, [mutate]);

  const value = useMemo<FinancialStatsContextValue>(() => ({
    stats: data || null,
    isLoading,
    error: error || null,
    refresh,
    clearCache,
  }), [data, isLoading, error, refresh, clearCache]);

  return (
    <FinancialStatsContext.Provider value={value}>
      {children}
    </FinancialStatsContext.Provider>
  );
}

export function useFinancialStats() {
  const context = useContext(FinancialStatsContext);
  if (!context) {
    throw new Error('useFinancialStats must be used within a FinancialStatsProvider');
  }
  return context;
}
