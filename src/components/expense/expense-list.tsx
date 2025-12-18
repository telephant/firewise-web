'use client';

import { useState } from 'react';
import { ExpenseCard } from './expense-card';
import { ExpenseDetailDialog } from './expense-detail-dialog';
import { AddExpenseDialog } from './add-expense-dialog';
import { ExpenseStats } from './expense-stats';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExpenses } from '@/hooks/use-expenses';
import type { Expense } from '@/types';

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5v-11" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}

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

  const { expenses, loading, error, createExpense, updateExpense, deleteExpense } =
    useExpenses(ledgerId);

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

  const handleAddExpense = async (data: {
    name: string;
    amount: number;
    currency_id: string;
    category_id?: string;
    description?: string;
    payment_method_id?: string;
    date?: string;
  }) => {
    await createExpense(data);
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

  if (loading) {
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
    <div className="relative flex flex-col h-full bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 py-2">
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
        </div>

        <TabsContent value="expenses" className="flex-1 mt-0">
          {expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <SparklesIcon className="h-10 w-10 text-primary" />
              </div>
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
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {expenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  onClick={() => handleExpenseClick(expense)}
                  onEdit={() => handleExpenseEdit(expense)}
                />
              ))}
            </div>
          )}

          {/* Desktop add button */}
          {expenses.length > 0 && (
            <div className="hidden md:block p-4 pt-2">
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="w-full h-11 rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="flex-1 mt-0">
          <ExpenseStats ledgerId={ledgerId} defaultCurrencyId={defaultCurrencyId} />
        </TabsContent>
      </Tabs>

      {/* Floating Action Button for mobile - only show on expenses tab */}
      {activeTab === 'expenses' && (
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl hover:shadow-2xl md:hidden transition-all duration-200 hover:scale-105 bg-gradient-to-br from-primary to-primary/90"
          size="icon"
        >
          <PlusIcon className="h-6 w-6" />
        </Button>
      )}

      <AddExpenseDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleAddExpense}
      />

      <ExpenseDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        expense={selectedExpense}
        onUpdate={handleUpdateExpense}
        onDelete={handleDeleteExpense}
        startInEditMode={startInEditMode}
      />
    </div>
  );
}
