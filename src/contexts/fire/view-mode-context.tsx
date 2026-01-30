'use client';

import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { familyApi } from '@/lib/fire/family-api';
import type { Family, ViewMode } from '@/types/family';

const VIEW_MODE_STORAGE_KEY = 'firewise_view_mode';

interface ViewModeContextValue {
  // Current view mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Family data
  family: Family | null;
  familyId: string | null;
  isInFamily: boolean;
  isLoading: boolean;
  error: Error | null;

  // Actions
  refreshFamily: () => Promise<void>;
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

// SWR fetcher for family
const familyFetcher = async () => {
  const response = await familyApi.getMyFamily();
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch family');
  }
  return response.data || null;
};

interface ViewModeProviderProps {
  children: React.ReactNode;
}

export function ViewModeProvider({ children }: ViewModeProviderProps) {
  // View mode state - default to 'personal' until we know if user is in a family
  const [viewMode, setViewModeState] = useState<ViewMode>('personal');
  const [hasMounted, setHasMounted] = useState(false);

  // Fetch family data
  const { data: family, error, isLoading, mutate } = useSWR<Family | null>(
    'user-family',
    familyFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
    }
  );

  const isInFamily = !!family;
  const familyId = family?.id || null;

  // Load saved view mode from localStorage on mount
  useEffect(() => {
    setHasMounted(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode | null;
      if (saved === 'family' || saved === 'personal') {
        setViewModeState(saved);
      }
    }
  }, []);

  // When family data loads, validate current view mode
  useEffect(() => {
    if (!isLoading && hasMounted) {
      // If user is not in a family, force personal mode
      if (!isInFamily && viewMode === 'family') {
        setViewModeState('personal');
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, 'personal');
      }
      // If user is in a family and no saved preference, default to family mode
      else if (isInFamily && !localStorage.getItem(VIEW_MODE_STORAGE_KEY)) {
        setViewModeState('family');
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, 'family');
      }
    }
  }, [isLoading, isInFamily, hasMounted, viewMode]);

  // Set view mode with persistence and data refresh
  const setViewMode = useCallback((mode: ViewMode) => {
    // Can't set family mode if not in a family
    if (mode === 'family' && !isInFamily) {
      return;
    }

    setViewModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    }

    // Invalidate all SWR caches to refetch with new view mode
    // This triggers a refresh of all fire data with the new X-View-Mode header
    globalMutate(
      (key) => typeof key === 'string' && key.startsWith('/fire/'),
      undefined,
      { revalidate: true }
    );
  }, [isInFamily]);

  const refreshFamily = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const value = useMemo<ViewModeContextValue>(() => ({
    viewMode,
    setViewMode,
    family: family || null,
    familyId,
    isInFamily,
    isLoading,
    error: error || null,
    refreshFamily,
  }), [viewMode, setViewMode, family, familyId, isInFamily, isLoading, error, refreshFamily]);

  return (
    <ViewModeContext.Provider value={value}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}

// Safe version that returns null if not in provider (useful for optional components)
export function useViewModeSafe() {
  return useContext(ViewModeContext);
}

// Export a function to get the current view mode for use in API calls
// This reads directly from localStorage for use outside of React components
export function getCurrentViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'personal';
  const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode | null;
  return saved === 'family' ? 'family' : 'personal';
}
