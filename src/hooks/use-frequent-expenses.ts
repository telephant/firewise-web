'use client';

import { useState, useEffect } from 'react';
import { statsApi } from '@/lib/api';
import { getCachedFrequentExpenses, setCachedFrequentExpenses } from '@/lib/frequent-expense-cache';

interface FrequentExpense {
  name: string;
  category_id: string | null;
  count: number;
}

export function useFrequentExpenses(ledgerId: string | null) {
  const [expenses, setExpenses] = useState<FrequentExpense[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ledgerId) return;

    // Check cache first
    const cached = getCachedFrequentExpenses(ledgerId);
    if (cached) {
      setExpenses(cached);
      return;
    }

    // No cache, fetch from API
    setLoading(true);
    statsApi.getFrequentExpenses(ledgerId).then((res) => {
      if (res.success && res.data) {
        setExpenses(res.data.expenses);
        setCachedFrequentExpenses(ledgerId, res.data.expenses);
      }
    }).finally(() => {
      setLoading(false);
    });
  }, [ledgerId]);

  return { expenses, loading };
}
