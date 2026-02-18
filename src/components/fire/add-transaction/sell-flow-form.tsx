'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import type { FlowCategoryPreset, AssetWithBalance, AssetType, TransactionWithDetails } from '@/types/fire';
import {
  colors,
  Input,
  DateInput,
  IconArrow,
  AssetCombobox,
  Loader,
} from '@/components/fire/ui';
import { FormActions } from './form-actions';
import { getFieldLabels } from './constants';
import type { FlowFormState, FlowFormErrors, NewAssetState } from './types';
import { formatCurrency } from '@/lib/fire/utils';
import { stockPriceApi, transactionApi, type StockPrice } from '@/lib/fire/api';

interface SellFlowFormProps {
  selectedPreset: FlowCategoryPreset;
  form: FlowFormState;
  formErrors: FlowFormErrors;
  newAsset: NewAssetState;
  filteredFromAssets: AssetWithBalance[];
  filteredToAssets: AssetWithBalance[];
  showFromField: boolean;
  showToField: boolean;
  loading: boolean;
  updateForm: <K extends keyof FlowFormState>(field: K, value: FlowFormState[K]) => void;
  updateNewAsset: <K extends keyof NewAssetState>(field: K, value: NewAssetState[K]) => void;
  handleSubmit: () => void;
  onCancel: () => void;
  cashAssets: AssetWithBalance[];
}

// Asset types that are share-based
const SHARE_BASED_TYPES: AssetType[] = ['stock', 'etf', 'crypto', 'bond'];

