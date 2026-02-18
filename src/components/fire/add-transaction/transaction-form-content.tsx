'use client';

import type { FlowCategoryPreset, AssetWithBalance } from '@/types/fire';
import type { FlowFormState, FlowFormErrors, NewAssetState, ExpenseTab } from './types';
import type { AssetInterestSettings } from '@/lib/fire/api';
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
import type { InvestmentType } from './investment-type-selector';

export interface TransactionFormContentProps {
  // Core form state
  selectedPreset: FlowCategoryPreset;
  form: FlowFormState;
  formErrors: FlowFormErrors;
  newAsset: NewAssetState;
  loading: boolean;

  // Filtered assets
  filteredFromAssets: AssetWithBalance[];
  filteredToAssets: AssetWithBalance[];
  cashAssets: AssetWithBalance[];
  allAssets: AssetWithBalance[];

  // Visibility
  showFromField: boolean;
  showToField: boolean;

  // Computed values
  computedPricePerShare: string | null;
  isUsStockInvestment: boolean;
  stockMarket?: string;

  // Interest settings
  interestSettingsMap: Record<string, AssetInterestSettings>;

  // Expense-specific
  expenseTab: ExpenseTab;
  setExpenseTab: (tab: ExpenseTab) => void;
  savingLinkedLedgers: boolean;
  linkedLedgers: Array<{ ledger_id: string; ledger_name: string }>;

  // Interest-specific
  noAssetInterest?: boolean;
  onToggleNoAsset?: (value: boolean) => void;

  // Edit mode
  isEditMode?: boolean;

  // Actions
  updateForm: <K extends keyof FlowFormState>(field: K, value: FlowFormState[K]) => void;
  updateNewAsset: <K extends keyof NewAssetState>(field: K, value: NewAssetState[K]) => void;
  handleSubmit: () => Promise<void>;
  handleInvestmentTypeChange: (type: InvestmentType) => void;
  handleTickerSelect: (ticker: string, name: string) => void;
  handleSaveLinkedLedgers: () => Promise<void>;
  onCancel: () => void;
}

/**
 * Renders the appropriate transaction form based on the selected preset.
 * This component is shared between AddTransactionDialog and PreviewPanel.
 */
export function TransactionFormContent({
  selectedPreset,
  form,
  formErrors,
  newAsset,
  loading,
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
  expenseTab,
  setExpenseTab,
  savingLinkedLedgers,
  linkedLedgers,
  noAssetInterest,
  onToggleNoAsset,
  isEditMode,
  updateForm,
  updateNewAsset,
  handleSubmit,
  handleInvestmentTypeChange,
  handleTickerSelect,
  handleSaveLinkedLedgers,
  onCancel,
}: TransactionFormContentProps) {
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
    isEditMode,
    updateForm,
    updateNewAsset,
    handleSubmit,
    onCancel,
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
        stockMarket={stockMarket}
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
    return (
      <InterestFlowForm
        {...commonProps}
        cashAssets={cashAssets}
        interestSettingsMap={interestSettingsMap}
        noAsset={noAssetInterest ?? false}
        onToggleNoAsset={onToggleNoAsset ?? (() => {})}
      />
    );
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
    return <PayDebtFlowForm {...commonProps} cashAssets={cashAssets} />;
  }

  // Sell flow (stocks, real estate)
  if (selectedPreset.id === 'sell') {
    return <SellFlowForm {...commonProps} cashAssets={cashAssets} />;
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

  // Transfer flows
  if (selectedPreset.flowType === 'transfer') {
    return <TransferFlowForm {...commonProps} />;
  }

  // Fallback
  return <TransferFlowForm {...commonProps} />;
}
