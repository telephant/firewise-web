'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
      className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{expense.name}</h3>
            {expense.category && (
              <Badge variant="secondary" className="shrink-0">
                {expense.category.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>{formatDate(expense.date)}</span>
            {expense.payment_method && (
              <>
                <span>•</span>
                <span>{expense.payment_method.name}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <p className="font-semibold">
            {formatAmount(expense.amount, expense.currency?.code)}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <PencilIcon className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
