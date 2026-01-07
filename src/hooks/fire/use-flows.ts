'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { flowApi } from '@/lib/fire/api';
import type { FlowWithDetails, FlowFilters, FlowStats } from '@/types/fire';

interface UseFlowsOptions {
  filters?: FlowFilters;
  autoFetch?: boolean;
}

interface UseFlowsReturn {
  flows: FlowWithDetails[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFlows(options: UseFlowsOptions = {}): UseFlowsReturn {
  const { filters, autoFetch = true } = options;
  const [flows, setFlows] = useState<FlowWithDetails[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchFlows = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const response = await flowApi.getAll(filters);

      // Ignore stale responses
      if (currentRequestId !== requestIdRef.current) return;

      if (response.success && response.data) {
        setFlows(response.data.flows);
        setTotal(response.data.total);
      } else {
        setError(response.error || 'Failed to fetch flows');
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        setError('Failed to fetch flows');
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    if (autoFetch) {
      fetchFlows();
    }
  }, [fetchFlows, autoFetch]);

  return {
    flows,
    total,
    loading,
    error,
    refetch: fetchFlows,
  };
}

interface UseFlowStatsOptions {
  start_date?: string;
  end_date?: string;
  currency?: string;
  autoFetch?: boolean;
}

interface UseFlowStatsReturn {
  stats: FlowStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFlowStats(options: UseFlowStatsOptions = {}): UseFlowStatsReturn {
  const { start_date, end_date, currency, autoFetch = true } = options;
  const [stats, setStats] = useState<FlowStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchStats = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const response = await flowApi.getStats({ start_date, end_date, currency });

      // Ignore stale responses
      if (currentRequestId !== requestIdRef.current) return;

      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.error || 'Failed to fetch flow stats');
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        setError('Failed to fetch flow stats');
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [start_date, end_date, currency]);

  useEffect(() => {
    if (autoFetch) {
      fetchStats();
    }
  }, [fetchStats, autoFetch]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
