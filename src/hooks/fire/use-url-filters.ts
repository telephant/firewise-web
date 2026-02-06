'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface UseUrlFiltersOptions<T extends string> {
  validTypes?: T[];
  defaultType?: T | 'all';
  defaultPage?: number;
}

interface UrlFilters<T extends string> {
  type: T | 'all';
  search: string;
  page: number;
  tab?: string;
}

interface UseUrlFiltersReturn<T extends string> {
  filters: UrlFilters<T>;
  setType: (type: T | 'all') => void;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  setTab: (tab: string) => void;
  updateFilters: (params: Partial<UrlFilters<T>>) => void;
  clearFilters: () => void;
}

export function useUrlFilters<T extends string>(
  options: UseUrlFiltersOptions<T> = {}
): UseUrlFiltersReturn<T> {
  const { validTypes = [], defaultType = 'all', defaultPage = 1 } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read filters from URL
  const filters = useMemo(() => {
    const typeFromUrl = searchParams.get('type') as T | null;
    const searchFromUrl = searchParams.get('search') || '';
    const pageFromUrl = parseInt(searchParams.get('page') || '1', 10);
    const tabFromUrl = searchParams.get('tab') || undefined;

    // Validate type
    const isValidType = typeFromUrl && validTypes.length > 0
      ? validTypes.includes(typeFromUrl)
      : true;

    return {
      type: (isValidType && typeFromUrl ? typeFromUrl : defaultType) as T | 'all',
      search: searchFromUrl,
      page: pageFromUrl > 0 ? pageFromUrl : defaultPage,
      tab: tabFromUrl,
    };
  }, [searchParams, validTypes, defaultType, defaultPage]);

  // Update URL with new params
  const updateFilters = useCallback((params: Partial<UrlFilters<T>>) => {
    const newParams = new URLSearchParams(searchParams.toString());

    // Update type
    if (params.type !== undefined) {
      if (params.type === 'all') {
        newParams.delete('type');
      } else {
        newParams.set('type', params.type);
      }
      // Reset page when type changes
      if (params.page === undefined) {
        newParams.delete('page');
      }
    }

    // Update search
    if (params.search !== undefined) {
      if (params.search === '') {
        newParams.delete('search');
      } else {
        newParams.set('search', params.search);
      }
      // Reset page when search changes
      if (params.page === undefined) {
        newParams.delete('page');
      }
    }

    // Update page
    if (params.page !== undefined) {
      if (params.page <= 1) {
        newParams.delete('page');
      } else {
        newParams.set('page', params.page.toString());
      }
    }

    // Update tab
    if (params.tab !== undefined) {
      if (params.tab === '') {
        newParams.delete('tab');
      } else {
        newParams.set('tab', params.tab);
      }
    }

    const queryString = newParams.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  // Individual setters
  const setType = useCallback((type: T | 'all') => {
    updateFilters({ type });
  }, [updateFilters]);

  const setSearch = useCallback((search: string) => {
    updateFilters({ search });
  }, [updateFilters]);

  const setPage = useCallback((page: number) => {
    updateFilters({ page });
  }, [updateFilters]);

  const setTab = useCallback((tab: string) => {
    updateFilters({ tab });
  }, [updateFilters]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  return {
    filters,
    setType,
    setSearch,
    setPage,
    setTab,
    updateFilters,
    clearFilters,
  };
}
