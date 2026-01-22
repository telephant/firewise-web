'use client';

import { useMemo } from 'react';
import {
  retro,
  retroStyles,
  Loader,
  IconDebt,
  IconHome,
  IconCreditCard,
  IconBox,
} from '@/components/fire/ui';
import { formatCurrency } from '@/lib/fire/utils';
import type { Debt, DebtType } from '@/types/fire';

interface DebtTypeStatsProps {
  debts: Debt[];
  isLoading?: boolean;
  onTypeClick?: (type: DebtType | 'all') => void;
  selectedType?: DebtType | 'all';
  currency?: string;
}

const DEBT_TYPE_CONFIG: Record<DebtType, {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  countLabel: string;
}> = {
  mortgage: { label: 'Mortgages', icon: IconHome, countLabel: 'loans' },
  personal_loan: { label: 'Personal Loans', icon: IconDebt, countLabel: 'loans' },
  credit_card: { label: 'Credit Cards', icon: IconCreditCard, countLabel: 'cards' },
  student_loan: { label: 'Student Loans', icon: IconDebt, countLabel: 'loans' },
  auto_loan: { label: 'Auto Loans', icon: IconDebt, countLabel: 'loans' },
  other: { label: 'Other', icon: IconBox, countLabel: 'debts' },
};

export function DebtTypeStats({
  debts,
  isLoading = false,
  onTypeClick,
  selectedType = 'all',
  currency = 'USD',
}: DebtTypeStatsProps) {
  // Calculate stats per debt type
  const typeStats = useMemo(() => {
    const stats: Record<DebtType, {
      count: number;
      totalBalance: number;
      totalMonthlyPayment: number;
    }> = {
      mortgage: { count: 0, totalBalance: 0, totalMonthlyPayment: 0 },
      personal_loan: { count: 0, totalBalance: 0, totalMonthlyPayment: 0 },
      credit_card: { count: 0, totalBalance: 0, totalMonthlyPayment: 0 },
      student_loan: { count: 0, totalBalance: 0, totalMonthlyPayment: 0 },
      auto_loan: { count: 0, totalBalance: 0, totalMonthlyPayment: 0 },
      other: { count: 0, totalBalance: 0, totalMonthlyPayment: 0 },
    };

    debts.forEach((debt) => {
      const type = debt.debt_type;
      stats[type].count += 1;
      // Use converted_balance if available for proper currency handling
      const balance = debt.converted_balance ?? debt.current_balance;
      stats[type].totalBalance += balance;
      stats[type].totalMonthlyPayment += debt.monthly_payment || 0;
    });

    return stats;
  }, [debts]);

  // Only show types that have debts
  const activeTypes = (Object.keys(typeStats) as DebtType[]).filter(
    (type) => typeStats[type].count > 0
  );

  // Calculate grand total
  const grandTotal = useMemo(() => {
    return debts.reduce((sum, debt) => {
      const balance = debt.converted_balance ?? debt.current_balance;
      return sum + balance;
    }, 0);
  }, [debts]);

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 w-36 h-20 rounded-sm flex items-center justify-center"
            style={{ ...retroStyles.raised, backgroundColor: retro.surface }}
          >
            <Loader size="sm" variant="dots" />
          </div>
        ))}
      </div>
    );
  }

  if (activeTypes.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {/* Total Card */}
      <button
        onClick={() => onTypeClick?.('all')}
        className="flex-shrink-0 w-36 p-3 rounded-sm text-left transition-all"
        style={{
          ...(selectedType === 'all' ? retroStyles.sunken : retroStyles.raised),
          backgroundColor: selectedType === 'all' ? retro.surfaceLight : retro.surface,
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span style={{ color: retro.negative }}>
            <IconDebt size={14} />
          </span>
          <span className="text-xs font-bold" style={{ color: retro.text }}>
            All Debts
          </span>
        </div>
        <div
          className="text-sm font-bold tabular-nums"
          style={{ color: retro.negative }}
        >
          {formatCurrency(grandTotal, { currency })}
        </div>
        <div className="text-[10px]" style={{ color: retro.muted }}>
          {debts.length} total
        </div>
      </button>

      {/* Type Cards */}
      {activeTypes.map((type) => {
        const config = DEBT_TYPE_CONFIG[type];
        const stats = typeStats[type];
        const IconComponent = config.icon;
        const isSelected = selectedType === type;

        return (
          <button
            key={type}
            onClick={() => onTypeClick?.(type)}
            className="flex-shrink-0 w-36 p-3 rounded-sm text-left transition-all"
            style={{
              ...(isSelected ? retroStyles.sunken : retroStyles.raised),
              backgroundColor: isSelected ? retro.surfaceLight : retro.surface,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: retro.muted }}>
                <IconComponent size={14} />
              </span>
              <span className="text-xs font-bold" style={{ color: retro.text }}>
                {config.label}
              </span>
            </div>
            <div
              className="text-sm font-bold tabular-nums"
              style={{ color: retro.negative }}
            >
              {formatCurrency(stats.totalBalance, { currency })}
            </div>
            <div className="text-[10px]" style={{ color: retro.muted }}>
              {stats.count} {stats.count === 1 ? config.countLabel.slice(0, -1) : config.countLabel}
            </div>
          </button>
        );
      })}
    </div>
  );
}
