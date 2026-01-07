'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { assetApi } from '@/lib/fire/api';
import type { AssetWithBalance, AssetFilters } from '@/types/fire';

interface UseAssetsOptions {
  filters?: AssetFilters;
  autoFetch?: boolean;
}

interface UseAssetsReturn {
  assets: AssetWithBalance[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAssets(options: UseAssetsOptions = {}): UseAssetsReturn {
  const { filters, autoFetch = true } = options;
  const [assets, setAssets] = useState<AssetWithBalance[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchAssets = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const response = await assetApi.getAll(filters);

      // Ignore stale responses
      if (currentRequestId !== requestIdRef.current) return;

      if (response.success && response.data) {
        setAssets(response.data.assets);
        setTotal(response.data.total);
      } else {
        setError(response.error || 'Failed to fetch assets');
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        setError('Failed to fetch assets');
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    if (autoFetch) {
      fetchAssets();
    }
  }, [fetchAssets, autoFetch]);

  return {
    assets,
    total,
    loading,
    error,
    refetch: fetchAssets,
  };
}
