'use client';

import React, { createContext, useContext, useCallback } from 'react';
import {
  useAssets,
  useFlows,
  useFlowStats,
  useExpenseCategories,
  useLinkedLedgers,
  mutateAssets,
  mutateFlows,
  mutateStats,
  mutateExpenseCategories,
  mutateLinkedLedgers,
} from '@/hooks/fire';
import { flowApi, assetApi, fireLinkedLedgerApi, flowExpenseCategoryApi } from '@/lib/fire/api';
import type {
  FlowWithDetails,
  FlowFilters,
  FlowStats,
  Asset,
  CreateFlowData,
  UpdateFlowData,
  CreateAssetData,
  LinkedLedger,
  FlowExpenseCategory,
} from '@/types/fire';

interface FlowDataContextValue {
  // Flows
  flows: FlowWithDetails[];
  flowsTotal: number;
  flowsLoading: boolean;
  flowsError: string | null;
  refetchFlows: () => Promise<void>;
  createFlow: (data: CreateFlowData) => Promise<boolean>;
  updateFlow: (id: string, data: UpdateFlowData) => Promise<boolean>;
  deleteFlow: (id: string) => Promise<boolean>;

  // Stats
  stats: FlowStats | null;
  statsLoading: boolean;
  refetchStats: () => Promise<void>;

  // Assets
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
  // SWR hooks for data fetching
  const {
    assets,
    isLoading: assetsLoading,
    mutate: refetchAssets,
  } = useAssets();

  const {
    flows,
    total: flowsTotal,
    isLoading: flowsLoading,
    error: flowsError,
    mutate: refetchFlows,
  } = useFlows();

  const {
    stats,
    isLoading: statsLoading,
    mutate: refetchStats,
  } = useFlowStats();

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
        // Revalidate related data
        await Promise.all([
          mutateFlows(),
          mutateStats(),
          data.from_asset_id || data.to_asset_id ? mutateAssets() : Promise.resolve(),
        ]);
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
        await Promise.all([mutateFlows(), mutateStats(), mutateAssets()]);
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
        await Promise.all([mutateFlows(), mutateStats(), mutateAssets()]);
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
    flows,
    flowsTotal,
    flowsLoading,
    flowsError,
    refetchFlows,
    createFlow,
    updateFlow,
    deleteFlow,
    stats,
    statsLoading,
    refetchStats,
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
