'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { expenseApi } from '@/lib/api';
import type { Expense } from '@/types';

interface ExpenseFilters {
  page?: number;
  limit?: number;
  category_id?: string;
  payment_method_id?: string;
  start_date?: string;
  end_date?: string;
}

export function useExpenses(ledgerId: string | null, filters?: ExpenseFilters) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Serialize filters to compare by value instead of reference
  const filtersKey = JSON.stringify(filters || {});
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchExpenses = useCallback(async () => {
    if (!ledgerId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await expenseApi.getAll(ledgerId, filtersRef.current);
      if (response.success && response.data) {
        setExpenses(response.data.expenses);
        setTotal(response.data.total);
      } else {
        setError(response.error || 'Failed to fetch expenses');
      }
    } catch {
      setError('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  }, [ledgerId, filtersKey]);

  useEffect(() => {
    fetchExpenses();
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
        await fetchExpenses();
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
      await fetchExpenses();
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
    error,
    refetch: fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
  };
}
