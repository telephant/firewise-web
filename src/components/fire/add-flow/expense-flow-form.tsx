'use client';

import type { FlowCategoryPreset, AssetWithBalance, LinkedLedger } from '@/types/fire';
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/fire/ui';
import { ExpenseCategorySelector } from './expense-category-selector';
import { LedgerSelector } from './ledger-expense-selector';
import { FlowFormFields } from './flow-form-fields';
import type { FlowFormState, FlowFormErrors, NewAssetState, ExpenseTab } from './types';
import type { InvestmentType } from './investment-type-selector';

interface ExpenseFlowFormProps {
  selectedPreset: FlowCategoryPreset;
  form: FlowFormState;
  formErrors: FlowFormErrors;
  newAsset: NewAssetState;
  filteredFromAssets: AssetWithBalance[];
  filteredToAssets: AssetWithBalance[];
  showFromField: boolean;
  showToField: boolean;
  computedPricePerShare: string | null;
  isUsStockInvestment: boolean;
  loading: boolean;
  expenseTab: ExpenseTab;
  setExpenseTab: (tab: ExpenseTab) => void;
  savingLinkedLedgers: boolean;
  updateForm: <K extends keyof FlowFormState>(field: K, value: FlowFormState[K]) => void;
  updateNewAsset: <K extends keyof NewAssetState>(field: K, value: NewAssetState[K]) => void;
  handleInvestmentTypeChange: (type: InvestmentType) => void;
  handleTickerSelect: (ticker: string, name: string) => void;
  handleSubmit: () => void;
  handleSaveLinkedLedgers: () => void;
  onCancel: () => void;
}

export function ExpenseFlowForm({
  selectedPreset,
  form,
  formErrors,
  newAsset,
  filteredFromAssets,
  filteredToAssets,
  showFromField,
  showToField,
  computedPricePerShare,
  isUsStockInvestment,
  loading,
  expenseTab,
  setExpenseTab,
  savingLinkedLedgers,
  updateForm,
  updateNewAsset,
  handleInvestmentTypeChange,
  handleTickerSelect,
  handleSubmit,
  handleSaveLinkedLedgers,
  onCancel,
}: ExpenseFlowFormProps) {
  return (
    <Tabs value={expenseTab} onValueChange={(v) => setExpenseTab(v as ExpenseTab)}>
      <TabsList>
        <TabsTrigger value="link">Link to Ledger</TabsTrigger>
        <TabsTrigger value="manual">Manual Entry</TabsTrigger>
      </TabsList>

      {/* Link to Ledger Tab Content */}
      <TabsContent value="link" className="space-y-4 pt-4" forceMount>
        <LedgerSelector
          value={form.linkedLedgers}
          onChange={(ledgers) => updateForm('linkedLedgers', ledgers as LinkedLedger[])}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveLinkedLedgers}
            disabled={savingLinkedLedgers}
          >
            {savingLinkedLedgers ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </TabsContent>

      {/* Manual Entry Tab Content */}
      <TabsContent value="manual" className="space-y-4 pt-4" forceMount>
        <ExpenseCategorySelector
          value={form.expenseCategoryId}
          onChange={(id) => updateForm('expenseCategoryId', id)}
        />
        <FlowFormFields
          selectedPreset={selectedPreset}
          form={form}
          formErrors={formErrors}
          newAsset={newAsset}
          filteredFromAssets={filteredFromAssets}
          filteredToAssets={filteredToAssets}
          showFromField={showFromField}
          showToField={showToField}
          computedPricePerShare={computedPricePerShare}
          isUsStockInvestment={isUsStockInvestment}
          loading={loading}
          updateForm={updateForm}
          updateNewAsset={updateNewAsset}
          handleInvestmentTypeChange={handleInvestmentTypeChange}
          handleTickerSelect={handleTickerSelect}
          handleSubmit={handleSubmit}
          onCancel={onCancel}
        />
      </TabsContent>
    </Tabs>
  );
}
