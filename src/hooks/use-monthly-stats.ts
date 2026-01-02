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

  // Track the current request to handle race conditions
  const requestIdRef = useRef(0);

  // Fetch when ledgerId or filters change
  useEffect(() => {
    if (!ledgerId) return;

    // Increment request ID to track this specific request
    const currentRequestId = ++requestIdRef.current;

    const fetchMonthlyStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await statsApi.getMonthlyStats(ledgerId, filters);

        // Only update state if this is still the latest request
        if (currentRequestId !== requestIdRef.current) return;

        if (response.success && response.data) {
          setMonthlyStats(response.data);
        } else {
          setError(response.error || 'Failed to fetch monthly stats');
        }
      } catch {
        // Only update error if this is still the latest request
        if (currentRequestId !== requestIdRef.current) return;
        setError('Failed to fetch monthly stats');
      } finally {
        // Only update loading if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    fetchMonthlyStats();
  }, [ledgerId, filtersKey, filters]);

  const refetch = useCallback(() => {
    if (!ledgerId) return;

    const currentRequestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);

    statsApi.getMonthlyStats(ledgerId, filters).then((response) => {
      if (currentRequestId !== requestIdRef.current) return;

      if (response.success && response.data) {
        setMonthlyStats(response.data);
      } else {
        setError(response.error || 'Failed to fetch monthly stats');
      }
      setLoading(false);
    }).catch(() => {
      if (currentRequestId !== requestIdRef.current) return;
      setError('Failed to fetch monthly stats');
      setLoading(false);
    });
  }, [ledgerId, filters]);

  return {
    monthlyStats,
    loading,
    error,
    refetch,
  };
}
