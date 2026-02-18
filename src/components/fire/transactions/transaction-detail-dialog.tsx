'use client';

import {
  colors,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  getCategoryIcon,
  IconRepeat,
  Amount,
} from '@/components/fire/ui';
import { useRecurringSchedules } from '@/hooks/fire/use-fire-data';
import type { TransactionWithDetails } from '@/types/fire';

// Frequency labels
const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

interface FlowDetailDialogProps {
  flow: TransactionWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (flow: TransactionWithDetails) => void;
  onDelete?: (flow: TransactionWithDetails) => void;
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
      case 'income': return colors.positive;
      case 'expense': return colors.negative;
      default: return colors.text;
    }
  };

  const from = flow.from_asset?.name ||
    (flow.metadata as Record<string, unknown>)?.source_name as string ||
    'External';
  const to = flow.to_asset?.name || flow.debt?.name || 'External';

  // Extract metadata details
  const metadata = flow.metadata as Record<string, unknown> | null;
  const shares = flow.shares || (metadata?.shares as number | undefined);
  const pricePerShare = flow.price_per_share || (metadata?.price_per_share as number | undefined);
  const taxRate = metadata?.tax_rate as number | undefined;
  const taxWithheld = metadata?.tax_withheld as number | undefined;
  const costBasis = metadata?.cost_basis as number | undefined;

  // Calculate profit for sell transactions
  const isSellTransaction = flow.type === 'sell' || flow.category === 'sell';
  const profit = isSellTransaction && shares && costBasis
    ? flow.amount - (costBasis * shares)
    : undefined;
  const isProfit = profit !== undefined && profit >= 0;

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
                className="flex items-center gap-2 px-3 py-2 rounded-md text-xs"
                style={{
                  backgroundColor: `${colors.warning}20`,
                  border: `1px solid ${colors.warning}`,
                  color: colors.warning,
                }}
              >
                <span>⚠</span>
                <span>Under review - not included in stats until reviewed</span>
              </div>
            )}

            {/* Amount - show profit for sell transactions, otherwise show amount */}
            <div
              className="text-center py-4 rounded-md"
              style={{ backgroundColor: colors.surfaceLight }}
            >
              {/* Sell transactions: show profit as main, sell price as secondary */}
              {isSellTransaction && profit !== undefined ? (
                <>
                  <p
                    className="text-2xl font-bold tabular-nums"
                    style={{ color: isProfit ? colors.positive : colors.negative }}
                  >
                    {isProfit ? '+' : ''}<Amount value={profit} currency={flow.currency} size="2xl" weight="bold" color={isProfit ? 'positive' : 'negative'} />
                  </p>
                  <p className="text-xs mt-1" style={{ color: colors.muted }}>
                    Sold: <Amount value={flow.amount} currency={flow.currency} size="xs" color="muted" />
                  </p>
                </>
              ) : flow.converted_amount !== undefined && flow.converted_currency ? (
                <>
                  <p
                    className="text-2xl font-bold tabular-nums"
                    style={{ color: getFlowTypeColor(flow.type) }}
                  >
                    {flow.type === 'income' ? '+' : flow.type === 'expense' ? '−' : ''}<Amount value={flow.converted_amount} currency={flow.converted_currency} size="2xl" weight="bold" color={getFlowTypeColor(flow.type)} />
                  </p>
                  {flow.converted_currency !== flow.currency && (
                    <p className="text-xs mt-1" style={{ color: colors.muted }}>
                      (<Amount value={flow.amount} currency={flow.currency} size="xs" color="muted" />)
                    </p>
                  )}
                </>
              ) : (
                <p
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: getFlowTypeColor(flow.type) }}
                >
                  {flow.type === 'income' ? '+' : flow.type === 'expense' ? '−' : ''}<Amount value={flow.amount} currency={flow.currency} size="2xl" weight="bold" color={getFlowTypeColor(flow.type)} />
                </p>
              )}
              <p
                className="text-xs mt-2 px-2 py-0.5 rounded-md inline-block"
                style={{
                  backgroundColor: colors.surface,
                  color: isSellTransaction && profit !== undefined
                    ? (isProfit ? colors.positive : colors.negative)
                    : getFlowTypeColor(flow.type),
                  border: `1px solid ${colors.surfaceLight}`,
                }}
              >
                {isSellTransaction ? (isProfit ? 'Profit' : 'Loss') : getFlowTypeLabel(flow.type)}
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
                <DetailRow label="Shares" value={shares.toLocaleString()} />
              )}
              {pricePerShare !== undefined && (
                <DetailRow
                  label="Price/Share"
                  value={<Amount value={pricePerShare} currency={flow.currency} size="sm" />}
                />
              )}

              {/* Cost Basis (for sell transactions) */}
              {costBasis !== undefined && (
                <DetailRow
                  label="Cost Basis/Share"
                  value={<Amount value={costBasis} currency={flow.currency} size="sm" />}
                />
              )}

              {/* Tax Info (for dividends) */}
              {taxRate !== undefined && (
                <DetailRow
                  label={`${flow.from_asset?.market === 'SG' ? '🇸🇬' : '🇺🇸'} Tax Rate`}
                  value={`${(taxRate * 100).toFixed(0)}%`}
                />
              )}
              {taxWithheld !== undefined && (
                <DetailRow
                  label="Tax Withheld"
                  value={<Amount value={taxWithheld} currency={flow.currency} size="sm" />}
                />
              )}

              {/* Recurring Schedule */}
              {flow.schedule_id && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-xs"
                  style={{
                    backgroundColor: `${colors.info}15`,
                    border: `1px solid ${colors.info}40`,
                  }}
                >
                  <span style={{ color: colors.info }}>
                    <IconRepeat size={14} />
                  </span>
                  <div className="flex-1">
                    <span style={{ color: colors.text }}>
                      {schedule
                        ? FREQUENCY_LABELS[schedule.frequency] || schedule.frequency
                        : 'Recurring'}
                    </span>
                    {schedule && (
                      <span style={{ color: colors.muted }}>
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
                  style={{ color: colors.negative }}
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
  value: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs shrink-0" style={{ color: colors.muted }}>
        {label}
      </span>
      <span
        className="text-sm text-right"
        style={{ color: valueColor || colors.text }}
      >
        {value}
      </span>
    </div>
  );
}
