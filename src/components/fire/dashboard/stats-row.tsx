'use client';

import { useMemo } from 'react';
import { StatCard, Amount } from '@/components/fire/ui';
import { useAssets, useTransactions, useTransactionStats } from '@/hooks/fire/use-fire-data';
import type { TransactionWithDetails } from '@/types/fire';

// Helper to get effective amount for stats (use converted amount when available)
function getEffectiveAmount(txn: TransactionWithDetails): number {
  return txn.converted_amount ?? txn.amount;
}

export function StatsRow() {
  // Use SWR hooks for data fetching
  const { assets, isLoading: assetsLoading } = useAssets();
  const { transactions: flows, isLoading: flowsLoading } = useTransactions();
  const { stats, isLoading: statsLoading } = useTransactionStats();

  // Calculate net worth from assets (use converted balance when available)
  const netWorth = useMemo(() => {
    const getBalance = (a: typeof assets[0]) => a.converted_balance ?? a.balance;
    const totalAssets = assets.reduce(
      (sum, a) => {
        const balance = getBalance(a);
        return sum + (balance > 0 ? balance : 0);
      },
      0
    );
    const totalDebts = assets.reduce(
      (sum, a) => {
        const balance = getBalance(a);
        return sum + (balance < 0 ? Math.abs(balance) : 0);
      },
      0
    );
    return totalAssets - totalDebts;
  }, [assets]);

  // Calculate monthly income and expense from stats
  const { monthlyIncome, monthlyExpense, monthlyCashflow, savingsRate } = useMemo(() => {
    const income = stats?.total_income || 0;
    const expense = stats?.total_expense || 0;
    const cashflow = income - expense;
    const rate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
    return {
      monthlyIncome: income,
      monthlyExpense: expense,
      monthlyCashflow: cashflow,
      savingsRate: rate,
    };
  }, [stats]);

  // Calculate passive income (dividends, rental, interest)
  const passiveIncome = useMemo(() => {
    return flows
      .filter(
        (txn: TransactionWithDetails) =>
          txn.type === 'income' &&
          ['dividend', 'rental', 'interest'].includes(txn.category || '')
      )
      .reduce((sum: number, txn: TransactionWithDetails) => sum + getEffectiveAmount(txn), 0);
  }, [flows]);

  // Safe Withdrawal Rate (4% rule)
  const swrMonthly = useMemo(() => {
    return (netWorth * 0.04) / 12;
  }, [netWorth]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        label="Savings Rate"
        value={<Amount value={savingsRate} size={20} weight="bold" decimals={0} color={savingsRate >= 20 ? 'positive' : 'default'} className="after:content-['%']" />}
        trend={
          savingsRate > 0
            ? { value: 'of income saved', direction: 'neutral' }
            : undefined
        }
        isLoading={statsLoading}
      />
      <StatCard
        label="Passive Income"
        value={<Amount value={passiveIncome} size={20} weight="bold" color={passiveIncome > 0 ? 'positive' : 'default'} />}
        trend={{ value: 'per month', direction: 'neutral' }}
        isLoading={flowsLoading}
      />
      <StatCard
        label="Monthly Flow"
        value={<Amount value={monthlyCashflow} size={20} weight="bold" color={monthlyCashflow >= 0 ? 'positive' : 'negative'} />}
        trend={{
          value: monthlyCashflow >= 0 ? 'surplus' : 'deficit',
          direction: monthlyCashflow >= 0 ? 'up' : 'down',
        }}
        isLoading={statsLoading}
      />
      <StatCard
        label="SWR Amount"
        value={<Amount value={swrMonthly} size={20} weight="bold" />}
        trend={{ value: '4% rule / month', direction: 'neutral' }}
        isLoading={assetsLoading}
      />
    </div>
  );
}
