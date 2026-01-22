'use client';

import {
  retro,
  retroStyles,
  Card,
  Loader,
  FilterDropdown,
  SimpleProgressBar,
  IconDebt,
  IconHome,
  IconCreditCard,
  IconBox,
  IconEdit,
  IconTrash,
} from '@/components/fire/ui';
import type { FilterOption } from '@/components/fire/ui';
import { formatCurrency, formatPercent } from '@/lib/fire/utils';
import type { Debt, DebtType, DebtStatus } from '@/types/fire';

type StatusFilter = DebtStatus | 'all';

interface DebtsTableProps {
  debts: Debt[];
  isLoading?: boolean;
  // Pagination
  currentPage: number;
  totalPages: number;
  totalCount: number;
  totalValue: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  // Filters
  selectedType: DebtType | 'all';
  onTypeChange: (type: DebtType | 'all') => void;
  selectedStatus: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currency: string;
  // Actions
  onRowClick?: (debt: Debt) => void;
  onEdit?: (debt: Debt) => void;
  onDelete?: (debt: Debt) => void;
  onMakePayment?: (debt: Debt) => void;
}

const DEBT_ICONS: Record<DebtType, React.ComponentType<{ size?: number; className?: string }>> = {
  mortgage: IconHome,
  personal_loan: IconDebt,
  credit_card: IconCreditCard,
  student_loan: IconDebt,
  auto_loan: IconDebt,
  other: IconBox,
};

const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  mortgage: 'Mortgage',
  personal_loan: 'Personal Loan',
  credit_card: 'Credit Card',
  student_loan: 'Student Loan',
  auto_loan: 'Auto Loan',
  other: 'Other',
};

const TYPE_OPTIONS: FilterOption[] = [
  { id: 'mortgage', label: 'Mortgage', icon: <IconHome size={14} /> },
  { id: 'personal_loan', label: 'Personal Loan', icon: <IconDebt size={14} /> },
  { id: 'credit_card', label: 'Credit Card', icon: <IconCreditCard size={14} /> },
  { id: 'student_loan', label: 'Student Loan', icon: <IconDebt size={14} /> },
  { id: 'auto_loan', label: 'Auto Loan', icon: <IconDebt size={14} /> },
  { id: 'other', label: 'Other', icon: <IconBox size={14} /> },
];

const STATUS_OPTIONS: FilterOption[] = [
  { id: 'active', label: 'Active' },
  { id: 'paid_off', label: 'Paid Off' },
];

