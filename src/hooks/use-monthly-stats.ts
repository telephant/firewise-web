'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { statsApi } from '@/lib/api';
import type { MonthlyStats } from '@/types';

interface MonthlyStatsFilters {
  currency_id?: string;
  months?: number;
}

export function useMonthlyStats(ledgerId: string | null, filters?: MonthlyStatsFilters) {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Serialize filters to compare by value instead of reference
  const filtersKey = JSON.stringify(filters || {});
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchMonthlyStats = useCallback(async () => {
    if (!ledgerId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await statsApi.getMonthlyStats(ledgerId, filtersRef.current);

      if (response.success && response.data) {
        setMonthlyStats(response.data);
      } else {
        setError(response.error || 'Failed to fetch monthly stats');
      }
    } catch {
      setError('Failed to fetch monthly stats');
    } finally {
      setLoading(false);
    }
  }, [ledgerId, filtersKey]);

  // Fetch when ledgerId or filters change
  useEffect(() => {
    fetchMonthlyStats();
  }, [fetchMonthlyStats]);

  const refetch = useCallback(() => {
    return fetchMonthlyStats();
  }, [fetchMonthlyStats]);

  return {
    monthlyStats,
    loading,
    error,
    refetch,
  };
}
