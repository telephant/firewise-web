'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import {
  colors,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  IconArrow,
  getCategoryIcon,
} from '@/components/fire/ui';
import { CategorySelector } from './category-selector';
import { useAddFlowForm } from './use-add-flow-form';
import { InvestFlowForm } from './invest-flow-form';
import { IncomeFlowForm } from './income-flow-form';
import { DividendFlowForm } from './dividend-flow-form';
import { InterestFlowForm } from './interest-flow-form';
import { DepositFlowForm } from './deposit-flow-form';
import { TransferFlowForm } from './transfer-flow-form';
import { ExpenseFlowForm } from './expense-flow-form';
import { DebtFlowForm } from './debt-flow-form';
import { PayDebtFlowForm } from './pay-debt-flow-form';
import { SellFlowForm } from './sell-flow-form';
import { ReinvestFlowForm } from './reinvest-flow-form';
import { OtherFlowForm } from './other-flow-form';

interface AddFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: string;
  initialDebtId?: string;
  recurringOnly?: boolean; // If true, only create recurring schedule without a flow
}

export function AddFlowDialog({ open, onOpenChange, initialCategory, initialDebtId, recurringOnly }: AddFlowDialogProps) {
  // Track previous open state to detect transitions
  const prevOpenRef = useRef(open);
  const [noAssetInterest, setNoAssetInterest] = useState(false);

  const handleToggleNoAsset = useCallback((value: boolean) => {
    setNoAssetInterest(value);
  }, []);

  const {
    // State
    step,
    setStep,
    selectedPreset,
    loading,
    expenseTab,
    setExpenseTab,
    savingLinkedLedgers,
    form,
    formErrors,
    newAsset,
    showStartDateConfirm,

    // Computed
    filteredFromAssets,
    filteredToAssets,
    cashAssets,
    allAssets,
    showFromField,
    showToField,
    computedPricePerShare,
    isUsStockInvestment,
    interestSettingsMap,
    linkedLedgers,

    // Actions
    updateForm,
    updateNewAsset,
    handleCategorySelect,
    handleSaveLinkedLedgers,
    handleSubmit,
    handleInvestmentTypeChange,
    handleTickerSelect,
    resetForm,
    initializeWithCategory,
    handleStartToday,
    handleStartNextOccurrence,
  } = useAddFlowForm({ open, onOpenChange, initialCategory, initialDebtId, recurringOnly, noAssetInterest });

  // Handle dialog open/close transitions
  // Reset form when dialog closes, initialize with category when it opens
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (!wasOpen && open) {
      // Dialog just opened
      if (initialCategory) {
        initializeWithCategory(initialCategory, initialDebtId);
      }
    } else if (wasOpen && !open) {
      // Dialog just closed - reset form
      resetForm();
      setNoAssetInterest(false);
    }
  }, [open, initialCategory, initialDebtId, initializeWithCategory, resetForm]);

  // Render the appropriate form based on flow type
  const renderFlowForm = () => {
    if (!selectedPreset) return null;

    const commonProps = {
      selectedPreset,
      form,
      formErrors,
      newAsset,
      filteredFromAssets,
      filteredToAssets,
      showFromField,
      showToField,
      loading,
      updateForm,
      updateNewAsset,
      handleSubmit,
      onCancel: () => onOpenChange(false),
    };

    // Expense has special tabs UI
    if (selectedPreset.id === 'expense') {
      return (
        <ExpenseFlowForm
          {...commonProps}
          computedPricePerShare={computedPricePerShare}
          isUsStockInvestment={isUsStockInvestment}
          expenseTab={expenseTab}
          setExpenseTab={setExpenseTab}
          savingLinkedLedgers={savingLinkedLedgers}
          linkedLedgers={linkedLedgers}
          handleInvestmentTypeChange={handleInvestmentTypeChange}
          handleTickerSelect={handleTickerSelect}
          handleSaveLinkedLedgers={handleSaveLinkedLedgers}
        />
      );
    }

    // Invest flow (US Stock, etc.)
    if (selectedPreset.id === 'invest') {
      return (
        <InvestFlowForm
          {...commonProps}
          computedPricePerShare={computedPricePerShare}
          isUsStockInvestment={isUsStockInvestment}
          handleInvestmentTypeChange={handleInvestmentTypeChange}
          handleTickerSelect={handleTickerSelect}
        />
      );
    }

    // Dividend flow (special form with tax calculation)
    if (selectedPreset.id === 'dividend') {
      return <DividendFlowForm {...commonProps} />;
    }

    // Interest flow (special form with rate calculation)
    if (selectedPreset.id === 'interest') {
      return <InterestFlowForm {...commonProps} cashAssets={cashAssets} interestSettingsMap={interestSettingsMap} noAsset={noAssetInterest} onToggleNoAsset={handleToggleNoAsset} />;
    }

    // Deposit flow (with interest rate settings)
    if (selectedPreset.id === 'deposit') {
      return <DepositFlowForm {...commonProps} />;
    }

    // Debt flows (mortgage, loan)
    if (selectedPreset.id === 'add_mortgage' || selectedPreset.id === 'add_loan') {
      return <DebtFlowForm {...commonProps} />;
    }

    // Pay debt flow
    if (selectedPreset.id === 'pay_debt') {
      return (
        <PayDebtFlowForm
          {...commonProps}
          cashAssets={cashAssets}
        />
      );
    }

    // Sell flow (stocks, real estate)
    if (selectedPreset.id === 'sell') {
      return (
        <SellFlowForm
          {...commonProps}
          cashAssets={cashAssets}
        />
      );
    }

    // Reinvest flow (dividend reinvestment)
    if (selectedPreset.id === 'reinvest') {
      return <ReinvestFlowForm {...commonProps} />;
    }

    // Other flow (custom from/to)
    if (selectedPreset.id === 'other') {
      return <OtherFlowForm {...commonProps} allAssets={allAssets} />;
    }

    // Income flows (salary, bonus, etc.)
    if (selectedPreset.flowType === 'income') {
      return <IncomeFlowForm {...commonProps} />;
    }

    // Transfer flows (transfer, sell, reinvest)
    if (selectedPreset.flowType === 'transfer') {
      return <TransferFlowForm {...commonProps} />;
    }

    // Fallback - shouldn't reach here
    return <TransferFlowForm {...commonProps} />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'category' ? 'Record Flow' : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('category')}
                  className="w-4 h-4 flex items-center justify-center transition-colors hover:opacity-70"
                  style={{ backgroundColor: 'transparent', border: 'none' }}
                >
                  <span style={{ display: 'inline-block', transform: 'rotate(180deg)' }}>
                    <IconArrow size={8} />
                  </span>
                </button>
                <span className="inline-flex items-center gap-1.5">
                  {selectedPreset && getCategoryIcon(selectedPreset.id, 16)}
                  {selectedPreset?.label}
                </span>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          {showStartDateConfirm ? (
            // Confirmation for recurring start date
            <div className="space-y-4">
              <p className="text-sm" style={{ color: colors.text }}>
                The start date is today. Would you like to:
              </p>
              <div className="space-y-2">
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={handleStartToday}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create first flow today & set up recurring'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-center"
                  onClick={handleStartNextOccurrence}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Start from next occurrence only'}
                </Button>
              </div>
              <p className="text-xs" style={{ color: colors.muted }}>
                Choose &quot;next occurrence&quot; if this flow hasn&apos;t happened yet today.
              </p>
            </div>
          ) : step === 'category' ? (
            <CategorySelector
              selectedCategory={selectedPreset?.id || null}
              onSelect={handleCategorySelect}
            />
          ) : selectedPreset && (
            <div className="space-y-4">
              {renderFlowForm()}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
