/**
 * Preview Data Mapper
 *
 * Maps AI preview data to AddFlowDialog form state.
 * Used for "Main Stage Hijack" - when AI is ready to submit,
 * we show a preview in the AddFlowDialog for user confirmation.
 */

import type { AIPreviewData } from '@/lib/fire/chat-api';
import type { FlowFormState } from '../add-transaction/types';
import type { Asset } from '@/types/fire';
import { getFlowCategoryPreset, type FlowCategoryPreset } from '@/types/fire';

/**
 * Map AI category to flow preset ID
 */
export function getCategoryPresetId(category: string): string {
  // Direct mappings
  const categoryMap: Record<string, string> = {
    // Income categories
    salary: 'salary',
    bonus: 'bonus',
    freelance: 'freelance',
    gift: 'gift',
    rental: 'rental',
    dividend: 'dividend',
    interest: 'interest',
    refund: 'salary', // Map to salary as generic income

    // Expense
    expense: 'expense',
    groceries: 'expense',
    utilities: 'expense',
    dining: 'expense',
    shopping: 'expense',
    entertainment: 'expense',
    transportation: 'expense',
    healthcare: 'expense',
    insurance: 'expense',

    // Investment
    invest: 'invest',
    buy: 'invest',
    sell: 'sell',
    reinvest: 'reinvest',

    // Transfer
    transfer: 'transfer',
    deposit: 'deposit',

    // Debt
    pay_debt: 'pay_debt',
    debt_payment: 'pay_debt',
    add_mortgage: 'add_mortgage',
    add_loan: 'add_loan',

    // Fallback
    other: 'other',
  };

  return categoryMap[category.toLowerCase()] || 'other';
}

/**
 * Get the flow preset configuration for a category
 */
export function getPresetFromCategory(category: string): FlowCategoryPreset | undefined {
  const presetId = getCategoryPresetId(category);
  return getFlowCategoryPreset(presetId);
}

/**
 * Find asset by ID from assets list
 */
function findAsset(assetId: string | undefined, assets: Asset[]): Asset | undefined {
  if (!assetId) return undefined;
  return assets.find(a => a.id === assetId);
}

/**
 * Map AI preview data to AddFlowDialog form state
 *
 * @param data - AI preview data from chat response
 * @param assets - List of user's assets for lookups
 * @returns Partial form state to pre-fill the dialog
 */
export function mapAIDataToFormState(
  data: AIPreviewData,
  assets: Asset[]
): Partial<FlowFormState> {
  const preset = getPresetFromCategory(data.category);
  if (!preset) {
    return {};
  }

  const formState: Partial<FlowFormState> = {
    amount: data.amount?.toString() || '',
    currency: data.currency || 'USD',
    date: data.date || new Date().toISOString().split('T')[0],
    description: data.description || '',
  };

  // Map from/to assets based on preset type and provided IDs
  if (data.from_asset_id) {
    const fromAsset = findAsset(data.from_asset_id, assets);
    if (fromAsset) {
      formState.fromType = 'asset';
      formState.fromAssetId = data.from_asset_id;
    }
  }

  if (data.to_asset_id) {
    const toAsset = findAsset(data.to_asset_id, assets);
    if (toAsset) {
      formState.toType = 'asset';
      formState.toAssetId = data.to_asset_id;
    }
  }

  // Handle debt payments
  if (data.debt_id) {
    formState.debtId = data.debt_id;
  }

  // Handle investment-specific fields
  if (data.shares) {
    formState.shares = data.shares.toString();
  }

  if (data.ticker) {
    formState.selectedTicker = data.ticker;
    formState.selectedTickerName = data.ticker; // Will be updated by lookup
  }

  // Calculate price per share if we have amount and shares
  if (data.amount && data.shares && data.shares > 0) {
    const pricePerShare = data.amount / data.shares;
    formState.pricePerShare = pricePerShare.toFixed(2);
  }

  return formState;
}

/**
 * Determine the initial category for AddFlowDialog from AI preview data
 */
export function getInitialCategory(data: AIPreviewData): string {
  return getCategoryPresetId(data.category);
}

/**
 * Determine if the preview data is for a debt-related flow
 */
export function isDebtFlow(data: AIPreviewData): boolean {
  const category = data.category.toLowerCase();
  return category === 'pay_debt' || category === 'debt_payment' ||
         category === 'add_mortgage' || category === 'add_loan';
}

/**
 * Determine if the preview data is for an investment flow
 */
export function isInvestmentFlow(data: AIPreviewData): boolean {
  const category = data.category.toLowerCase();
  return category === 'invest' || category === 'buy' ||
         category === 'sell' || category === 'reinvest';
}
