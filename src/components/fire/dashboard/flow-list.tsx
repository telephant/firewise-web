'use client';

import Link from 'next/link';
import {
  colors,
  Card,
  Loader,
  IconArrow,
} from '@/components/fire/ui';
import { useTransactions } from '@/hooks/fire/use-fire-data';
import { formatCurrency } from '@/lib/fire/utils';
import type { TransactionWithDetails } from '@/types/fire';

interface FlowListProps {
  maxItems?: number;
  showViewAll?: boolean;
}

// Rotation degrees for each flow type (IconArrow points right by default)
const FLOW_ROTATIONS: Record<string, number> = {
  income: -90,   // Point up
  expense: 90,   // Point down
  buy: 0,
  sell: 0,
  debt_payment: 90,
};

export function FlowList({
  maxItems = 5,
  showViewAll = true,
}: FlowListProps) {
  // Use SWR hook for data fetching
  const { transactions, isLoading } = useTransactions({ limit: maxItems });
  // Filter out adjustments client-side
  const flows = transactions.filter(t => t.category !== 'adjustment');

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getFlowColor = (type: TransactionWithDetails['type']) => {
    switch (type) {
      case 'income':
        return colors.positive;
      case 'expense':
      case 'debt_payment':
        return colors.negative;
      default:
        return colors.text;
    }
  };

  const getFlowSign = (type: TransactionWithDetails['type']) => {
    switch (type) {
      case 'income':
        return '+';
      case 'expense':
      case 'debt_payment':
        return '−';
      default:
        return '';
    }
  };

  const getFlowDescription = (txn: TransactionWithDetails) => {
    if (txn.type === 'buy' || txn.type === 'sell') {
      const fromAsset = txn.from_asset || txn.source_asset;
      const toAsset = txn.to_asset || txn.asset;
      return `${fromAsset?.name || 'Unknown'} → ${toAsset?.name || 'Unknown'}`;
    }
    const toAsset = txn.to_asset || txn.asset;
    const fromAsset = txn.from_asset || txn.source_asset;
    return toAsset?.name || fromAsset?.name || '';
  };

  const CARD_HEIGHT = '280px';

  if (isLoading) {
    return (
      <Card title="Recent Flows" contentHeight={CARD_HEIGHT}>
        <div className="h-full flex items-center justify-center">
          <Loader size="md" variant="bar" />
        </div>
      </Card>
    );
  }

  return (
    <Card title="Recent Flows" contentHeight={CARD_HEIGHT}>
      <div className="h-full flex flex-col">
        {flows.length === 0 ? (
          <div
            className="flex-1 flex items-center justify-center text-xs"
            style={{ color: colors.muted }}
          >
            No flows yet. Click &quot;Record&quot; to get started.
          </div>
        ) : (
          <>
            {/* Scrollable flow list */}
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {flows.map((flow) => {
                const rotation = FLOW_ROTATIONS[flow.type] || 0;
                return (
                  <div
                    key={flow.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md"
                    style={{ backgroundColor: colors.surfaceLight }}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ color: getFlowColor(flow.type), transform: `rotate(${rotation}deg)`, display: 'inline-block' }}>
                        <IconArrow size={14} />
                      </span>
                      <div>
                        <p
                          className="text-xs font-medium capitalize"
                          style={{ color: colors.text }}
                        >
                          {flow.category || flow.type}
                        </p>
                        <p
                          className="text-[10px]"
                          style={{ color: colors.muted }}
                        >
                          {getFlowDescription(flow)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-xs font-bold tabular-nums"
                        style={{ color: getFlowColor(flow.type) }}
                      >
                        {getFlowSign(flow.type)}
                        {formatCurrency(
                          flow.converted_amount ?? flow.amount,
                          { currency: flow.converted_currency ?? flow.currency }
                        )}
                      </p>
                      {flow.converted_amount !== undefined &&
                        flow.converted_currency &&
                        flow.converted_currency !== flow.currency && (
                        <p
                          className="text-[10px] tabular-nums"
                          style={{ color: colors.muted }}
                        >
                          ({formatCurrency(flow.amount, { currency: flow.currency })})
                        </p>
                      )}
                      <p
                        className="text-[10px]"
                        style={{ color: colors.muted }}
                      >
                        {formatDate(flow.date)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* View All Link - fixed at bottom */}
            {showViewAll && flows.length > 0 && (
              <div className="pt-2 text-center flex-shrink-0">
                <Link
                  href="/fire/transactions"
                  className="text-xs font-medium transition-colors hover:underline"
                  style={{ color: colors.info }}
                >
                  View all flows →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
