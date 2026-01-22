'use client';

import {
  retro,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  getCategoryIcon,
  IconRepeat,
} from '@/components/fire/ui';
import { formatCurrency } from '@/lib/fire/utils';
import { useRecurringSchedules } from '@/hooks/fire/use-fire-data';
import type { FlowWithDetails } from '@/types/fire';

// Frequency labels
const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

interface FlowDetailDialogProps {
  flow: FlowWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (flow: FlowWithDetails) => void;
  onDelete?: (flow: FlowWithDetails) => void;
}

export function FlowDetailDialog({
  flow,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: FlowDetailDialogProps) {
  // Fetch schedules to get recurring info (only when dialog is open with a flow)
  const { schedules } = useRecurringSchedules({ limit: 100 });

  // Find the schedule for this flow
  const schedule = flow?.schedule_id
    ? schedules.find((s) => s.id === flow.schedule_id)
    : null;

  if (!flow) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCategoryLabel = (category: string | null): string => {
    if (!category) return 'Other';
    const labels: Record<string, string> = {
      salary: 'Salary',
      bonus: 'Bonus',
      freelance: 'Freelance',
      rental: 'Rental Income',
      gift: 'Gift',
      dividend: 'Dividend',
      interest: 'Interest',
      invest: 'Investment',
      sell: 'Sell',
      reinvest: 'Reinvest (DRIP)',
      transfer: 'Transfer',
      deposit: 'Deposit',
      expense: 'Expense',
      pay_debt: 'Debt Payment',
      add_mortgage: 'Mortgage',
      add_loan: 'Loan',
    };
    return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getFlowTypeLabel = (type: string): string => {
    switch (type) {
      case 'income': return 'Money In';
      case 'expense': return 'Money Out';
      case 'transfer': return 'Transfer';
      default: return type;
    }
  };

  const getFlowTypeColor = (type: string): string => {
    switch (type) {
      case 'income': return retro.positive;
      case 'expense': return retro.negative;
      default: return retro.text;
    }
  };

  const from = flow.from_asset?.name ||
    (flow.metadata as Record<string, unknown>)?.source_name as string ||
    'External';
  const to = flow.to_asset?.name || flow.debt?.name || 'External';

  // Extract metadata details
  const metadata = flow.metadata as Record<string, unknown> | null;
  const shares = metadata?.shares as number | undefined;
  const pricePerShare = metadata?.price_per_share as number | undefined;
  const taxRate = metadata?.tax_rate as number | undefined;
  const taxWithheld = metadata?.tax_withheld as number | undefined;
  const realizedPL = metadata?.realized_pl as number | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              {getCategoryIcon(flow.category || flow.type, 18)}
              <span>{getCategoryLabel(flow.category)}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            {/* Under Review Warning */}
            {flow.needs_review && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-sm text-xs"
                style={{
                  backgroundColor: `${retro.warning}20`,
                  border: `1px solid ${retro.warning}`,
                  color: retro.warning,
                }}
              >
                <span>⚠</span>
                <span>Under review - not included in stats until reviewed</span>
              </div>
            )}

            {/* Amount - show converted as primary if available */}
            <div
              className="text-center py-4 rounded-sm"
              style={{ backgroundColor: retro.surfaceLight }}
            >
              {flow.converted_amount !== undefined && flow.converted_currency ? (
                <>
                  <p
                    className="text-2xl font-bold tabular-nums"
                    style={{ color: getFlowTypeColor(flow.type) }}
                  >
                    {flow.type === 'income' ? '+' : flow.type === 'expense' ? '−' : ''}
                    {formatCurrency(flow.converted_amount, { currency: flow.converted_currency })}
                  </p>
                  {flow.converted_currency !== flow.currency && (
                    <p className="text-xs mt-1" style={{ color: retro.muted }}>
                      ({formatCurrency(flow.amount, { currency: flow.currency })})
                    </p>
                  )}
                </>
              ) : (
                <p
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: getFlowTypeColor(flow.type) }}
                >
                  {flow.type === 'income' ? '+' : flow.type === 'expense' ? '−' : ''}
                  {formatCurrency(flow.amount, { currency: flow.currency })}
                </p>
              )}
              <p
                className="text-xs mt-2 px-2 py-0.5 rounded-sm inline-block"
                style={{
                  backgroundColor: retro.surface,
                  color: getFlowTypeColor(flow.type),
                  border: `1px solid ${retro.bevelMid}`,
                }}
              >
                {getFlowTypeLabel(flow.type)}
              </p>
            </div>

            {/* Details Grid */}
            <div className="space-y-3">
              {/* Date */}
              <DetailRow label="Date" value={formatDate(flow.date)} />

              {/* From → To */}
              <DetailRow label="From" value={from} />
              <DetailRow label="To" value={to} />

              {/* Description */}
              {flow.description && (
                <DetailRow label="Description" value={flow.description} />
              )}

              {/* Shares & Price (for investment flows) */}
              {shares !== undefined && (
                <DetailRow label="Shares" value={shares.toString()} />
              )}
              {pricePerShare !== undefined && (
                <DetailRow
                  label="Price/Share"
                  value={formatCurrency(pricePerShare, { currency: flow.currency })}
                />
              )}

              {/* Tax Info (for dividends) */}
              {taxRate !== undefined && (
                <DetailRow
                  label="Tax Rate"
                  value={`${(taxRate * 100).toFixed(0)}%`}
                />
              )}
              {taxWithheld !== undefined && (
                <DetailRow
                  label="Tax Withheld"
                  value={formatCurrency(taxWithheld, { currency: flow.currency })}
                />
              )}

              {/* Realized P/L (for sells) */}
              {realizedPL !== undefined && (
                <DetailRow
                  label="Realized P/L"
                  value={formatCurrency(realizedPL, { currency: flow.currency })}
                  valueColor={realizedPL >= 0 ? retro.positive : retro.negative}
                />
              )}

              {/* Recurring Schedule */}
              {flow.schedule_id && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-sm text-xs"
                  style={{
                    backgroundColor: `${retro.info}15`,
                    border: `1px solid ${retro.info}40`,
                  }}
                >
                  <span style={{ color: retro.info }}>
                    <IconRepeat size={14} />
                  </span>
                  <div className="flex-1">
                    <span style={{ color: retro.text }}>
                      {schedule
                        ? FREQUENCY_LABELS[schedule.frequency] || schedule.frequency
                        : 'Recurring'}
                    </span>
                    {schedule && (
                      <span style={{ color: retro.muted }}>
                        {' '}· Next: {formatDate(schedule.next_run_date)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2">
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onDelete(flow);
                    onOpenChange(false);
                  }}
                  style={{ color: retro.negative }}
                >
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {onEdit && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onEdit(flow);
                    onOpenChange(false);
                  }}
                >
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for detail rows
function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs shrink-0" style={{ color: retro.muted }}>
        {label}
      </span>
      <span
        className="text-sm text-right"
        style={{ color: valueColor || retro.text }}
      >
        {value}
      </span>
    </div>
  );
}
