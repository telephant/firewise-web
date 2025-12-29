'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { statsApi } from '@/lib/api';
import type { ExpenseStats } from '@/types';

interface StatsFilters {
  start_date?: string;
  end_date?: string;
  currency_id?: string;
}

export function useExpenseStats(ledgerId: string | null, filters?: StatsFilters) {
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Serialize filters to compare by value instead of reference
  const filtersKey = JSON.stringify(filters || {});
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchStats = useCallback(async () => {
    if (!ledgerId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await statsApi.getExpenseStats(ledgerId, filtersRef.current);

      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.error || 'Failed to fetch stats');
      }
    } catch {
      setError('Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, [ledgerId, filtersKey]);

  // Fetch when ledgerId or filters change
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const refetch = useCallback(() => {
    return fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch,
  };
}
