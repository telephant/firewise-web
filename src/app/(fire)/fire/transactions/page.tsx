'use client';

import { useState, useMemo } from 'react';
import { AddTransactionDialog } from '@/components/fire/add-transaction';
import {
  colors,
  Button,
  SidebarTrigger,
  IconPlus,
} from '@/components/fire/ui';
import {
  MonthSelector,
  MoneyMovement,
  TopIncomeSources,
  FlowsTable,
  FlowDetailDialog,
  EditFlowDialog,
  DeleteFlowDialog,
  FlowsFilterBar,
  FLOW_CATEGORIES,
} from '@/components/fire/transactions';
import type { FlowCategory } from '@/components/fire/transactions';
import { useTransactions, useAssets, useUserPreferences, useExpenseStats } from '@/hooks/fire/use-fire-data';
import type { TransactionWithDetails } from '@/types/fire';

// Helper to get start/end dates for a month
function getMonthDateRange(year: number, month: number) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  return {
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
  };
}

// Passive income categories
const PASSIVE_CATEGORIES = ['dividend', 'interest', 'rental', 'gift'];

// Outflow destination categories
const INVESTMENT_CATEGORIES = ['invest', 'reinvest'];
const DEBT_CATEGORIES = ['pay_debt'];

// Helper to get effective amount for stats (use converted amount when available)
function getEffectiveAmount(txn: TransactionWithDetails): number {
  return txn.converted_amount ?? txn.amount;
}

const PAGE_SIZE = 20;

