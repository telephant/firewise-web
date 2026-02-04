'use client';

import {
  colors,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  SimpleProgressBar,
  IconDebt,
  IconHome,
  IconCreditCard,
  IconBox,
} from '@/components/fire/ui';
import { formatCurrency, formatPercent, formatDate } from '@/lib/fire/utils';
import type { Debt, DebtType } from '@/types/fire';
import { DEBT_TYPE_LABELS } from '@/types/fire';

interface DebtDetailDialogProps {
  debt: Debt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function DebtDetailDialog({
  debt,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onMakePayment,
}: DebtDetailDialogProps) {
  if (!debt) return null;

  const IconComponent = DEBT_ICONS[debt.debt_type] || DEBT_ICONS.other;

  // Get display value with currency conversion
  const displayValue = debt.converted_balance ?? debt.current_balance;
  const displayCurrency = debt.converted_currency ?? debt.currency;

  // Calculate progress
  const progress = debt.principal > 0
    ? Math.min(100, Math.max(0, ((debt.principal - debt.current_balance) / debt.principal) * 100))
    : 0;

  // Calculate remaining months (if we have monthly payment)
  const remainingMonths = debt.monthly_payment && debt.monthly_payment > 0
    ? Math.ceil(debt.current_balance / debt.monthly_payment)
    : null;

  const hasConvertedCurrency = debt.converted_currency && debt.converted_currency !== debt.currency;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span style={{ color: colors.negative }}>
              <IconComponent size={18} />
            </span>
            {debt.name}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            {/* Main Balance Display */}
            <div className="text-center py-4">
              <div
                className="text-3xl font-bold tabular-nums"
                style={{ color: colors.negative }}
              >
                {formatCurrency(displayValue, { currency: displayCurrency })}
              </div>
              {hasConvertedCurrency && (
                <div className="text-sm mt-1" style={{ color: colors.muted }}>
                  ({formatCurrency(debt.current_balance, { currency: debt.currency })})
                </div>
              )}
              <div className="text-xs mt-2" style={{ color: colors.muted }}>
                Current Balance
              </div>
            </div>

            {/* Progress Bar */}
            <div className="px-2">
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: colors.muted }}>Paid Off</span>
                <span style={{ color: colors.text }}>{Math.round(progress)}%</span>
              </div>
              <SimpleProgressBar
                value={progress}
                size="sm"
                color={progress >= 100 ? colors.positive : colors.accent}
              />
              <div className="flex justify-between text-[10px] mt-1" style={{ color: colors.muted }}>
                <span>{formatCurrency(debt.principal - debt.current_balance, { currency: debt.currency })} paid</span>
                <span>{formatCurrency(debt.principal, { currency: debt.currency })} total</span>
              </div>
            </div>

            {/* Details Grid */}
            <div
              className="grid grid-cols-2 gap-3 p-3 rounded-md"
              style={{ backgroundColor: colors.surfaceLight }}
            >
              <DetailItem
                label="Type"
                value={DEBT_TYPE_LABELS[debt.debt_type]}
              />
              <DetailItem
                label="Interest Rate"
                value={debt.interest_rate ? `${formatPercent(debt.interest_rate * 100)} APR` : '—'}
              />
              <DetailItem
                label="Original Loan"
                value={formatCurrency(debt.principal, { currency: debt.currency })}
              />
              <DetailItem
                label="Monthly Payment"
                value={debt.monthly_payment
                  ? formatCurrency(debt.monthly_payment, { currency: debt.currency })
                  : '—'
                }
              />
              {debt.term_months && (
                <DetailItem
                  label="Loan Term"
                  value={`${debt.term_months} months`}
                />
              )}
              {remainingMonths && debt.current_balance > 0 && (
                <DetailItem
                  label="Est. Remaining"
                  value={`~${remainingMonths} months`}
                />
              )}
              {debt.start_date && (
                <DetailItem
                  label="Start Date"
                  value={formatDate(debt.start_date)}
                />
              )}
              <DetailItem
                label="Status"
                value={
                  <span
                    style={{
                      color: debt.status === 'paid_off' ? colors.positive : colors.text,
                    }}
                  >
                    {debt.status === 'paid_off' ? 'Paid Off' : 'Active'}
                  </span>
                }
              />
            </div>

            {/* Last Updated */}
            {debt.balance_updated_at && (
              <div className="text-[10px] text-center" style={{ color: colors.muted }}>
                Balance updated {formatDate(debt.balance_updated_at)}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {debt.status !== 'paid_off' && debt.current_balance > 0 && onMakePayment && (
                <Button
                  variant="primary"
                  onClick={() => {
                    onOpenChange(false);
                    onMakePayment(debt);
                  }}
                  className="flex-1"
                >
                  Make Payment
                </Button>
              )}
              {debt.status !== 'paid_off' && onEdit && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit(debt);
                  }}
                >
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    onOpenChange(false);
                    onDelete(debt);
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: colors.muted }}>
        {label}
      </div>
      <div className="text-xs font-medium" style={{ color: colors.text }}>
        {value}
      </div>
    </div>
  );
}
