'use client';

import { retro, retroStyles, Card, Loader, IconEdit, IconTrash, Tag, IconRepeat } from '@/components/fire/ui';
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
        return retro.positive;
      case 'expense':
        return retro.negative;
      default:
        return retro.text;
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

  // Calculate display range
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  // Fixed height for table body (fits ~10 rows at 36px each)
  const TABLE_BODY_HEIGHT = 400;

  return (
    <Card>
      {/* Table */}
      <div
        className="rounded-sm overflow-hidden"
        style={{
          border: `2px solid ${retro.border}`,
        }}
      >
        {/* Table Header */}
        <div
          className="grid grid-cols-[80px_120px_1fr_100px_60px] gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wide"
          style={{
            backgroundColor: retro.bevelMid,
            color: retro.text,
            borderBottom: `2px solid ${retro.border}`,
          }}
        >
          <div>Date</div>
          <div>Category</div>
          <div>From → To</div>
          <div className="text-right">Amount</div>
          <div></div>
        </div>

        {/* Table Body - Fixed Height */}
        <div
          style={{
            backgroundColor: retro.surfaceLight,
            height: TABLE_BODY_HEIGHT,
            overflowY: 'auto',
          }}
        >
          {isLoading ? (
            <div
              className="flex items-center justify-center"
              style={{ height: TABLE_BODY_HEIGHT }}
            >
              <Loader size="md" variant="bar" />
            </div>
          ) : flows.length === 0 ? (
            <div
              className="flex items-center justify-center text-xs"
              style={{ color: retro.muted, height: TABLE_BODY_HEIGHT }}
            >
              No flows found
            </div>
          ) : (
                flows.map((flow, index) => (
                  <div
                    key={flow.id}
                    className="grid grid-cols-[80px_120px_1fr_100px_60px] gap-2 px-3 py-2 items-center text-sm group hover:bg-[var(--hover)] cursor-pointer"
                    style={{
                      '--hover': retro.surface,
                      backgroundColor: flow.needs_review ? `${retro.warning}15` : 'transparent',
                      borderLeft: flow.needs_review ? `3px solid ${retro.warning}` : '3px solid transparent',
                      borderBottom:
                        index < flows.length - 1
                          ? `1px solid ${retro.bevelMid}`
                          : 'none',
                    } as React.CSSProperties}
                    onClick={() => onRowClick?.(flow)}
                  >
                    {/* Date */}
                    <div className="flex items-center gap-1" style={{ color: retro.muted }}>
                      {formatDate(flow.date)}
                      {flow.needs_review && (
                        <span
                          title="Under review - not included in stats"
                          className="cursor-help"
                          style={{ color: retro.warning }}
                        >
                          ⚠
                        </span>
                      )}
                    </div>

                    {/* Category */}
                    <div className="flex items-center gap-1.5">
                      <span>{getCategoryIcon(flow.category || flow.type, 14)}</span>
                      <span
                        className="capitalize text-xs"
                        style={{ color: retro.text }}
                      >
                        {flow.category || flow.type}
                      </span>
                      {flow.schedule_id && (
                        <span
                          title="Recurring"
                          style={{ color: retro.info }}
                        >
                          <IconRepeat size={12} />
                        </span>
                      )}
                    </div>

                    {/* From → To */}
                    <div
                      className="truncate text-xs"
                      style={{ color: retro.text }}
                    >
                      {getFromTo(flow)}
                      {flow.description && (
                        <span style={{ color: retro.muted }}>
                          {' '}
                          · {flow.description}
                        </span>
                      )}
                    </div>

                    {/* Amount - show converted as primary if available */}
                    <div className="text-right">
                      {flow.converted_amount !== undefined && flow.converted_currency ? (
                        <>
                          <div
                            className="font-bold tabular-nums"
                            style={{ color: getFlowColor(flow.type, flow.category) }}
                          >
                            {getFlowSign(flow.type, flow.category)}
                            {formatCurrency(flow.converted_amount, { currency: flow.converted_currency })}
                          </div>
                          {/* Show original amount if different currency */}
                          {flow.converted_currency !== flow.currency && (
                            <div
                              className="text-[10px] tabular-nums"
                              style={{ color: retro.muted }}
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
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1">
                      {onEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(flow);
                          }}
                          className="p-1 rounded-sm hover:bg-[var(--hover)]"
                          style={{
                            color: retro.muted,
                            '--hover': retro.bevelMid,
                          } as React.CSSProperties}
                          title="Edit"
                        >
                          <IconEdit size={14} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(flow);
                          }}
                          className="p-1 rounded-sm hover:bg-[var(--hover)]"
                          style={{
                            color: retro.negative,
                            '--hover': retro.bevelMid,
                          } as React.CSSProperties}
                          title="Delete"
                        >
                          <IconTrash size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div
          className="flex items-center justify-between mt-3 pt-3"
          style={{ borderTop: `1px solid ${retro.border}` }}
        >
          <div className="text-xs" style={{ color: retro.muted }}>
            {totalCount > 0 ? `Showing ${startItem}-${endItem} of ${totalCount}` : 'No results'}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs rounded-sm disabled:opacity-50"
                style={{
                  ...retroStyles.raised,
                  color: retro.text,
                }}
              >
                ««
              </button>
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs rounded-sm disabled:opacity-50"
                style={{
                  ...retroStyles.raised,
                  color: retro.text,
                }}
              >
                «
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className="px-2 py-1 text-xs rounded-sm min-w-[28px]"
                    style={
                      currentPage === pageNum
                        ? {
                            ...retroStyles.sunken,
                            color: retro.text,
                            fontWeight: 'bold',
                          }
                        : {
                            ...retroStyles.raised,
                            color: retro.text,
                          }
                    }
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs rounded-sm disabled:opacity-50"
                style={{
                  ...retroStyles.raised,
                  color: retro.text,
                }}
              >
                »
              </button>
              <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs rounded-sm disabled:opacity-50"
                style={{
                  ...retroStyles.raised,
                  color: retro.text,
                }}
              >
                »»
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
