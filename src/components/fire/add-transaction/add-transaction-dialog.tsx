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
import { useAddTransactionForm } from './use-add-transaction-form';
import { TransactionFormContent } from './transaction-form-content';

import type { FlowFormState } from './types';

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: string;
  initialDebtId?: string;
  recurringOnly?: boolean; // If true, only create recurring schedule without a transaction
  initialFormData?: Partial<FlowFormState>; // Pre-fill form fields (for AI preview)
  onSubmitSuccess?: () => void; // Callback after successful submission
  /** For edit mode - the asset ID to edit */
  editAssetId?: string;
}

export function AddTransactionDialog({ open, onOpenChange, initialCategory, initialDebtId, recurringOnly, initialFormData, onSubmitSuccess, editAssetId }: AddTransactionDialogProps) {
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
    stockMarket,
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
  } = useAddTransactionForm({ open, onOpenChange, initialCategory, initialDebtId, recurringOnly, noAssetInterest, initialFormData, onSubmitSuccess, editAssetId });

  // Handle dialog open/close transitions
  // Reset form when dialog closes, initialize with category when it opens
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (!wasOpen && open) {
      // Dialog just opened (transition from closed to open)
      if (initialCategory) {
        initializeWithCategory(initialCategory, initialDebtId);
      }
    } else if (wasOpen && !open) {
      // Dialog just closed - reset form
      resetForm();
      setNoAssetInterest(false);
    }
  }, [open, initialCategory, initialDebtId, initializeWithCategory, resetForm]);

  // Handle initial mount with open=true and initialCategory (for preview mode)
  // This covers the case when dialog component is mounted already open
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (open && initialCategory && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      initializeWithCategory(initialCategory, initialDebtId);
    }
    // Reset flag when dialog closes
    if (!open) {
      hasInitializedRef.current = false;
    }
  }, [open, initialCategory, initialDebtId, initializeWithCategory]);

  // Render the appropriate form based on transaction type
  const renderTransactionForm = () => {
    if (!selectedPreset) return null;

    return (
      <TransactionFormContent
        selectedPreset={selectedPreset}
        form={form}
        formErrors={formErrors}
        newAsset={newAsset}
        loading={loading}
        filteredFromAssets={filteredFromAssets}
        filteredToAssets={filteredToAssets}
        cashAssets={cashAssets}
        allAssets={allAssets}
        showFromField={showFromField}
        showToField={showToField}
        computedPricePerShare={computedPricePerShare}
        isUsStockInvestment={isUsStockInvestment}
        stockMarket={stockMarket}
        interestSettingsMap={interestSettingsMap}
        expenseTab={expenseTab}
        setExpenseTab={setExpenseTab}
        savingLinkedLedgers={savingLinkedLedgers}
        linkedLedgers={linkedLedgers}
        noAssetInterest={noAssetInterest}
        onToggleNoAsset={handleToggleNoAsset}
        isEditMode={!!editAssetId}
        updateForm={updateForm}
        updateNewAsset={updateNewAsset}
        handleSubmit={handleSubmit}
        handleInvestmentTypeChange={handleInvestmentTypeChange}
        handleTickerSelect={handleTickerSelect}
        handleSaveLinkedLedgers={handleSaveLinkedLedgers}
        onCancel={() => onOpenChange(false)}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'category' ? 'Add Transaction' : (
              <div className="flex items-center gap-2">
                {!editAssetId && (
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
                )}
                <span className="inline-flex items-center gap-1.5">
                  {selectedPreset && getCategoryIcon(selectedPreset.id, 16)}
                  {editAssetId ? `Edit ${selectedPreset?.label}` : selectedPreset?.label}
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
            renderTransactionForm()
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
