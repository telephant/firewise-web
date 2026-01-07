'use client';

import Link from 'next/link';
import {
  retro,
  Card,
  Loader,
  IconArrow,
} from '@/components/fire/ui';
import { useFlows } from '@/hooks/fire/use-fire-data';
import type { FlowWithDetails } from '@/types/fire';

interface FlowListProps {
  maxItems?: number;
  showViewAll?: boolean;
}

// Rotation degrees for each flow type (IconArrow points right by default)
const FLOW_ROTATIONS: Record<string, number> = {
  income: -90,   // Point up
  expense: 90,   // Point down
  transfer: 0,   // Point right (for transfers)
};

export function FlowList({
  maxItems = 5,
  showViewAll = true,
}: FlowListProps) {
  // Use SWR hook for data fetching
  const { flows, isLoading } = useFlows({ limit: maxItems });

  const formatCurrency = (amount: number, curr: string) => {
    if (amount === 0) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getFlowColor = (type: FlowWithDetails['type']) => {
    switch (type) {
      case 'income':
        return retro.positive;
      case 'expense':
        return retro.negative;
      default:
        return retro.text;
    }
  };

  const getFlowSign = (type: FlowWithDetails['type']) => {
    switch (type) {
      case 'income':
        return '+';
      case 'expense':
        return '−';
      default:
        return '';
    }
  };

  const getFlowDescription = (flow: FlowWithDetails) => {
    if (flow.type === 'transfer') {
      return `${flow.from_asset?.name || 'Unknown'} → ${flow.to_asset?.name || 'Unknown'}`;
    }
    return flow.to_asset?.name || flow.from_asset?.name || '';
  };

  const displayFlows = flows;
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
        {displayFlows.length === 0 ? (
          <div
            className="flex-1 flex items-center justify-center text-xs"
            style={{ color: retro.muted }}
          >
            No flows yet. Click &quot;Record&quot; to get started.
          </div>
        ) : (
          <>
            {/* Scrollable flow list */}
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {displayFlows.map((flow) => {
                const rotation = FLOW_ROTATIONS[flow.type] || 0;
                return (
                  <div
                    key={flow.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded-sm"
                    style={{ backgroundColor: retro.surfaceLight }}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ color: getFlowColor(flow.type), transform: `rotate(${rotation}deg)`, display: 'inline-block' }}>
                        <IconArrow size={14} />
                      </span>
                      <div>
                        <p
                          className="text-xs font-medium capitalize"
                          style={{ color: retro.text }}
                        >
                          {flow.category || flow.type}
                        </p>
                        <p
                          className="text-[10px]"
                          style={{ color: retro.muted }}
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
                        {formatCurrency(flow.amount, flow.currency)}
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: retro.muted }}
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
                  href="/fire/flows"
                  className="text-xs font-medium transition-colors hover:underline"
                  style={{ color: retro.info }}
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
