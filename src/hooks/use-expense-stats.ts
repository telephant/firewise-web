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

  // Track the current request to handle race conditions
  const requestIdRef = useRef(0);

  // Fetch when ledgerId or filters change
  useEffect(() => {
    if (!ledgerId) return;

    // Increment request ID to track this specific request
    const currentRequestId = ++requestIdRef.current;

    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await statsApi.getExpenseStats(ledgerId, filters);

        // Only update state if this is still the latest request
        if (currentRequestId !== requestIdRef.current) return;

        if (response.success && response.data) {
          setStats(response.data);
        } else {
          setError(response.error || 'Failed to fetch stats');
        }
      } catch {
        // Only update error if this is still the latest request
        if (currentRequestId !== requestIdRef.current) return;
        setError('Failed to fetch stats');
      } finally {
        // Only update loading if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    fetchStats();
  }, [ledgerId, filtersKey, filters]);

  const refetch = useCallback(() => {
    if (!ledgerId) return;

    const currentRequestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);

    statsApi.getExpenseStats(ledgerId, filters).then((response) => {
      if (currentRequestId !== requestIdRef.current) return;

      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.error || 'Failed to fetch stats');
      }
      setLoading(false);
    }).catch(() => {
      if (currentRequestId !== requestIdRef.current) return;
      setError('Failed to fetch stats');
      setLoading(false);
    });
  }, [ledgerId, filters]);

  return {
    stats,
    loading,
    error,
    refetch,
  };
}