export function DebtsTable({
  debts,
  isLoading = false,
  currentPage,
  totalPages,
  totalCount,
  totalValue,
  pageSize,
  onPageChange,
  selectedType,
  onTypeChange,
  selectedStatus,
  onStatusChange,
  searchQuery,
  onSearchChange,
  currency,
  onRowClick,
  onEdit,
  onDelete,
  onMakePayment,
}: DebtsTableProps) {
  // Get debt value with currency conversion
  const getDebtValue = (debt: Debt): { value: number; currency: string } => {
    if (debt.converted_balance !== undefined && debt.converted_currency) {
      return { value: debt.converted_balance, currency: debt.converted_currency };
    }
    return { value: debt.current_balance, currency: debt.currency };
  };

  // Calculate progress (paid off percentage)
  const getPayoffProgress = (debt: Debt): number => {
    // Paid off debts are always 100%
    if (debt.status === 'paid_off') return 100;
    if (debt.principal <= 0) return 0;
    const paid = debt.principal - debt.current_balance;
    return Math.min(100, Math.max(0, (paid / debt.principal) * 100));
  };

  // Calculate display range
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const TABLE_BODY_HEIGHT = 400;

  return (
    <Card>
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Type Dropdown */}
        <FilterDropdown
          options={TYPE_OPTIONS}
          value={selectedType}
          onChange={(val) => onTypeChange(val as DebtType | 'all')}
          allLabel="All Types"
          allValue="all"
        />

        {/* Status Dropdown */}
        <FilterDropdown
          options={STATUS_OPTIONS}
          value={selectedStatus}
          onChange={(val) => onStatusChange(val as StatusFilter)}
          allLabel="All Status"
          allValue="all"
        />

        {/* Search */}
        <div className="flex-1 min-w-[150px] max-w-[250px]">
          <input
            type="text"
            placeholder="Search debts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-sm"
            style={{
              ...retroStyles.sunken,
              color: retro.text,
            }}
          />
        </div>

        {/* Total Value */}
        <div className="ml-auto text-right">
          <span className="text-xs" style={{ color: retro.muted }}>
            Total Owed:{' '}
          </span>
          <span className="text-sm font-bold tabular-nums" style={{ color: retro.negative }}>
            {formatCurrency(totalValue, { currency })}
          </span>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-sm overflow-hidden"
        style={{
          border: `2px solid ${retro.border}`,
        }}
      >
        {/* Table Header */}
        <div
          className="grid grid-cols-[1fr_100px_100px_100px_80px_70px_60px] gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wide"
          style={{
            backgroundColor: retro.bevelMid,
            color: retro.text,
            borderBottom: `2px solid ${retro.border}`,
          }}
        >
          <div>Name</div>
          <div>Type</div>
          <div className="text-right">Balance</div>
          <div className="text-right">Payment</div>
          <div className="text-right">Progress</div>
          <div>Status</div>
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
          ) : debts.length === 0 ? (
            <div
              className="flex items-center justify-center text-xs"
              style={{ color: retro.muted, height: TABLE_BODY_HEIGHT }}
            >
              No debts found
            </div>
          ) : (
            debts.map((debt, index) => {
              const IconComponent = DEBT_ICONS[debt.debt_type] || DEBT_ICONS.other;
              const { value, currency: valueCurrency } = getDebtValue(debt);
              const progress = getPayoffProgress(debt);
              const hasPayment = debt.current_balance > 0;

              return (
                <div
                  key={debt.id}
                  className="grid grid-cols-[1fr_100px_100px_100px_80px_70px_60px] gap-2 px-3 py-2 items-center text-sm group hover:bg-[var(--hover)] cursor-pointer"
                  style={{
                    '--hover': retro.surface,
                    borderBottom:
                      index < debts.length - 1
                        ? `1px solid ${retro.bevelMid}`
                        : 'none',
                  } as React.CSSProperties}
                  onClick={() => onRowClick?.(debt)}
                >
                  {/* Name */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{ color: retro.negative }} className="flex-shrink-0">
                      <IconComponent size={14} />
                    </span>
                    <div className="min-w-0">
                      <p
                        className="text-xs font-medium truncate"
                        style={{ color: retro.text }}
                      >
                        {debt.name}
                      </p>
                      {debt.interest_rate && (
                        <p className="text-[10px]" style={{ color: retro.muted }}>
                          {formatPercent(debt.interest_rate * 100)} APR
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Type */}
                  <div className="text-xs" style={{ color: retro.muted }}>
                    {DEBT_TYPE_LABELS[debt.debt_type]}
                  </div>

                  {/* Balance */}
                  <div className="text-right">
                    <div
                      className="text-xs font-bold tabular-nums"
                      style={{ color: retro.negative }}
                    >
                      {formatCurrency(value, { currency: valueCurrency })}
                    </div>
                    {/* Show original amount if displaying converted */}
                    {debt.converted_balance !== undefined &&
                      debt.converted_currency &&
                      debt.converted_currency !== debt.currency && (
                        <div
                          className="text-[10px] tabular-nums"
                          style={{ color: retro.muted }}
                        >
                          ({formatCurrency(debt.current_balance, { currency: debt.currency })})
                        </div>
                      )}
                  </div>

                  {/* Monthly Payment */}
                  <div className="text-right">
                    {debt.monthly_payment ? (
                      <span
                        className="text-xs tabular-nums"
                        style={{ color: retro.text }}
                      >
                        {formatCurrency(debt.monthly_payment, { currency: debt.currency })}/mo
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: retro.muted }}>
                        —
                      </span>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <SimpleProgressBar
                        value={progress}
                        size="sm"
                        color={progress >= 100 ? retro.positive : retro.accent}
                        className="w-12"
                      />
                      <span className="text-[10px] tabular-nums" style={{ color: retro.muted }}>
                        {Math.round(progress)}%
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-sm"
                      style={{
                        backgroundColor: debt.status === 'paid_off' ? retro.positive + '20' : retro.accent + '20',
                        color: debt.status === 'paid_off' ? retro.positive : retro.accent,
                      }}
                    >
                      {debt.status === 'paid_off' ? 'Paid Off' : 'Active'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    {debt.status === 'paid_off' ? (
                      // Paid off - only show delete
                      onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(debt);
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
                      )
                    ) : (
                      // Active - show edit and delete
                      <>
                        {onEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(debt);
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
                              onDelete(debt);
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
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination */}
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
    </Card>
  );
}
