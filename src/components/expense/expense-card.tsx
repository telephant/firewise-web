'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCategoryColor } from '@/lib/category-colors';
import type { Expense } from '@/types';

function PencilIcon({ className }: { className?: string }) {
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
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
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
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function WalletIcon({ className }: { className?: string }) {
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
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}

interface ExpenseCardProps {
  expense: Expense;
  onClick: () => void;
  onEdit: () => void;
}

export function ExpenseCard({ expense, onClick, onEdit }: ExpenseCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number, currencyCode?: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card
      className="group p-3 cursor-pointer border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 bg-card/80 backdrop-blur-sm"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        {/* Category Color Indicator */}
        <div className={`w-1 self-stretch rounded-full ${expense.category ? getCategoryColor(expense.category.name).bar : 'bg-muted'}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold text-[15px] truncate">{expense.name}</h3>
              {expense.category && (
                <Badge
                  variant="secondary"
                  className={`shrink-0 text-xs font-medium border-0 ${getCategoryColor(expense.category.name).badge}`}
                >
                  {expense.category.name}
                </Badge>
              )}
            </div>
            <p className="font-semibold text-[15px] tabular-nums shrink-0">
              {formatAmount(expense.amount, expense.currency?.code)}
            </p>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {formatDate(expense.date)}
              </span>
              {expense.payment_method && (
                <span className="flex items-center gap-1">
                  <WalletIcon className="h-3 w-3" />
                  {expense.payment_method.name}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-40 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <PencilIcon className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
