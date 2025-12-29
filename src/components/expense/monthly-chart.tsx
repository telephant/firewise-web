'use client';

import { useMemo } from 'react';
import { format, parse } from 'date-fns';
import type { MonthTotal } from '@/types';

interface MonthlyChartProps {
  months: MonthTotal[];
  selectedMonth: string; // 'YYYY-MM' format
  onSelectMonth: (month: string) => void;
  currencyCode?: string;
}

export function MonthlyChart({ months, selectedMonth, onSelectMonth, currencyCode }: MonthlyChartProps) {
  const maxTotal = useMemo(() => {
    return Math.max(...months.map((m) => m.total), 1); // Prevent division by zero
  }, [months]);

  const formatMonthLabel = (monthStr: string) => {
    const date = parse(monthStr, 'yyyy-MM', new Date());
    return format(date, 'MMM');
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}k`;
    }
    return amount.toFixed(0);
  };

  if (months.length === 0) {
    return null;
  }

  // Calculate bar heights in pixels based on a fixed max height
  const maxBarHeight = 80; // pixels

  return (
    <div className="px-4 pt-2 pb-3">
      {/* Chart container */}
      <div className="flex items-end justify-between gap-2">
        {months.map((m) => {
          const isSelected = m.month === selectedMonth;
          const heightPercent = maxTotal > 0 ? m.total / maxTotal : 0;
          const barHeight = Math.max(heightPercent * maxBarHeight, m.total > 0 ? 8 : 4); // Min 8px if has data, 4px if no data

          return (
            <button
              key={m.month}
              onClick={() => onSelectMonth(m.month)}
              className="flex-1 flex flex-col items-center gap-1.5 group"
            >
              {/* Amount label */}
              <span
                className={`text-[10px] font-medium tabular-nums h-4 transition-opacity duration-200 ${
                  isSelected ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-100 text-muted-foreground'
                }`}
              >
                {currencyCode && m.total > 0 ? formatAmount(m.total) : '\u00A0'}
              </span>

              {/* Bar */}
              <div
                className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 ${
                  isSelected
                    ? 'bg-primary shadow-sm'
                    : m.total > 0
                      ? 'bg-muted-foreground/25 group-hover:bg-muted-foreground/40'
                      : 'bg-muted/60'
                }`}
                style={{
                  height: `${barHeight}px`,
                }}
              />

              {/* Month label */}
              <span
                className={`text-[11px] font-medium transition-colors duration-200 ${
                  isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                }`}
              >
                {formatMonthLabel(m.month)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