export function SellFlowForm({
  selectedPreset,
  form,
  formErrors,
  filteredFromAssets,
  loading,
  updateForm,
  handleSubmit,
  onCancel,
  cashAssets,
}: SellFlowFormProps) {
  const labels = getFieldLabels(selectedPreset.id);
  const prevFromAssetIdRef = useRef(form.fromAssetId);

  // Stock price and avg cost state
  const [stockPrice, setStockPrice] = useState<StockPrice | null>(null);
  const [avgCostPerShare, setAvgCostPerShare] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [loadingAvgCost, setLoadingAvgCost] = useState(false);

  // Get selected asset
  const selectedAsset = useMemo(() => {
    return filteredFromAssets.find((a) => a.id === form.fromAssetId);
  }, [filteredFromAssets, form.fromAssetId]);

  // Determine if this is a share-based asset or real estate
  const isShareBased = selectedAsset ? SHARE_BASED_TYPES.includes(selectedAsset.type) : true;
  const isRealEstate = selectedAsset?.type === 'real_estate';

  // Fetch stock price when asset with ticker is selected
  useEffect(() => {
    const fetchPrice = async () => {
      if (selectedAsset?.ticker && isShareBased) {
        setLoadingPrice(true);
        try {
          const response = await stockPriceApi.getPrices([selectedAsset.ticker]);
          if (response.success && response.data) {
            const price = response.data[selectedAsset.ticker];
            if (price) {
              setStockPrice(price);
              // Auto-fill price per share with current market price
              updateForm('pricePerShare', price.price.toFixed(2));
            }
          }
        } catch {
          // Silently fail - user can still enter manually
        } finally {
          setLoadingPrice(false);
        }
      } else {
        setStockPrice(null);
      }
    };

    if (form.fromAssetId !== prevFromAssetIdRef.current) {
      fetchPrice();
    }
  }, [form.fromAssetId, selectedAsset?.ticker, isShareBased, updateForm]);

  // Fetch invest transactions to calculate average cost per share
  useEffect(() => {
    const fetchAvgCost = async () => {
      if (selectedAsset && isShareBased) {
        setLoadingAvgCost(true);
        try {
          // Fetch all transactions where this asset is involved (invest/buy transactions)
          const response = await transactionApi.getAll({ asset_id: selectedAsset.id, limit: 1000 });
          if (response.success && response.data) {
            // Filter for buy/invest transactions (where shares were bought INTO this asset)
            const investTxns = response.data.transactions.filter(
              (t: TransactionWithDetails) =>
                (t.to_asset_id === selectedAsset.id || t.asset_id === selectedAsset.id) &&
                (t.category === 'invest' || t.type === 'buy')
            );

            // Calculate average cost: total amount spent / total shares acquired
            let totalAmount = 0;
            let totalShares = 0;

            for (const txn of investTxns) {
              const shares = txn.shares || (txn.metadata as { shares?: number })?.shares || 0;
              if (shares > 0) {
                totalAmount += txn.amount;
                totalShares += shares;
              }
            }

            if (totalShares > 0) {
              const avgCost = totalAmount / totalShares;
              setAvgCostPerShare(avgCost);
              // Store in form state for submit handler
              updateForm('sellCostBasis', avgCost.toString());
            } else {
              setAvgCostPerShare(null);
              updateForm('sellCostBasis', '');
            }
          }
        } catch {
          // Silently fail
          setAvgCostPerShare(null);
        } finally {
          setLoadingAvgCost(false);
        }
      } else {
        setAvgCostPerShare(null);
      }
    };

    // Always fetch when asset changes
    if (form.fromAssetId && form.fromAssetId !== prevFromAssetIdRef.current) {
      fetchAvgCost();
    }
  }, [form.fromAssetId, selectedAsset, isShareBased, updateForm]);

  // Auto-fill fields when asset is selected
  useEffect(() => {
    if (form.fromAssetId && form.fromAssetId !== prevFromAssetIdRef.current) {
      prevFromAssetIdRef.current = form.fromAssetId;
      const asset = filteredFromAssets.find((a) => a.id === form.fromAssetId);
      if (asset) {
        // Set currency from asset
        updateForm('currency', asset.currency);

        // Auto-select first cash account as destination
        if (cashAssets.length > 0 && !form.toAssetId) {
          updateForm('toAssetId', cashAssets[0].id);
        }

        if (isRealEstate) {
          // Default mark as sold to true for real estate
          updateForm('sellMarkAsSold', true);
        }
      }
    }
  }, [form.fromAssetId, form.toAssetId, filteredFromAssets, isRealEstate, cashAssets, updateForm]);

  // Calculate totals
  const shares = parseFloat(form.shares) || 0;
  const pricePerShare = parseFloat(form.pricePerShare) || 0;
  const saleAmount = parseFloat(form.amount) || 0;
  const fees = parseFloat(form.sellFees) || 0;

  // For share-based: total = shares × price
  const totalProceeds = isShareBased ? shares * pricePerShare : saleAmount;
  const netProceeds = totalProceeds - fees;

  // Auto-update amount for share-based when shares/price change
  const prevSharesRef = useRef(form.shares);
  const prevPriceRef = useRef(form.pricePerShare);

  useEffect(() => {
    // Only update if shares or price actually changed (not amount)
    if (
      isShareBased &&
      (form.shares !== prevSharesRef.current || form.pricePerShare !== prevPriceRef.current)
    ) {
      prevSharesRef.current = form.shares;
      prevPriceRef.current = form.pricePerShare;

      const s = parseFloat(form.shares) || 0;
      const p = parseFloat(form.pricePerShare) || 0;
      if (s > 0 && p > 0) {
        updateForm('amount', (s * p).toFixed(2));
      }
    }
  }, [isShareBased, form.shares, form.pricePerShare, updateForm]);

  // Get available shares for share-based assets
  const availableShares = selectedAsset?.balance || 0;

  return (
    <div className="space-y-4">
      {/* From Asset (what you're selling) */}
      <AssetCombobox
        label={isRealEstate ? 'Property to Sell' : 'Investment to Sell'}
        placeholder="Select asset..."
        value={form.fromAssetId}
        assets={filteredFromAssets}
        onChange={(id) => updateForm('fromAssetId', id)}
        error={formErrors.fromAsset}
        showBalance={true}
      />

      {/* Asset info when selected */}
      {selectedAsset && (
        <div
          className="px-3 py-2 rounded-md flex flex-wrap gap-x-4 gap-y-1 text-xs"
          style={{ backgroundColor: colors.surfaceLight }}
        >
          <span>
            <span style={{ color: colors.muted }}>{isShareBased ? 'Shares: ' : 'Value: '}</span>
            <span style={{ color: colors.text }}>
              {isShareBased
                ? availableShares.toLocaleString()
                : formatCurrency(selectedAsset.balance, { currency: selectedAsset.currency })}
            </span>
          </span>
          {isShareBased && (
            <span>
              <span style={{ color: colors.muted }}>Avg Cost: </span>
              {loadingAvgCost ? (
                <Loader size="sm" />
              ) : avgCostPerShare != null ? (
                <span style={{ color: colors.text }}>
                  {formatCurrency(avgCostPerShare, { currency: selectedAsset.currency })}
                </span>
              ) : (
                <span style={{ color: colors.muted }}>-</span>
              )}
            </span>
          )}
          {selectedAsset.ticker && (
            <span>
              <span style={{ color: colors.muted }}>Market: </span>
              {loadingPrice ? (
                <Loader size="sm" />
              ) : stockPrice ? (
                <span style={{ color: colors.text }}>
                  {formatCurrency(stockPrice.price, { currency: stockPrice.currency })}
                  {stockPrice.changePercent != null && (
                    <span
                      className="ml-1"
                      style={{ color: (stockPrice.change ?? 0) >= 0 ? colors.positive : colors.negative }}
                    >
                      ({(stockPrice.change ?? 0) >= 0 ? '+' : ''}{stockPrice.changePercent.toFixed(1)}%)
                    </span>
                  )}
                </span>
              ) : (
                <span style={{ color: colors.muted }}>-</span>
              )}
            </span>
          )}
        </div>
      )}

      {/* Share-based: Shares & Price */}
      {isShareBased && selectedAsset && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Shares Sold"
              type="number"
              step="any"
              placeholder="0"
              value={form.shares}
              onChange={(e) => updateForm('shares', e.target.value)}
              error={formErrors.shares}
              hint={`Max: ${availableShares.toLocaleString()}`}
            />
            <Input
              label="Price Per Share"
              type="number"
              step="any"
              placeholder="0.00"
              value={form.pricePerShare}
              onChange={(e) => updateForm('pricePerShare', e.target.value)}
            />
          </div>

          {/* Total proceeds and P/L */}
          {shares > 0 && pricePerShare > 0 && (
            <div className="text-xs text-right -mt-2 space-x-2" style={{ color: colors.muted }}>
              <span>Total: {formatCurrency(totalProceeds, { currency: form.currency })}</span>
              {avgCostPerShare != null && (
                <span
                  style={{
                    color: pricePerShare >= avgCostPerShare ? colors.positive : colors.negative,
                  }}
                >
                  P/L: {pricePerShare >= avgCostPerShare ? '+' : ''}
                  {formatCurrency((pricePerShare - avgCostPerShare) * shares, { currency: form.currency })}
                  {' '}({pricePerShare >= avgCostPerShare ? '+' : ''}
                  {(((pricePerShare - avgCostPerShare) / avgCostPerShare) * 100).toFixed(1)}%)
                </span>
              )}
            </div>
          )}
        </>
      )}

      {/* Real estate: Sale Amount */}
      {isRealEstate && selectedAsset && (
        <Input
          label="Sale Amount"
          type="number"
          step="any"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => updateForm('amount', e.target.value)}
          error={formErrors.amount}
        />
      )}

      {/* Fees (optional) */}
      {selectedAsset && (
        <Input
          label={isRealEstate ? 'Closing Costs & Fees (optional)' : 'Trading Fees (optional)'}
          type="number"
          step="any"
          placeholder="0.00"
          value={form.sellFees}
          onChange={(e) => updateForm('sellFees', e.target.value)}
          hint={isRealEstate ? 'Agent fees, closing costs, etc.' : undefined}
        />
      )}

      {/* Proceeds summary - auto-select first cash account */}
      {selectedAsset && netProceeds > 0 && (
        <div
          className="p-3 rounded-md"
          style={{ backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-2 text-sm">
            <span style={{ color: colors.positive }}>
              <IconArrow size={14} />
            </span>
            <span style={{ color: colors.text }}>
              {formatCurrency(netProceeds, { currency: form.currency })}
            </span>
            <span style={{ color: colors.muted }}>→</span>
            <span style={{ color: colors.text, fontWeight: 500 }}>
              {cashAssets[0]?.name || 'Cash Account'}
            </span>
          </div>
          {fees > 0 && (
            <p className="text-[10px] mt-1 ml-5" style={{ color: colors.muted }}>
              After {formatCurrency(fees, { currency: form.currency })} fees
            </p>
          )}
        </div>
      )}

      {/* Real estate: Mark as sold option */}
      {isRealEstate && selectedAsset && (
        <label
          className="flex items-center gap-2 p-3 rounded-md cursor-pointer"
          style={{ backgroundColor: colors.surfaceLight }}
        >
          <input
            type="checkbox"
            checked={form.sellMarkAsSold}
            onChange={(e) => updateForm('sellMarkAsSold', e.target.checked)}
            className="w-4 h-4"
          />
          <div>
            <p className="text-sm font-medium" style={{ color: colors.text }}>
              Mark property as sold
            </p>
            <p className="text-xs" style={{ color: colors.muted }}>
              Remove from active assets after sale
            </p>
          </div>
        </label>
      )}

      {/* Date */}
      {selectedAsset && (
        <DateInput
          label="Sale Date"
          value={form.date}
          onChange={(val) => updateForm('date', val)}
        />
      )}

      {/* Description */}
      {selectedAsset && (
        <Input
          label="Note (optional)"
          placeholder="Add a note..."
          value={form.description}
          onChange={(e) => updateForm('description', e.target.value)}
        />
      )}

      {/* Actions */}
      <FormActions
        loading={loading}
        submitLabel={isRealEstate ? 'Record Sale' : labels.button}
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
