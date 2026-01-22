'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PencilIcon, CalendarIcon, WalletIcon } from '@/components/icons';
import { getCategoryColor } from '@/lib/category-colors';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Expense } from '@/types';

interface ExpenseCardProps {
  expense: Expense;
  onClick: () => void;
  onEdit: () => void;
}

export function ExpenseCard({ expense, onClick, onEdit }: ExpenseCardProps) {
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
              {formatCurrency(expense.amount, expense.currency?.code)}
            </p>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {formatDate(expense.date, 'short')}
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
