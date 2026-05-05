'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { exchangeRateApi } from '@/lib/fire/api';
import { CURRENCIES } from '@/components/fire/ui/currency-combobox';

export type SupportedCurrency = string;

const STORAGE_KEY = 'fire_display_currency';

interface CurrencyContextValue {
  displayCurrency: SupportedCurrency;
  setDisplayCurrency: (currency: SupportedCurrency) => void;
  // Convert a USD amount to the display currency
  convert: (usdAmount: number) => number;
  // Format a USD amount in the display currency
  fmt: (usdAmount: number, opts?: { decimals?: number }) => string;
  ratesLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  displayCurrency: 'USD',
  setDisplayCurrency: () => {},
  convert: (v) => v,
  fmt: (v) => `$${v.toFixed(2)}`,
  ratesLoading: false,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [displayCurrency, setDisplayCurrencyState] = useState<SupportedCurrency>('USD');
  const [rates, setRates] = useState<Record<string, number>>({});
  const [ratesLoading, setRatesLoading] = useState(false);

  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && CURRENCIES.some(c => c.code === saved)) {
      setDisplayCurrencyState(saved);
    }
  }, []);

  // Fetch rates whenever displayCurrency changes
  useEffect(() => {
    if (displayCurrency === 'USD') {
      setRates({});
      return;
    }
    setRatesLoading(true);
    // base=USD, get rate for displayCurrency
    exchangeRateApi.get('USD', [displayCurrency]).then(res => {
      if (res.success && res.data) {
        setRates(res.data.rates);
      }
      setRatesLoading(false);
    });
  }, [displayCurrency]);

  const setDisplayCurrency = useCallback((currency: SupportedCurrency) => {
    setDisplayCurrencyState(currency);
    localStorage.setItem(STORAGE_KEY, currency);
  }, []);

  const convert = useCallback((usdAmount: number): number => {
    if (displayCurrency === 'USD') return usdAmount;
    const rate = rates[displayCurrency];
    return rate ? usdAmount * rate : usdAmount;
  }, [displayCurrency, rates]);

  const fmt = useCallback((usdAmount: number, opts?: { decimals?: number }): string => {
    const converted = convert(usdAmount);
    const decimals = opts?.decimals ?? 2;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: displayCurrency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(converted);
  }, [convert, displayCurrency]);

  return (
    <CurrencyContext.Provider value={{ displayCurrency, setDisplayCurrency, convert, fmt, ratesLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
