'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  colors,
  Card,
  Button,
  Loader,
  IconDebt,
  IconHome,
  IconEdit,
  IconPlus,
} from '@/components/fire/ui';
import { useDebts } from '@/hooks/fire/use-fire-data';
import { formatCurrency, formatPercent } from '@/lib/fire/utils';
import type { Debt, DebtType } from '@/types/fire';
import { DEBT_TYPE_LABELS } from '@/types/fire';
import { EditDebtDialog } from './edit-debt-dialog';
import { AddTransactionDialog } from '@/components/fire/add-transaction';

interface DebtListProps {
  maxItems?: number;
}

const DEBT_ICONS: Record<DebtType, React.ComponentType<{ size?: number; className?: string }>> = {
  mortgage: IconHome,
  personal_loan: IconDebt,
  credit_card: IconDebt,
  student_loan: IconDebt,
  auto_loan: IconDebt,
  other: IconDebt,
};

export function DebtList({ maxItems = 4 }: DebtListProps) {
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentDebtId, setPaymentDebtId] = useState<string | undefined>(undefined);

  // Fetch debts from the dedicated debts table
  const { debts: allDebts, total: totalDebtCount, isLoading } = useDebts();

  // Limit display to maxItems
  const displayDebts = useMemo(() => {
    return allDebts.slice(0, maxItems);
  }, [allDebts, maxItems]);

  // Calculate total debt from current_balance
  const totalDebt = useMemo(() => {
    return allDebts.reduce((sum, debt) => sum + debt.current_balance, 0);
  }, [allDebts]);

  const handleDebtClick = (debt: Debt) => {
    setSelectedDebt(debt);
    setEditDialogOpen(true);
  };

  const handleMakePayment = (debt: Debt) => {
    setPaymentDebtId(debt.id);
    setPaymentDialogOpen(true);
  };

  const handleAddDebt = () => {
    // TODO: Open add debt dialog
    toast.info('Use "Record > Add Loan" or "Add Mortgage" to add debts');
  };

  const CARD_HEIGHT = '220px';

  if (isLoading) {
    return (
      <Card title="Debts" contentHeight={CARD_HEIGHT}>
        <div className="h-full flex items-center justify-center">
          <Loader size="md" variant="bar" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Debts"
      contentHeight={CARD_HEIGHT}
      action={
        <Button
          size="sm"
          variant="ghost"
          onClick={handleAddDebt}
          className="!px-1.5 !py-0.5"
          title="Add debt"
        >
          <IconPlus size={12} />
        </Button>
      }
    >
      <div className="h-full flex flex-col">
        {displayDebts.length === 0 ? (
          <div
            className="flex-1 flex items-center justify-center text-xs"
            style={{ color: colors.muted }}
          >
            No debts tracked. That&apos;s great!
          </div>
        ) : (
          <>
            {/* Scrollable debt list */}
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {displayDebts.map((debt) => {
                const IconComponent = DEBT_ICONS[debt.debt_type] || IconDebt;

                return (
                  <div
                    key={debt.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md"
                    style={{ backgroundColor: colors.surfaceLight }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span style={{ color: colors.negative }} className="flex-shrink-0">
                        <IconComponent size={14} />
                      </span>
                      <div className="min-w-0">
                        <p
                          className="text-xs font-medium truncate"
                          style={{ color: colors.text }}
                        >
                          {debt.name}
                        </p>
                        <p
                          className="text-[10px]"
                          style={{ color: colors.muted }}
                        >
                          {DEBT_TYPE_LABELS[debt.debt_type]}
                          {debt.interest_rate && (
                            <span style={{ color: colors.negative }}>
                              {' '}{formatPercent(debt.interest_rate * 100)} APR
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className="text-right">
                        <p
                          className="text-xs font-bold tabular-nums"
                          style={{ color: colors.negative }}
                        >
                          {formatCurrency(-debt.current_balance, { currency: debt.currency })}
                        </p>
                        {/* Show converted balance when available and different currency */}
                        {debt.converted_balance !== undefined &&
                         debt.converted_currency &&
                         debt.converted_currency !== debt.currency && (
                          <p
                            className="text-[10px] tabular-nums"
                            style={{ color: colors.muted }}
                          >
                            ≈ {formatCurrency(-debt.converted_balance, {
                              currency: debt.converted_currency,
                            })}
                          </p>
                        )}
                      </div>
                      {debt.current_balance > 0 && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleMakePayment(debt)}
                          className="!px-1.5 !py-0.5 !text-[10px]"
                          title="Make payment"
                        >
                          Pay
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDebtClick(debt)}
                        className="!px-1 !py-0.5"
                        title="Edit debt"
                      >
                        <IconEdit size={12} />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {/* Show more indicator */}
              {totalDebtCount > maxItems && (
                <p
                  className="text-[10px] text-center pt-1"
                  style={{ color: colors.muted }}
                >
                  +{totalDebtCount - maxItems} more
                </p>
              )}
            </div>

            {/* Total Row - fixed at bottom */}
            <div
              className="flex items-center justify-between pt-2 mt-2 px-2 flex-shrink-0"
              style={{ borderTop: `1px solid ${colors.surfaceLight}` }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: colors.muted }}
              >
                Total Owed
              </span>
              <span
                className="text-sm font-bold tabular-nums"
                style={{ color: colors.negative }}
              >
                {formatCurrency(-totalDebt)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Edit Debt Dialog */}
      <EditDebtDialog
        debt={selectedDebt}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onMakePayment={handleMakePayment}
      />

      {/* Payment Dialog - Only render when open */}
      {paymentDialogOpen && (
        <AddTransactionDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          initialCategory="pay_debt"
          initialDebtId={paymentDebtId}
        />
      )}
    </Card>
  );
}