export default function FlowsPage() {
  const [isAddFlowOpen, setIsAddFlowOpen] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<TransactionWithDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Current month state (for summary stats)
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  // Table filter state
  const [selectedCategories, setSelectedCategories] = useState<FlowCategory[]>([]);
  const [tableStartDate, setTableStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3); // Default to last 3 months
    return d.toISOString().split('T')[0];
  });
  const [tableEndDate, setTableEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Get date range for selected month (for stats)
  const statsDateRange = useMemo(
    () => getMonthDateRange(selectedMonth.year, selectedMonth.month),
    [selectedMonth]
  );

  // Fetch transactions for stats (selected month)
  const { transactions: statsTransactions, isLoading: statsLoading, mutate: mutateStats } = useTransactions({
    start_date: statsDateRange.start_date,
    end_date: statsDateRange.end_date,
    limit: 200,
  });

  // Filter out adjustments from stats
  const statsFlows = useMemo(() =>
    statsTransactions.filter(t => t.category !== 'adjustment'),
    [statsTransactions]
  );

  // Fetch all transactions for the table (with date range filter)
  const { transactions: allTransactions, total: totalFlows, isLoading: tableLoading, mutate: mutateTable } = useTransactions({
    start_date: tableStartDate,
    end_date: tableEndDate,
    limit: 500, // Fetch more for client-side filtering
  });

  // Filter out adjustments from table data
  const allFlows = useMemo(() =>
    allTransactions.filter(t => t.category !== 'adjustment'),
    [allTransactions]
  );

  // Fetch expense stats for the selected month (includes linked ledger expenses)
  const { stats: expenseStats, isLoading: expenseStatsLoading } = useExpenseStats({
    year: selectedMonth.year,
    month: selectedMonth.month + 1,
  });

  // Fetch assets for reference
  const { assets } = useAssets();

  // Get user preferences for currency
  const { preferences } = useUserPreferences();

  // Use preferred currency when conversion is enabled, otherwise USD
  const displayCurrency = preferences?.convert_all_to_preferred
    ? preferences.preferred_currency
    : 'USD';

  // Filter transactions for table (client-side filtering for categories and search)
  const filteredFlows = useMemo(() => {
    if (!allFlows) return [];

    return allFlows.filter((txn: TransactionWithDetails) => {
      // Category filter
      if (selectedCategories.length > 0) {
        const txnCategory = txn.category || txn.type;
        if (!selectedCategories.includes(txnCategory as FlowCategory)) {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesCategory = txn.category?.toLowerCase().includes(query);
        const matchesFrom = (txn.from_asset?.name || txn.source_asset?.name)?.toLowerCase().includes(query);
        const matchesTo = (txn.to_asset?.name || txn.asset?.name)?.toLowerCase().includes(query);
        const matchesDesc = txn.description?.toLowerCase().includes(query);
        if (!matchesCategory && !matchesFrom && !matchesTo && !matchesDesc) {
          return false;
        }
      }

      return true;
    });
  }, [allFlows, selectedCategories, searchQuery]);

  // Paginate filtered flows
  const paginatedFlows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredFlows.slice(start, start + PAGE_SIZE);
  }, [filteredFlows, currentPage]);

  const totalPages = Math.ceil(filteredFlows.length / PAGE_SIZE);

  // Reset to page 1 when filters change
  const handleCategoriesChange = (categories: FlowCategory[]) => {
    setSelectedCategories(categories);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setTableStartDate(start);
    setTableEndDate(end);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  // Calculate summary data from flows and expense stats
  const summaryData = useMemo(() => {
    const expenseStatsTotal = expenseStats?.current_month?.total ?? 0;

    if (!statsFlows || statsFlows.length === 0) {
      return {
        sources: [],
        destinations: expenseStatsTotal > 0 ? [{
          name: 'Spent',
          amount: expenseStatsTotal,
          percentage: 100,
        }] : [],
        totalIn: 0,
        totalSpent: expenseStatsTotal,
        totalAllocated: 0,
        topIncomeSources: [],
        passiveTotal: 0,
        activeTotal: 0,
        assetActivity: [],
        pendingReviewCount: 0,
      };
    }

    const incomeByCategoryMap = new Map<
      string,
      { sources: Map<string, number>; total: number }
    >();

    let investmentTotal = 0;
    let savingsTotal = 0;
    let debtTotal = 0;

    const assetActivityMap = new Map<
      string,
      { name: string; flowCount: number; totalIn: number; totalOut: number }
    >();

    let totalIn = 0;
    let passiveTotal = 0;
    let activeTotal = 0;

    const sourceMap = new Map<string, { label: string; amount: number }>();

    const formatCategoryLabel = (cat: string): string => {
      const labels: Record<string, string> = {
        dividend: 'Dividend',
        salary: 'Salary',
        bonus: 'Bonus',
        freelance: 'Freelance',
        rental: 'Rental',
        interest: 'Interest',
        gift: 'Gift',
      };
      return labels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
    };

    // Filter out transactions that need review - they shouldn't count in stats until reviewed
    const reviewedFlows = statsFlows.filter((txn) => !txn.needs_review);

    reviewedFlows.forEach((txn: TransactionWithDetails) => {
      const category = txn.category || txn.type;
      const amount = getEffectiveAmount(txn);

      if (txn.type === 'income') {
        totalIn += amount;

        const sourceName =
          txn.from_asset?.name || txn.source_asset?.name ||
          ((txn.metadata as Record<string, unknown>)?.source_name as string) ||
          '';

        const key = `${category}:${sourceName}`;
        const label = sourceName
          ? `${formatCategoryLabel(category)} from ${sourceName}`
          : formatCategoryLabel(category);

        const existingSource = sourceMap.get(key);
        if (existingSource) {
          existingSource.amount += amount;
        } else {
          sourceMap.set(key, { label, amount });
        }

        const existingCategory = incomeByCategoryMap.get(category) || {
          sources: new Map<string, number>(),
          total: 0,
        };
        const currentAmount = existingCategory.sources.get(sourceName) || 0;
        existingCategory.sources.set(sourceName, currentAmount + amount);
        existingCategory.total += amount;
        incomeByCategoryMap.set(category, existingCategory);

        if (PASSIVE_CATEGORIES.includes(category)) {
          passiveTotal += amount;
        } else {
          activeTotal += amount;
        }
      }

      // Handle expense and buy/sell types
      if (txn.type === 'expense' || txn.type === 'buy' || txn.type === 'sell') {
        if (INVESTMENT_CATEGORIES.includes(category)) {
          investmentTotal += amount;
        } else if (DEBT_CATEGORIES.includes(category)) {
          debtTotal += amount;
        } else if (category === 'deposit') {
          savingsTotal += amount;
        }
      }

      const fromAsset = txn.from_asset || txn.source_asset;
      if (fromAsset) {
        const existing = assetActivityMap.get(fromAsset.id) || {
          name: fromAsset.name,
          flowCount: 0,
          totalIn: 0,
          totalOut: 0,
        };
        existing.flowCount += 1;
        existing.totalOut += amount;
        assetActivityMap.set(fromAsset.id, existing);
      }

      const toAsset = txn.to_asset || txn.asset;
      if (toAsset) {
        const existing = assetActivityMap.get(toAsset.id) || {
          name: toAsset.name,
          flowCount: 0,
          totalIn: 0,
          totalOut: 0,
        };
        existing.flowCount += 1;
        existing.totalIn += amount;
        assetActivityMap.set(toAsset.id, existing);
      }
    });

    const sources = Array.from(sourceMap.values())
      .map(({ label, amount }) => ({ name: label, amount }))
      .sort((a, b) => b.amount - a.amount);

    const topIncomeSources = Array.from(incomeByCategoryMap.entries())
      .map(([category, data]) => ({
        name: category,
        amount: data.total,
        category,
        isPassive: PASSIVE_CATEGORIES.includes(category),
        items: Array.from(data.sources.entries())
          .map(([sourceName, sourceAmount]) => ({
            name: sourceName,
            amount: sourceAmount,
          }))
          .sort((a, b) => b.amount - a.amount),
      }))
      .sort((a, b) => b.amount - a.amount);

    const allOutflows = investmentTotal + savingsTotal + debtTotal + expenseStatsTotal;
    const destinations = [
      {
        name: 'Investments',
        amount: investmentTotal,
        percentage: allOutflows > 0 ? Math.round((investmentTotal / allOutflows) * 100) : 0,
      },
      {
        name: 'Savings',
        amount: savingsTotal,
        percentage: allOutflows > 0 ? Math.round((savingsTotal / allOutflows) * 100) : 0,
      },
      {
        name: 'Debt Payoff',
        amount: debtTotal,
        percentage: allOutflows > 0 ? Math.round((debtTotal / allOutflows) * 100) : 0,
      },
      {
        name: 'Spent',
        amount: expenseStatsTotal,
        percentage: allOutflows > 0 ? Math.round((expenseStatsTotal / allOutflows) * 100) : 0,
      },
    ].filter((d) => d.amount > 0);

    const assetActivity = Array.from(assetActivityMap.values())
      .sort((a, b) => b.flowCount - a.flowCount)
      .slice(0, 5);

    const totalSpent = expenseStatsTotal;
    const totalAllocated = investmentTotal + savingsTotal + debtTotal;
    const pendingReviewCount = statsFlows.filter((txn) => txn.needs_review).length;

    return {
      sources,
      destinations,
      totalIn,
      totalSpent,
      totalAllocated,
      topIncomeSources,
      passiveTotal,
      activeTotal,
      assetActivity,
      pendingReviewCount,
    };
  }, [statsFlows, expenseStats]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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
            Flows
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsAddFlowOpen(true)}
            className="gap-1.5"
          >
            <IconPlus size={12} />
            <span>Add Flow</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Money Movement */}
          <MoneyMovement
            sources={summaryData.sources}
            destinations={summaryData.destinations}
            totalIn={summaryData.totalIn}
            totalSpent={summaryData.totalSpent}
            totalAllocated={summaryData.totalAllocated}
            currency={displayCurrency}
            isLoading={statsLoading || expenseStatsLoading}
            pendingReviewCount={summaryData.pendingReviewCount}
          />

          {/* Top Income Sources */}
          <TopIncomeSources
            sources={summaryData.topIncomeSources}
            passiveTotal={summaryData.passiveTotal}
            activeTotal={summaryData.activeTotal}
            currency={displayCurrency}
            isLoading={statsLoading}
          />

          {/* Flows Table Section */}
          <div>
            <h2
              className="text-sm font-bold mb-3"
              style={{ color: colors.text }}
            >
              All Flows
            </h2>

            {/* Filter Bar */}
            <FlowsFilterBar
              selectedCategories={selectedCategories}
              onCategoriesChange={handleCategoriesChange}
              startDate={tableStartDate}
              endDate={tableEndDate}
              onDateRangeChange={handleDateRangeChange}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
            />

            {/* Table */}
            <FlowsTable
              flows={paginatedFlows}
              isLoading={tableLoading}
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={filteredFlows.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              onRowClick={(flow) => {
                setSelectedFlow(flow);
                setIsDetailOpen(true);
              }}
              onEdit={(flow) => {
                setSelectedFlow(flow);
                setIsEditOpen(true);
              }}
              onDelete={(flow) => {
                setSelectedFlow(flow);
                setIsDeleteOpen(true);
              }}
            />
          </div>
        </div>
      </main>

      {/* Add Transaction Dialog - Only render when open */}
      {isAddFlowOpen && (
        <AddTransactionDialog open={isAddFlowOpen} onOpenChange={setIsAddFlowOpen} />
      )}

      {/* Flow Detail Dialog */}
      <FlowDetailDialog
        flow={selectedFlow}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={(flow) => {
          setIsDetailOpen(false);
          setSelectedFlow(flow);
          setIsEditOpen(true);
        }}
        onDelete={(flow) => {
          setIsDetailOpen(false);
          setSelectedFlow(flow);
          setIsDeleteOpen(true);
        }}
      />

      {/* Edit Flow Dialog */}
      <EditFlowDialog
        flow={selectedFlow}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />

      {/* Delete Flow Dialog */}
      <DeleteFlowDialog
        flow={selectedFlow}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onDeleted={() => {
          mutateStats();
          mutateTable();
        }}
      />
    </div>
  );
}
