'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { expenseApi } from '@/lib/api';
import type { Expense } from '@/types';

const PAGE_SIZE = 20;

interface ExpenseFilters {
  category_id?: string;
  payment_method_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export function useExpenses(ledgerId: string | null, filters?: ExpenseFilters) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Serialize filters to compare by value instead of reference
  const filtersKey = JSON.stringify(filters || {});
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchExpenses = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (!ledgerId) return;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const limit = filtersRef.current?.limit || PAGE_SIZE;
      const response = await expenseApi.getAll(ledgerId, {
        ...filtersRef.current,
        page: pageNum,
        limit,
      });

      if (response.success && response.data) {
        const newExpenses = response.data.expenses;

        if (append) {
          setExpenses((prev) => [...prev, ...newExpenses]);
        } else {
          setExpenses(newExpenses);
        }

        setTotal(response.data.total);
        setPage(pageNum);

        // Check if there are more items to load
        const totalLoaded = append
          ? expenses.length + newExpenses.length
          : newExpenses.length;
        setHasMore(totalLoaded < response.data.total);
      } else {
        setError(response.error || 'Failed to fetch expenses');
      }
    } catch {
      setError('Failed to fetch expenses');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [ledgerId, filtersKey, expenses.length]);

  // Reset and fetch when ledgerId or filters change
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setExpenses([]);
    fetchExpenses(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerId, filtersKey]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchExpenses(page + 1, true);
    }
  }, [fetchExpenses, page, loadingMore, hasMore]);

  const refetch = useCallback(() => {
    setPage(1);
    setHasMore(true);
    return fetchExpenses(1, false);
  }, [fetchExpenses]);

  const createExpense = async (
    data: {
      name: string;
      amount: number;
      currency_id: string;
      category_id?: string;
      description?: string;
      payment_method_id?: string;
      date?: string;
    },
    options?: { skipRefetch?: boolean }
  ) => {
    if (!ledgerId) throw new Error('No ledger selected');
    const response = await expenseApi.create(ledgerId, data);
    if (response.success && response.data) {
      if (!options?.skipRefetch) {
        await refetch();
      }
      return response.data;
    }
    throw new Error(response.error || 'Failed to create expense');
  };

  const updateExpense = async (
    id: string,
    data: Partial<{
      name: string;
      amount: number;
      currency_id: string;
      category_id: string | null;
      description: string | null;
      payment_method_id: string | null;
      date: string;
    }>
  ) => {
    if (!ledgerId) throw new Error('No ledger selected');
    const response = await expenseApi.update(ledgerId, id, data);
    if (response.success && response.data) {
      // Update the expense in place without refetching
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...response.data } : e))
      );
      return response.data;
    }
    throw new Error(response.error || 'Failed to update expense');
  };

  const deleteExpense = async (id: string) => {
    if (!ledgerId) throw new Error('No ledger selected');
    const response = await expenseApi.delete(ledgerId, id);
    if (response.success) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      setTotal((prev) => prev - 1);
      return true;
    }
    throw new Error(response.error || 'Failed to delete expense');
  };

  return {
    expenses,
    total,
    loading,
    loadingMore,
    error,
    hasMore,
    refetch,
    loadMore,
    createExpense,
    updateExpense,
    deleteExpense,
  };
}
