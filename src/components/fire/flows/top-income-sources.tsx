'use client';

import { colors, Card, Loader, StackedBarChart } from '@/components/fire/ui';
import type { StackedBarItem } from '@/components/fire/ui';
import { formatCurrency } from '@/lib/fire/utils';

interface IncomeSourceItem {
  name: string;
  amount: number;
}

interface IncomeSource {
  /** Display name of the source (e.g., "AAPL", "Acme Corp", "Property A") */
  name: string;
  amount: number;
  isPassive: boolean;
  /** Income category: dividend, salary, rental, bonus, freelance, interest, gift, other */
  category?: string;
  /** For grouped sources: individual items within this category */
  items?: IncomeSourceItem[];
}

interface TopIncomeSourcesProps {
  sources: IncomeSource[];
  passiveTotal: number;
  activeTotal: number;
  currency?: string;
  isLoading?: boolean;
}

export function TopIncomeSources({
  sources,
  passiveTotal,
  activeTotal,
  currency = 'USD',
  isLoading = false,
}: TopIncomeSourcesProps) {
  const total = passiveTotal + activeTotal;
  const passivePercentage = total > 0 ? Math.round((passiveTotal / total) * 100) : 0;
  const activePercentage = total > 0 ? Math.round((activeTotal / total) * 100) : 0;

  // Convert sources to stacked bar format
  // category = the income type (dividend, rental, salary) - shown on X-axis
  // name = the individual source (AAPL, Property A, Acme Corp) - shown in stacked segments
  const chartData: StackedBarItem[] = sources.flatMap((source) => {
    // Category must be the income type (dividend, salary, rental, etc.)
    // If not provided, try to infer or use 'other'
    const category = source.category || 'other';

    // If source has sub-items (like individual stocks for dividend category)
    if (source.items && source.items.length > 0) {
      return source.items.map((item) => ({
        name: item.name,      // e.g., "AAPL", "MSFT"
        amount: item.amount,
        category,             // e.g., "dividend"
      }));
    }

    // Single item source
    return [{
      name: source.name,      // e.g., "Acme Corp" for salary
      amount: source.amount,
      category,               // e.g., "salary"
    }];
  });

  if (isLoading) {
    return (
      <Card title="Top Income Sources">
        <div className="h-[200px] flex items-center justify-center">
          <Loader size="md" variant="bar" />
        </div>
      </Card>
    );
  }

  return (
    <Card title="Top Income Sources">
      
      <div
        className="rounded-md p-3"
        style={{
          backgroundColor: colors.surfaceLight,
          border: `1px solid ${colors.border}`,
        }}
      >
        {sources.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: colors.muted }}>
            No income this month
          </p>
        ) : (
          <StackedBarChart
            data={chartData}
            height={200}
            valueFormatter={(v) => formatCurrency(v, { currency, compact: true })}
            showBrush={false}
          />
        )}
      </div>

      {/* Passive vs Active Summary */}
      {total > 0 && (
        <div
          className="mt-3 pt-2 flex items-center justify-between text-xs"
          style={{ borderTop: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-3">
            <span style={{ color: colors.info }}>
              <span className="font-bold">Passive:</span>{' '}
              {formatCurrency(passiveTotal, { currency })} ({passivePercentage}%)
            </span>
            <span style={{ color: colors.positive }}>
              <span className="font-bold">Active:</span>{' '}
              {formatCurrency(activeTotal, { currency })} ({activePercentage}%)
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
