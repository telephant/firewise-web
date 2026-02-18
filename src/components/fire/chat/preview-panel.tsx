'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { colors, getCategoryIcon } from '@/components/fire/ui';
import { getInitialCategory, getPresetFromCategory } from './preview-mapper';
import { useAddTransactionForm } from '@/components/fire/add-transaction';
import { TransactionFormContent } from '@/components/fire/add-transaction';
import type { AIPreviewData } from '@/lib/fire/chat-api';
import { cn } from '@/lib/utils';

interface PreviewPanelProps {
  previewData: AIPreviewData;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PreviewPanel({ previewData, onConfirm, onCancel }: PreviewPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [noAssetInterest, setNoAssetInterest] = useState(false);

  // Get category for initialization
  const category = getInitialCategory(previewData);
  const preset = getPresetFromCategory(category);

  // Map preview data to initial form data - memoize to prevent infinite loop
  const initialFormData = useMemo(() => {
    // For dividend flows, the stock (from_asset_id) is the source of dividend
    // AI might send stock in to_asset_id, so handle both cases
    const isDividend = category === 'dividend';
    const fromAssetId = previewData.from_asset_id || (isDividend ? previewData.to_asset_id : '') || '';
    const toAssetId = isDividend && !previewData.from_asset_id && previewData.to_asset_id
      ? '' // If we moved to_asset_id to fromAssetId, clear toAssetId
      : (previewData.to_asset_id || '');

    return {
      amount: previewData.amount?.toString() || '',
      currency: previewData.currency || 'USD',
      date: previewData.date || new Date().toISOString().split('T')[0],
      description: previewData.description || '',
      shares: previewData.shares?.toString() || '',
      selectedTicker: previewData.ticker || '',
      selectedTickerName: previewData.ticker || '',
      fromAssetId,
      toAssetId,
      debtId: previewData.debt_id || '',
      // For invest flows with ticker, set investment type to us_stock
      ...(category === 'invest' && previewData.ticker ? { investmentType: 'us_stock' as const } : {}),
    };
  }, [previewData.amount, previewData.currency, previewData.date, previewData.description, previewData.shares, previewData.ticker, previewData.from_asset_id, previewData.to_asset_id, previewData.debt_id, category]);

  // Use the shared form hook
  const {
    step,
    selectedPreset,
    loading,
    expenseTab,
    setExpenseTab,
    savingLinkedLedgers,
    form,
    formErrors,
    newAsset,
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
    updateForm,
    updateNewAsset,
    handleSubmit: originalHandleSubmit,
    handleInvestmentTypeChange,
    handleTickerSelect,
    handleSaveLinkedLedgers,
  } = useAddTransactionForm({
    open: true,
    onOpenChange: (open) => {
      if (!open) onCancel();
    },
    initialCategory: category,
    initialFormData,
    onSubmitSuccess: onConfirm,
    noAssetInterest,
  });

  // Note: Form initialization is now handled automatically in useAddTransactionForm
  // when initialCategory and initialFormData are provided

  // Trigger entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleToggleNoAsset = useCallback((value: boolean) => {
    setNoAssetInterest(value);
  }, []);

  // Don't render until we have a preset
  if (!selectedPreset) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute inset-0 z-40 flex items-center justify-center p-6",
        "transition-all duration-300 ease-out"
      )}
      style={{
        backgroundColor: isVisible ? 'rgba(10, 10, 11, 0.9)' : 'rgba(10, 10, 11, 0)',
        backdropFilter: isVisible ? 'blur(4px)' : 'blur(0px)',
      }}
    >
      {/* Floating indicator pointing to chat */}
      <div
        className={cn(
          "absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2",
          "transition-all duration-500 delay-300",
          isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
        )}
      >
        <div
          className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5"
          style={{
            backgroundColor: colors.accent,
            color: '#fff',
          }}
        >
          <Sparkles size={12} />
          From AI
        </div>
        <ArrowRight size={16} style={{ color: colors.accent }} />
      </div>

      {/* Main card */}
      <div
        className={cn(
          "w-full max-w-md max-h-[90vh] rounded-2xl overflow-hidden flex flex-col",
          "transition-all duration-300 ease-out",
          isVisible
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
        )}
        style={{
          backgroundColor: colors.surface,
          boxShadow: isVisible
            ? `0 0 0 1px ${colors.border}, 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px -8px ${colors.accent}30`
            : 'none',
        }}
      >
        {/* Action Required Banner */}
        <div
          className="px-5 py-3 flex items-center gap-2 shrink-0"
          style={{
            background: `linear-gradient(135deg, ${colors.accent}20 0%, ${colors.accent}10 100%)`,
            borderBottom: `1px solid ${colors.accent}30`,
          }}
        >
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: colors.accent }}
          />
          <span className="text-sm font-medium" style={{ color: colors.accent }}>
            Review Transaction
          </span>
          <span className="text-sm" style={{ color: colors.muted }}>
            — Edit if needed, then confirm
          </span>
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: colors.surfaceLight }}
            >
              {getCategoryIcon(selectedPreset.id, 22)}
            </div>
            <div>
              <div className="text-base font-medium" style={{ color: colors.text }}>
                {selectedPreset.label}
              </div>
              {previewData.ticker && (
                <div className="text-sm" style={{ color: colors.muted }}>
                  {previewData.ticker}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg transition-colors hover:bg-white/[0.08]"
            style={{ color: colors.muted }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-5">
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
            updateForm={updateForm}
            updateNewAsset={updateNewAsset}
            handleSubmit={originalHandleSubmit}
            handleInvestmentTypeChange={handleInvestmentTypeChange}
            handleTickerSelect={handleTickerSelect}
            handleSaveLinkedLedgers={handleSaveLinkedLedgers}
            onCancel={onCancel}
          />
        </div>
      </div>
    </div>
  );
}
