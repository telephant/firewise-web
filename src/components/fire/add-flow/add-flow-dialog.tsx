'use client';

import {
  retroStyles,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  IconArrow,
  getCategoryIcon,
} from '@/components/fire/ui';
import { CategorySelector } from './category-selector';
import { useAddFlowForm } from './use-add-flow-form';
import { InvestFlowForm } from './invest-flow-form';
import { IncomeFlowForm } from './income-flow-form';
import { TransferFlowForm } from './transfer-flow-form';
import { ExpenseFlowForm } from './expense-flow-form';

interface AddFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: string;
}

export function AddFlowDialog({ open, onOpenChange, initialCategory }: AddFlowDialogProps) {
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

    // Computed
    filteredFromAssets,
    filteredToAssets,
    showFromField,
    showToField,
    computedPricePerShare,
    isUsStockInvestment,

    // Actions
    updateForm,
    updateNewAsset,
    handleCategorySelect,
    handleSaveLinkedLedgers,
    handleSubmit,
    handleInvestmentTypeChange,
    handleTickerSelect,
  } = useAddFlowForm({ open, onOpenChange, initialCategory });

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

    // Income flows (salary, bonus, dividend, interest, etc.)
    if (selectedPreset.flowType === 'income') {
      return <IncomeFlowForm {...commonProps} />;
    }

    // Transfer flows (transfer, pay_debt, sell, reinvest)
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
                  className="w-4 h-4 flex items-center justify-center transition-colors hover:bg-[#a0a0a0]"
                  style={retroStyles.windowButton}
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
          {step === 'category' ? (
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
