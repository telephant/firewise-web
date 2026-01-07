'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { categoryApi, currencyApi, paymentMethodApi } from '@/lib/api';
import type { ExpenseCategory, Currency, PaymentMethod } from '@/types';

type ChangeListener = () => void;

interface ExpenseDataContextType {
  categories: ExpenseCategory[];
  currencies: Currency[];
  paymentMethods: PaymentMethod[];
  loading: boolean;
  createCategory: (name: string) => Promise<ExpenseCategory>;
  updateCategory: (id: string, name: string) => Promise<ExpenseCategory>;
  createCurrency: (data: { code: string; name: string }) => Promise<Currency>;
  updateCurrency: (id: string, data: { code?: string; name?: string }) => Promise<Currency>;
  createPaymentMethod: (data: { name: string; description?: string }) => Promise<PaymentMethod>;
  updatePaymentMethod: (id: string, data: { name?: string; description?: string }) => Promise<PaymentMethod>;
  deleteCategory: (id: string) => Promise<boolean>;
  getCategoryUsageCount: (id: string) => Promise<number>;
  deleteCurrency: (id: string) => Promise<boolean>;
  getCurrencyUsageCount: (id: string) => Promise<number>;
  deletePaymentMethod: (id: string) => Promise<boolean>;
  getPaymentMethodUsageCount: (id: string) => Promise<number>;
  refetch: () => Promise<void>;
  onCategoryChange: (listener: ChangeListener) => () => void;
  onCurrencyChange: (listener: ChangeListener) => () => void;
  onPaymentMethodChange: (listener: ChangeListener) => () => void;
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

  // Category change listeners
  const categoryChangeListenersRef = useRef<Set<ChangeListener>>(new Set());

  const notifyCategoryChange = useCallback(() => {
    categoryChangeListenersRef.current.forEach((listener) => listener());
  }, []);

  const onCategoryChange = useCallback((listener: ChangeListener) => {
    categoryChangeListenersRef.current.add(listener);
    return () => {
      categoryChangeListenersRef.current.delete(listener);
    };
  }, []);

  // Currency change listeners
  const currencyChangeListenersRef = useRef<Set<ChangeListener>>(new Set());

  const notifyCurrencyChange = useCallback(() => {
    currencyChangeListenersRef.current.forEach((listener) => listener());
  }, []);

  const onCurrencyChange = useCallback((listener: ChangeListener) => {
    currencyChangeListenersRef.current.add(listener);
    return () => {
      currencyChangeListenersRef.current.delete(listener);
    };
  }, []);

  // Payment method change listeners
  const paymentMethodChangeListenersRef = useRef<Set<ChangeListener>>(new Set());

  const notifyPaymentMethodChange = useCallback(() => {
    paymentMethodChangeListenersRef.current.forEach((listener) => listener());
  }, []);

  const onPaymentMethodChange = useCallback((listener: ChangeListener) => {
    paymentMethodChangeListenersRef.current.add(listener);
    return () => {
      paymentMethodChangeListenersRef.current.delete(listener);
    };
  }, []);

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

  const updateCategory = async (id: string, name: string) => {
    const response = await categoryApi.update(ledgerIdRef.current, id, name);
    if (response.success && response.data) {
      await refetchCategories();
      notifyCategoryChange();
      return response.data;
    }
    throw new Error(response.error || 'Failed to update category');
  };

  const getCategoryUsageCount = async (id: string) => {
    const response = await categoryApi.getUsageCount(ledgerIdRef.current, id);
    if (response.success && response.data) {
      return response.data.count;
    }
    throw new Error(response.error || 'Failed to get category usage');
  };

  const createCurrency = async (data: { code: string; name: string }) => {
    const response = await currencyApi.create(ledgerIdRef.current, data);
    if (response.success && response.data) {
      await refetchCurrencies();
      return response.data;
    }
    throw new Error(response.error || 'Failed to create currency');
  };

  const updateCurrency = async (id: string, data: { code?: string; name?: string }) => {
    const response = await currencyApi.update(ledgerIdRef.current, id, data);
    if (response.success && response.data) {
      await refetchCurrencies();
      notifyCurrencyChange();
      return response.data;
    }
    throw new Error(response.error || 'Failed to update currency');
  };

  const getCurrencyUsageCount = async (id: string) => {
    const response = await currencyApi.getUsageCount(ledgerIdRef.current, id);
    if (response.success && response.data) {
      return response.data.count;
    }
    throw new Error(response.error || 'Failed to get currency usage');
  };

  const createPaymentMethod = async (data: { name: string; description?: string }) => {
    const response = await paymentMethodApi.create(ledgerIdRef.current, data);
    if (response.success && response.data) {
      await refetchPaymentMethods();
      return response.data;
    }
    throw new Error(response.error || 'Failed to create payment method');
  };

  const updatePaymentMethod = async (id: string, data: { name?: string; description?: string }) => {
    const response = await paymentMethodApi.update(ledgerIdRef.current, id, data);
    if (response.success && response.data) {
      await refetchPaymentMethods();
      notifyPaymentMethodChange();
      return response.data;
    }
    throw new Error(response.error || 'Failed to update payment method');
  };

  const getPaymentMethodUsageCount = async (id: string) => {
    const response = await paymentMethodApi.getUsageCount(ledgerIdRef.current, id);
    if (response.success && response.data) {
      return response.data.count;
    }
    throw new Error(response.error || 'Failed to get payment method usage');
  };

  const deleteCategory = async (id: string) => {
    const response = await categoryApi.delete(ledgerIdRef.current, id);
    if (response.success) {
      await refetchCategories();
      notifyCategoryChange();
      return true;
    }
    throw new Error(response.error || 'Failed to delete category');
  };

  const deleteCurrency = async (id: string) => {
    const response = await currencyApi.delete(ledgerIdRef.current, id);
    if (response.success) {
      await refetchCurrencies();
      notifyCurrencyChange();
      return true;
    }
    throw new Error(response.error || 'Failed to delete currency');
  };

  const deletePaymentMethod = async (id: string) => {
    const response = await paymentMethodApi.delete(ledgerIdRef.current, id);
    if (response.success) {
      await refetchPaymentMethods();
      notifyPaymentMethodChange();
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
        updateCategory,
        createCurrency,
        updateCurrency,
        createPaymentMethod,
        updatePaymentMethod,
        deleteCategory,
        getCategoryUsageCount,
        deleteCurrency,
        getCurrencyUsageCount,
        deletePaymentMethod,
        getPaymentMethodUsageCount,
        refetch: fetchAll,
        onCategoryChange,
        onCurrencyChange,
        onPaymentMethodChange,
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
