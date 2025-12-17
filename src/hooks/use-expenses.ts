'use client';

import { useState, useEffect, useCallback } from 'react';
import { expenseApi, categoryApi, currencyApi, paymentMethodApi } from '@/lib/api';
import type { Expense, ExpenseCategory, Currency, PaymentMethod } from '@/types';

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

  const fetchExpenses = useCallback(async () => {
    if (!ledgerId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await expenseApi.getAll(ledgerId, filters);
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
  }, [ledgerId, filters]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const createExpense = async (data: {
    name: string;
    amount: number;
    currency_id: string;
    category_id?: string;
    description?: string;
    payment_method_id?: string;
    date?: string;
  }) => {
    if (!ledgerId) throw new Error('No ledger selected');
    const response = await expenseApi.create(ledgerId, data);
    if (response.success && response.data) {
      await fetchExpenses();
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

export function useCategories() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await categoryApi.getAll();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (name: string) => {
    const response = await categoryApi.create(name);
    if (response.success && response.data) {
      setCategories((prev) => [...prev, response.data!]);
      return response.data;
    }
    throw new Error(response.error || 'Failed to create category');
  };

  const deleteCategory = async (id: string) => {
    const response = await categoryApi.delete(id);
    if (response.success) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      return true;
    }
    throw new Error(response.error || 'Failed to delete category');
  };

  return {
    categories,
    loading,
    refetch: fetchCategories,
    createCategory,
    deleteCategory,
  };
}

export function useCurrencies() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCurrencies = useCallback(async () => {
    setLoading(true);
    try {
      const response = await currencyApi.getAll();
      if (response.success && response.data) {
        setCurrencies(response.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  const createCurrency = async (data: { code: string; name: string; rate: number }) => {
    const response = await currencyApi.create(data);
    if (response.success && response.data) {
      setCurrencies((prev) => [...prev, response.data!]);
      return response.data;
    }
    throw new Error(response.error || 'Failed to create currency');
  };

  return {
    currencies,
    loading,
    refetch: fetchCurrencies,
    createCurrency,
  };
}

export function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPaymentMethods = useCallback(async () => {
    setLoading(true);
    try {
      const response = await paymentMethodApi.getAll();
      if (response.success && response.data) {
        setPaymentMethods(response.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const createPaymentMethod = async (data: { name: string; description?: string }) => {
    const response = await paymentMethodApi.create(data);
    if (response.success && response.data) {
      setPaymentMethods((prev) => [...prev, response.data!]);
      return response.data;
    }
    throw new Error(response.error || 'Failed to create payment method');
  };

  const deletePaymentMethod = async (id: string) => {
    const response = await paymentMethodApi.delete(id);
    if (response.success) {
      setPaymentMethods((prev) => prev.filter((p) => p.id !== id));
      return true;
    }
    throw new Error(response.error || 'Failed to delete payment method');
  };

  return {
    paymentMethods,
    loading,
    refetch: fetchPaymentMethods,
    createPaymentMethod,
    deletePaymentMethod,
  };
}
