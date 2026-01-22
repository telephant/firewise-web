'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { toast } from 'sonner';
import {
  useAssets,
  useExpenseCategories,
  useLinkedLedgers,
  mutateAssets,
  mutateFlows,
  mutateStats,
  mutateExpenseCategories,
  mutateLinkedLedgers,
  mutateExpenseStats,
} from '@/hooks/fire';
import { flowApi, assetApi, fireLinkedLedgerApi, flowExpenseCategoryApi } from '@/lib/fire/api';
import type {
  Asset,
  CreateFlowData,
  UpdateFlowData,
  CreateAssetData,
  LinkedLedger,
  FlowExpenseCategory,
} from '@/types/fire';

// Context provides mutations and shared data (assets, categories, linked ledgers)
// Components should use useFlows/useFlowStats hooks directly with their own filters
// SWR handles caching per unique filter combination
interface FlowDataContextValue {
  // Flow mutations (data fetched via useFlows hook directly in components)
  createFlow: (data: CreateFlowData) => Promise<boolean>;
  updateFlow: (id: string, data: UpdateFlowData) => Promise<boolean>;
  deleteFlow: (id: string) => Promise<boolean>;

  // Assets (shared across components)
  assets: Asset[];
  assetsLoading: boolean;
  refetchAssets: () => Promise<void>;
  createAsset: (data: CreateAssetData) => Promise<Asset | null>;

  // Linked Ledgers
  linkedLedgers: LinkedLedger[];
  linkedLedgersLoading: boolean;
  refetchLinkedLedgers: () => Promise<void>;
  setLinkedLedgers: (ledgerIds: string[]) => Promise<boolean>;

  // Expense Categories
  expenseCategories: FlowExpenseCategory[];
  expenseCategoriesLoading: boolean;
  refetchExpenseCategories: () => Promise<void>;
  createExpenseCategory: (name: string) => Promise<FlowExpenseCategory | null>;
}

const FlowDataContext = createContext<FlowDataContextValue | undefined>(undefined);

export function FlowDataProvider({ children }: { children: React.ReactNode }) {
  // SWR hooks for shared data (assets, categories, linked ledgers)
  // Flows and stats are fetched directly by components with their own filters
  const {
    assets,
    isLoading: assetsLoading,
    mutate: refetchAssets,
  } = useAssets();

  const {
    categories: expenseCategories,
    isLoading: expenseCategoriesLoading,
    mutate: refetchExpenseCategories,
  } = useExpenseCategories();

  const {
    linkedLedgers,
    isLoading: linkedLedgersLoading,
    mutate: refetchLinkedLedgers,
  } = useLinkedLedgers();

  // Create flow
  const createFlow = useCallback(async (data: CreateFlowData): Promise<boolean> => {
    try {
      const response = await flowApi.create(data);
      if (response.success) {
        // Revalidate all flow-related caches (SWR will refetch each unique key)
        await Promise.all([
          mutateFlows(),
          mutateStats(),
          mutateExpenseStats(),
        ]);
        // Remind user to adjust account balance if flow involves assets
        if (data.from_asset_id || data.to_asset_id) {
          toast.info('Remember to adjust your account balance if needed', { duration: 4000 });
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Update flow
  const updateFlow = useCallback(async (id: string, data: UpdateFlowData): Promise<boolean> => {
    try {
      const response = await flowApi.update(id, data);
      if (response.success) {
        await Promise.all([mutateFlows(), mutateStats(), mutateExpenseStats()]);
        // Remind user to adjust account balance if flow involves assets
        if (data.from_asset_id || data.to_asset_id) {
          toast.info('Remember to adjust your account balance if needed', { duration: 4000 });
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Delete flow
  const deleteFlow = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await flowApi.delete(id);
      if (response.success) {
        await Promise.all([mutateFlows(), mutateStats(), mutateExpenseStats()]);
        toast.info('Remember to adjust your account balance if needed', { duration: 4000 });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Create asset
  const createAsset = useCallback(async (data: CreateAssetData): Promise<Asset | null> => {
    try {
      const response = await assetApi.create(data);
      if (response.success && response.data) {
        await mutateAssets();
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Set linked ledgers
  const setLinkedLedgers = useCallback(async (ledgerIds: string[]): Promise<boolean> => {
    try {
      const response = await fireLinkedLedgerApi.set(ledgerIds);
      if (response.success) {
        await mutateLinkedLedgers();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Create expense category
  const createExpenseCategory = useCallback(async (name: string): Promise<FlowExpenseCategory | null> => {
    try {
      const response = await flowExpenseCategoryApi.create({ name });
      if (response.success && response.data) {
        await mutateExpenseCategories();
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const value: FlowDataContextValue = {
    createFlow,
    updateFlow,
    deleteFlow,
    assets,
    assetsLoading,
    refetchAssets,
    createAsset,
    linkedLedgers,
    linkedLedgersLoading,
    refetchLinkedLedgers,
    setLinkedLedgers,
    expenseCategories,
    expenseCategoriesLoading,
    refetchExpenseCategories,
    createExpenseCategory,
  };

  return (
    <FlowDataContext.Provider value={value}>
      {children}
    </FlowDataContext.Provider>
  );
}

export function useFlowData(): FlowDataContextValue {
  const context = useContext(FlowDataContext);
  if (context === undefined) {
    throw new Error('useFlowData must be used within a FlowDataProvider');
  }
  return context;
}
