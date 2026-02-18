'use client';

import { useEffect, useState } from 'react';
import { AddTransactionDialog } from '@/components/fire/add-transaction';
import {
  colors,
  Button,
  SidebarTrigger,
  IconDollar,
  IconArrow,
  IconChart,
  IconTransfer,
  IconPlus,
  IconBank,
} from '@/components/fire/ui';
import { NetWorthAllocationBar, DividendCalendar, PassiveIncomeCard, MonthlySummaryCard } from '@/components/fire/dashboard';
import { useUserPreferences, useAssets, useDebts } from '@/hooks/fire/use-fire-data';

// Quick action buttons for common flows
const QUICK_ACTIONS = [
  { id: 'salary', label: 'Got Paid', Icon: IconDollar, rotate: 0 },
  { id: 'expense', label: 'Spent', Icon: IconArrow, rotate: 90 },
  { id: 'invest', label: 'Invested', Icon: IconChart, rotate: 0 },
  { id: 'transfer', label: 'Transferred', Icon: IconTransfer, rotate: 0 },
  { id: 'deposit', label: 'Deposit', Icon: IconBank, rotate: 0 },
  { id: 'interest', label: 'Interest', Icon: IconDollar, rotate: 0 },
];

export default function FireDashboardPage() {
  const [isAddFlowOpen, setIsAddFlowOpen] = useState(false);
  const [initialCategory, setInitialCategory] = useState<string | undefined>();
  const [currentDate, setCurrentDate] = useState<string>('');

  // Get user preferences for currency
  const { preferences } = useUserPreferences();

  // Fetch assets and debts for allocation bar
  const { assets, isLoading: assetsLoading } = useAssets();
  const { debts, isLoading: debtsLoading } = useDebts();

  // Use preferred currency when conversion is enabled, otherwise USD
  const displayCurrency = preferences?.convert_all_to_preferred
    ? preferences.preferred_currency
    : 'USD';

  // Set date on client side only to avoid hydration mismatch
  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }));
  }, []);

  const openWithCategory = (categoryId?: string) => {
    setInitialCategory(categoryId);
    setIsAddFlowOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ═══════════════════════════════════════════════════════════════
          Header
      ═══════════════════════════════════════════════════════════════ */}
      <header
        className="flex items-center justify-between px-3 py-2"
        style={{
          backgroundColor: 'transparent',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <h1 className="text-sm font-bold" style={{ color: colors.text }}>
            FIRE Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: colors.muted }}>
            {currentDate}
          </span>
          <Button size="sm" variant="primary" onClick={() => openWithCategory()} className="gap-1.5">
            <IconPlus size={12} />
            <span>Record</span>
          </Button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          Quick Actions
      ═══════════════════════════════════════════════════════════════ */}
      <div
        className="px-4 py-2.5"
        style={{
          backgroundColor: 'transparent',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center gap-2 flex-wrap">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.id}
              size="sm"
              onClick={() => openWithCategory(action.id)}
              className="gap-1.5"
            >
              <span style={{ display: 'inline-block', transform: action.rotate ? `rotate(${action.rotate}deg)` : undefined }}>
                <action.Icon size={14} />
              </span>
              <span>{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          Main Content - Simplified Dashboard
      ═══════════════════════════════════════════════════════════════ */}
      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Net Worth Allocation Bar (Assets + Debts) */}
          <NetWorthAllocationBar
            assets={assets}
            debts={debts}
            isLoading={assetsLoading || debtsLoading}
            currency={displayCurrency}
          />

          {/* Monthly Summary + Passive Income */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MonthlySummaryCard />
            <PassiveIncomeCard />
          </div>

          {/* Dividend Calendar */}
          <DividendCalendar />
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════
          Add Transaction Dialog - Only render when open to avoid unnecessary API calls
      ═══════════════════════════════════════════════════════════════ */}
      {isAddFlowOpen && (
        <AddTransactionDialog
          open={isAddFlowOpen}
          onOpenChange={(open) => {
            setIsAddFlowOpen(open);
            if (!open) setInitialCategory(undefined);
          }}
          initialCategory={initialCategory}
        />
      )}
    </div>
  );
}
