'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { categoryApi, currencyApi, paymentMethodApi } from '@/lib/api';
import type { ExpenseCategory, Currency, PaymentMethod } from '@/types';

interface ExpenseDataContextType {
  categories: ExpenseCategory[];
  currencies: Currency[];
  paymentMethods: PaymentMethod[];
  loading: boolean;
  createCategory: (name: string) => Promise<ExpenseCategory>;
  createCurrency: (data: { code: string; name: string; rate: number }) => Promise<Currency>;
  createPaymentMethod: (data: { name: string; description?: string }) => Promise<PaymentMethod>;
  deleteCategory: (id: string) => Promise<boolean>;
  deleteCurrency: (id: string) => Promise<boolean>;
  deletePaymentMethod: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const ExpenseDataContext = createContext<ExpenseDataContextType | null>(null);

interface ExpenseDataProviderProps {
  children: ReactNode;
  ledgerId: string;
}

export function ExpenseDataProvider({ children, ledgerId }: ExpenseDataProviderProps) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  // Use ref to track current ledgerId for callbacks
  const ledgerIdRef = useRef(ledgerId);
  ledgerIdRef.current = ledgerId;

  const fetchAll = useCallback(async () => {
    const currentLedgerId = ledgerIdRef.current;
    setLoading(true);
    try {
      const [categoriesRes, currenciesRes, paymentMethodsRes] = await Promise.all([
        categoryApi.getAll(currentLedgerId),
        currencyApi.getAll(currentLedgerId),
        paymentMethodApi.getAll(currentLedgerId),
      ]);

      if (categoriesRes.success && categoriesRes.data) {
        setCategories(categoriesRes.data);
      }
      if (currenciesRes.success && currenciesRes.data) {
        setCurrencies(currenciesRes.data);
      }
      if (paymentMethodsRes.success && paymentMethodsRes.data) {
        setPaymentMethods(paymentMethodsRes.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch when ledgerId changes
  useEffect(() => {
    fetchAll();
  }, [ledgerId, fetchAll]);

  // Refresh data when window regains focus (sync with changes from other tabs/users)
  useEffect(() => {
    const handleFocus = () => {
      fetchAll();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchAll]);

  const refetchCategories = useCallback(async () => {
    const response = await categoryApi.getAll(ledgerIdRef.current);
    if (response.success && response.data) {
      setCategories(response.data);
    }
  }, []);

  const refetchCurrencies = useCallback(async () => {
    const response = await currencyApi.getAll(ledgerIdRef.current);
    if (response.success && response.data) {
      setCurrencies(response.data);
    }
  }, []);

  const refetchPaymentMethods = useCallback(async () => {
    const response = await paymentMethodApi.getAll(ledgerIdRef.current);
    if (response.success && response.data) {
      setPaymentMethods(response.data);
    }
  }, []);

  const createCategory = async (name: string) => {
    const response = await categoryApi.create(ledgerIdRef.current, name);
    if (response.success && response.data) {
      await refetchCategories();
      return response.data;
    }
    throw new Error(response.error || 'Failed to create category');
  };

  const createCurrency = async (data: { code: string; name: string; rate: number }) => {
    const response = await currencyApi.create(ledgerIdRef.current, data);
    if (response.success && response.data) {
      await refetchCurrencies();
      return response.data;
    }
    throw new Error(response.error || 'Failed to create currency');
  };

  const createPaymentMethod = async (data: { name: string; description?: string }) => {
    const response = await paymentMethodApi.create(ledgerIdRef.current, data);
    if (response.success && response.data) {
      await refetchPaymentMethods();
      return response.data;
    }
    throw new Error(response.error || 'Failed to create payment method');
  };

  const deleteCategory = async (id: string) => {
    const response = await categoryApi.delete(ledgerIdRef.current, id);
    if (response.success) {
      await refetchCategories();
      return true;
    }
    throw new Error(response.error || 'Failed to delete category');
  };

  const deleteCurrency = async (id: string) => {
    const response = await currencyApi.delete(ledgerIdRef.current, id);
    if (response.success) {
      await refetchCurrencies();
      return true;
    }
    throw new Error(response.error || 'Failed to delete currency');
  };

  const deletePaymentMethod = async (id: string) => {
    const response = await paymentMethodApi.delete(ledgerIdRef.current, id);
    if (response.success) {
      await refetchPaymentMethods();
      return true;
    }
    throw new Error(response.error || 'Failed to delete payment method');
  };

  return (
    <ExpenseDataContext.Provider
      value={{
        categories,
        currencies,
        paymentMethods,
        loading,
        createCategory,
        createCurrency,
        createPaymentMethod,
        deleteCategory,
        deleteCurrency,
        deletePaymentMethod,
        refetch: fetchAll,
      }}
    >
      {children}
    </ExpenseDataContext.Provider>
  );
}

export function useExpenseData() {
  const context = useContext(ExpenseDataContext);
  if (!context) {
    throw new Error('useExpenseData must be used within an ExpenseDataProvider');
  }
  return context;
}
