'use client';

import {
  colors,
  Card,
  IconEdit,
  IconTrash,
  IconRepeat,
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  TableActionButton,
  Pagination,
} from '@/components/fire/ui';
import { formatCurrency } from '@/lib/fire/utils';
import { getCategoryIcon } from '@/components/fire/ui/category-icons';
import type { FlowWithDetails, FlowType } from '@/types/fire';

interface FlowsTableProps {
  flows: FlowWithDetails[];
  isLoading?: boolean;
  // Pagination
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  // Actions
  onRowClick?: (flow: FlowWithDetails) => void;
  onEdit?: (flow: FlowWithDetails) => void;
  onDelete?: (flow: FlowWithDetails) => void;
}

// Map flow categories to their parent type for coloring
const getCategoryType = (category: string | null, type: FlowType): 'income' | 'expense' | 'transfer' => {
  if (!category) return type as 'income' | 'expense' | 'transfer';

  const incomeCategories = ['salary', 'bonus', 'freelance', 'rental', 'gift', 'dividend', 'interest'];
  const expenseCategories = ['expense', 'invest', 'pay_debt'];
  const transferCategories = ['transfer', 'deposit', 'sell', 'reinvest'];

  if (incomeCategories.includes(category)) return 'income';
  if (expenseCategories.includes(category)) return 'expense';
  if (transferCategories.includes(category)) return 'transfer';

  return type as 'income' | 'expense' | 'transfer';
};

const COLUMNS = 'grid-cols-[80px_120px_1fr_100px_60px]';

export function FlowsTable({
  flows,
  isLoading = false,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onRowClick,
  onEdit,
  onDelete,
}: FlowsTableProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getFlowColor = (type: FlowType, category: string | null) => {
    const categoryType = getCategoryType(category, type);
    switch (categoryType) {
      case 'income':
        return colors.positive;
      case 'expense':
        return colors.negative;
      default:
        return colors.text;
    }
  };

  const getFlowSign = (type: FlowType, category: string | null) => {
    const categoryType = getCategoryType(category, type);
    switch (categoryType) {
      case 'income':
        return '+';
      case 'expense':
        return '−';
      default:
        return '';
    }
  };

  const getFromTo = (flow: FlowWithDetails) => {
    const from = flow.from_asset?.name || (flow.metadata as Record<string, unknown>)?.source_name as string || 'External';
    const to = flow.to_asset?.name || flow.debt?.name || 'External';
    return `${from} → ${to}`;
  };

  return (
    <Card>
      <Table>
        <TableHeader columns={COLUMNS}>
          <TableHeaderCell>Date</TableHeaderCell>
          <TableHeaderCell>Category</TableHeaderCell>
          <TableHeaderCell>From → To</TableHeaderCell>
          <TableHeaderCell align="right">Amount</TableHeaderCell>
          <TableHeaderCell />
        </TableHeader>

        <TableBody
          isLoading={isLoading}
          isEmpty={flows.length === 0}
          emptyMessage="No flows found"
        >
          {flows.map((flow, index) => (
            <TableRow
              key={flow.id}
              columns={COLUMNS}
              isLast={index === flows.length - 1}
              onClick={() => onRowClick?.(flow)}
              style={{
                backgroundColor: flow.needs_review ? `${colors.warning}15` : 'transparent',
                borderLeft: flow.needs_review ? `3px solid ${colors.warning}` : '3px solid transparent',
              }}
            >
              {/* Date */}
              <TableCell>
                <div className="flex items-center gap-1" style={{ color: colors.muted }}>
                  {formatDate(flow.date)}
                  {flow.needs_review && (
                    <span
                      title="Under review - not included in stats"
                      className="cursor-help"
                      style={{ color: colors.warning }}
                    >
                      ⚠
                    </span>
                  )}
                </div>
              </TableCell>

              {/* Category */}
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <span>{getCategoryIcon(flow.category || flow.type, 14)}</span>
                  <span
                    className="capitalize text-xs"
                    style={{ color: colors.text }}
                  >
                    {flow.category || flow.type}
                  </span>
                  {flow.schedule_id && (
                    <span
                      title="Recurring"
                      style={{ color: colors.info }}
                    >
                      <IconRepeat size={12} />
                    </span>
                  )}
                </div>
              </TableCell>

              {/* From → To */}
              <TableCell>
                <div
                  className="truncate text-xs"
                  style={{ color: colors.text }}
                >
                  {getFromTo(flow)}
                  {flow.description && (
                    <span style={{ color: colors.muted }}>
                      {' '}
                      · {flow.description}
                    </span>
                  )}
                </div>
              </TableCell>

              {/* Amount */}
              <TableCell align="right">
                {flow.converted_amount !== undefined && flow.converted_currency ? (
                  <>
                    <div
                      className="font-bold tabular-nums"
                      style={{ color: getFlowColor(flow.type, flow.category) }}
                    >
                      {getFlowSign(flow.type, flow.category)}
                      {formatCurrency(flow.converted_amount, { currency: flow.converted_currency })}
                    </div>
                    {flow.converted_currency !== flow.currency && (
                      <div
                        className="text-[10px] tabular-nums"
                        style={{ color: colors.muted }}
                      >
                        ({formatCurrency(flow.amount, { currency: flow.currency })})
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    className="font-bold tabular-nums"
                    style={{ color: getFlowColor(flow.type, flow.category) }}
                  >
                    {getFlowSign(flow.type, flow.category)}
                    {formatCurrency(flow.amount, { currency: flow.currency })}
                  </div>
                )}
              </TableCell>

              {/* Actions */}
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  {onEdit && (
                    <TableActionButton
                      icon={<IconEdit size={14} />}
                      onClick={() => onEdit(flow)}
                      title="Edit"
                    />
                  )}
                  {onDelete && (
                    <TableActionButton
                      icon={<IconTrash size={14} />}
                      onClick={() => onDelete(flow)}
                      title="Delete"
                      color={colors.negative}
                    />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />
    </Card>
  );
}
