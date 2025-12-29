'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ExpenseCard } from './expense-card';
import { ExpenseDetailDialog } from './expense-detail-dialog';
import { AddExpenseDialog } from './add-expense-dialog';
import { ExpenseStats } from './expense-stats';
import { PeriodFilter } from './period-filter';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusIcon, ReceiptIcon, ChartIcon, SparklesIcon, RefreshIcon } from '@/components/icons';
import { useExpenses } from '@/hooks/use-expenses';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { useExpenseData } from '@/contexts/expense-data-context';
import { type PeriodOption, type CustomDateRange, getPeriodDateRange } from '@/lib/date-utils';
import type { Expense } from '@/types';

interface ExpenseListProps {
  ledgerId: string;
  defaultCurrencyId?: string | null;
}

export function ExpenseList({ ledgerId, defaultCurrencyId }: ExpenseListProps) {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [startInEditMode, setStartInEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('expenses');
  const [refreshing, setRefreshing] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [period, setPeriod] = useState<PeriodOption>('all');
  const [customRange, setCustomRange] = useState<CustomDateRange | undefined>();
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  // Compute filters based on selected period
  const filters = useMemo(() => {
    return getPeriodDateRange(period, customRange);
  }, [period, customRange]);

  const { expenses, loading, loadingMore, error, hasMore, refetch, loadMore, createExpense, updateExpense, deleteExpense } =
    useExpenses(ledgerId, filters);

  // Track when initial load is complete
  useEffect(() => {
    if (!loading && !initialLoadDone) {
      setInitialLoadDone(true);
    }
  }, [loading, initialLoadDone]);

  const handlePeriodChange = (newPeriod: PeriodOption, newCustomRange?: CustomDateRange) => {
    setPeriod(newPeriod);
    setCustomRange(newCustomRange);
  };

  const { triggerRef } = useInfiniteScroll({
    loading: loading || loadingMore,
    hasMore,
    onLoadMore: loadMore,
  });

  const { onCategoryChange, onCurrencyChange, onPaymentMethodChange } = useExpenseData();

  // Subscribe to category, currency, and payment method changes to refresh expense list
  useEffect(() => {
    const unsubscribeCategory = onCategoryChange(() => {
      refetch();
    });
    const unsubscribeCurrency = onCurrencyChange(() => {
      refetch();
    });
    const unsubscribePaymentMethod = onPaymentMethodChange(() => {
      refetch();
    });
    return () => {
      unsubscribeCategory();
      unsubscribeCurrency();
      unsubscribePaymentMethod();
    };
  }, [onCategoryChange, onCurrencyChange, onPaymentMethodChange, refetch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleExpenseClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setStartInEditMode(false);
    setDetailDialogOpen(true);
  };

  const handleExpenseEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setStartInEditMode(true);
    setDetailDialogOpen(true);
  };

  const handleAddExpense = async (
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
    await createExpense(data, options);
  };

  const handleAddDialogClose = (open: boolean, hasChanges: boolean) => {
    setAddDialogOpen(open);
    if (!open && hasChanges) {
      refetch();
    }
  };

  const handleUpdateExpense = async (
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
    await updateExpense(id, data);
    setDetailDialogOpen(false);
  };

  const handleDeleteExpense = async (id: string) => {
    await deleteExpense(id);
    setDetailDialogOpen(false);
  };

  // Only show full skeleton on initial load, not on filter changes
  if (loading && !initialLoadDone) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Floating Action Buttons - rendered via portal to document.body for true fixed positioning */}
      {portalContainer && activeTab === 'expenses' && createPortal(
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 bg-background border"
            size="icon"
            variant="outline"
          >
            <RefreshIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="h-14 w-14 rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105 bg-gradient-to-br from-primary to-primary/90"
            size="icon"
          >
            <PlusIcon className="h-6 w-6" />
          </Button>
        </div>,
        portalContainer
      )}

      <div className="relative flex flex-col h-full bg-background">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 py-2 space-y-2">
          <TabsList className="h-11 w-full grid grid-cols-2 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger
              value="expenses"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium transition-all duration-200 flex items-center gap-2"
            >
              <ReceiptIcon className="h-4 w-4" />
              Expenses
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium transition-all duration-200 flex items-center gap-2"
            >
              <ChartIcon className="h-4 w-4" />
              Stats
            </TabsTrigger>
          </TabsList>

          {activeTab === 'expenses' && (
            <div className="flex items-center">
              <PeriodFilter
                value={period}
                customRange={customRange}
                onChange={handlePeriodChange}
              />
            </div>
          )}
        </div>

        <TabsContent value="expenses" className="flex-1 mt-0 relative">
          {/* Loading overlay for filter changes */}
          {loading && initialLoadDone && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-start justify-center pt-20">
              <div className="flex items-center gap-2 text-muted-foreground bg-background/80 px-4 py-2 rounded-full shadow-sm">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm">Loading...</span>
              </div>
            </div>
          )}

          {expenses.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <SparklesIcon className="h-10 w-10 text-primary" />
              </div>
              {period === 'all' ? (
                <>
                  <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-xs">
                    Start tracking your spending by adding your first expense
                  </p>
                  <Button
                    onClick={() => setAddDialogOpen(true)}
                    className="rounded-xl px-6 h-11 shadow-md hover:shadow-lg transition-shadow"
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add your first expense
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-2">No expenses found</h3>
                  <p className="text-muted-foreground mb-6 max-w-xs">
                    No expenses match the selected time period
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => handlePeriodChange('all')}
                    className="rounded-xl px-6 h-11"
                  >
                    View all expenses
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2 p-4 pb-24">
              {expenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  onClick={() => handleExpenseClick(expense)}
                  onEdit={() => handleExpenseEdit(expense)}
                />
              ))}

              {/* Load more trigger */}
              {hasMore && (
                <div ref={triggerRef} className="py-4 flex justify-center">
                  {loadingMore && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm">Loading more...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </TabsContent>

        <TabsContent value="stats" className="flex-1 mt-0">
          <ExpenseStats ledgerId={ledgerId} defaultCurrencyId={defaultCurrencyId} />
        </TabsContent>
        </Tabs>
      </div>

      <AddExpenseDialog
        open={addDialogOpen}
        onOpenChange={handleAddDialogClose}
        onSubmit={handleAddExpense}
        defaultCurrencyId={defaultCurrencyId}
      />

      <ExpenseDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        expense={selectedExpense}
        onUpdate={handleUpdateExpense}
        onDelete={handleDeleteExpense}
        startInEditMode={startInEditMode}
      />
    </>
  );
}
