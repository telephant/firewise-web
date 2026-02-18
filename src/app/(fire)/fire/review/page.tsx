'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import useSWR, { mutate } from 'swr';
import {
  colors,
  Button,
  Card,
  Loader,
  SidebarTrigger,
  IconArrow,
  IconCheck,
  IconTrash,
} from '@/components/fire/ui';
import { TaxSettingsDialog } from '@/components/fire/tax-settings-dialog';
import { transactionApi, userTaxSettingsApi } from '@/lib/fire/api';
import { formatCurrency, formatDate } from '@/lib/fire/utils';
import type { TransactionWithDetails } from '@/types/fire';

export default function ReviewPage() {
  const [processing, setProcessing] = useState<string | null>(null);
  const [taxSettingsOpen, setTaxSettingsOpen] = useState(false);

  // Fetch transactions needing review
  const { data, isLoading, error } = useSWR(
    '/fire/transactions/review',
    async () => {
      const res = await transactionApi.getAll({ needs_review: true, limit: 100 });
      if (!res.success) throw new Error(res.error || 'Failed to fetch');
      return res.data?.transactions || [];
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  // Fetch user tax settings for calculating tax on dividends
  const { data: taxSettingsData } = useSWR(
    '/fire/tax-settings',
    async () => {
      const res = await userTaxSettingsApi.get();
      if (!res.success) return null;
      return res.data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const transactions = data || [];
  const taxSettings = taxSettingsData;


  const handleApprove = async (transaction: TransactionWithDetails) => {
    setProcessing(transaction.id);
    try {
      const res = await transactionApi.markReviewed(transaction.id);
      if (res.success) {
        toast.success('Transaction approved');
        // Refresh the list
        mutate('/fire/transactions/review');
        // Also refresh the review count in sidebar
        mutate('/fire/transactions/review-count');
      } else {
        toast.error(res.error || 'Failed to approve');
      }
    } catch {
      toast.error('Failed to approve transaction');
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (transaction: TransactionWithDetails) => {
    setProcessing(transaction.id);
    try {
      const res = await transactionApi.delete(transaction.id);
      if (res.success) {
        toast.success('Transaction deleted');
        mutate('/fire/transactions/review');
        mutate('/fire/transactions/review-count');
      } else {
        toast.error(res.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete transaction');
    } finally {
      setProcessing(null);
    }
  };

  // Helper to get tax rate based on market
  const getTaxRateForMarket = (market: string | null | undefined): number => {
    if (market === 'SG') {
      return taxSettings?.sg_dividend_withholding_rate ?? 0.00;
    }
    return taxSettings?.us_dividend_withholding_rate ?? 0.30;
  };

  const getDividendInfo = (transaction: TransactionWithDetails) => {
    const metadata = transaction.metadata as {
      dividend_per_share?: number;
      shares?: number; // Legacy field name
      share_count?: number; // New field name (avoids triggering balance recalculation)
      ticker?: string;
      tax_rate?: number;
      tax_withheld?: number;
    } | null;

    if (!metadata || transaction.category !== 'dividend') return null;

    // Get market from source asset (the stock that paid the dividend)
    const sourceAsset = transaction.from_asset || transaction.source_asset;
    const market = sourceAsset?.market;

    // transaction.amount is NET amount (after tax)
    const netAmount = transaction.amount;
    // Use tax info from metadata (calculated at creation time using user's settings)
    // Fall back to market-specific rate if not in metadata
    const taxRate = metadata.tax_rate ?? getTaxRateForMarket(market);
    const taxWithheld = metadata.tax_withheld ?? 0;
    // Calculate gross from net + tax withheld
    const grossAmount = netAmount + taxWithheld;

    return {
      dividendPerShare: metadata.dividend_per_share,
      shares: metadata.share_count ?? metadata.shares, // Support both old and new field names
      ticker: metadata.ticker,
      grossAmount,
      taxRate,
      taxWithheld,
      netAmount,
      market,
    };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header
        className="flex items-center justify-between px-3 py-2"
        style={{
          backgroundColor: 'transparent',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <h1 className="text-sm font-bold" style={{ color: colors.text }}>
            Review Flows
          </h1>
        </div>
        {transactions.length > 0 && (
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{ backgroundColor: colors.warning, color: colors.text }}
          >
            {transactions.length} pending
          </span>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {isLoading ? (
            <Card>
              <div className="h-40 flex items-center justify-center">
                <Loader size="md" variant="bar" />
              </div>
            </Card>
          ) : error ? (
            <Card>
              <div
                className="h-40 flex items-center justify-center text-sm"
                style={{ color: colors.negative }}
              >
                Failed to load transactions
              </div>
            </Card>
          ) : transactions.length === 0 ? (
            <Card>
              <div className="h-40 flex flex-col items-center justify-center gap-2">
                <span style={{ color: colors.positive }}>
                  <IconCheck size={32} />
                </span>
                <p className="text-sm" style={{ color: colors.muted }}>
                  All caught up! No transactions need review.
                </p>
              </div>
            </Card>
          ) : (
            transactions.map((txn) => {
              const dividendInfo = getDividendInfo(txn);
              const isProcessing = processing === txn.id;

              return (
                <Card key={txn.id}>
                  <div className="p-4 space-y-3">
                    {/* Header row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            color: colors.positive,
                            transform: 'rotate(-90deg)',
                            display: 'inline-block',
                          }}
                        >
                          <IconArrow size={16} />
                        </span>
                        <div>
                          <p
                            className="text-sm font-medium capitalize"
                            style={{ color: colors.text }}
                          >
                            {txn.category || txn.type}
                          </p>
                          <p className="text-xs" style={{ color: colors.muted }}>
                            {formatDate(txn.date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className="text-lg font-bold tabular-nums"
                          style={{ color: colors.positive }}
                        >
                          +{formatCurrency(
                            txn.converted_amount ?? txn.amount,
                            { currency: txn.converted_currency ?? txn.currency }
                          )}
                        </p>
                        {txn.converted_amount !== undefined &&
                          txn.converted_currency &&
                          txn.converted_currency !== txn.currency && (
                          <p className="text-[10px] tabular-nums" style={{ color: colors.muted }}>
                            ({formatCurrency(txn.amount, { currency: txn.currency })})
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    {txn.description && (
                      <p className="text-xs" style={{ color: colors.muted }}>
                        {txn.description}
                      </p>
                    )}

                    {/* Dividend info */}
                    {dividendInfo && (
                      <div
                        className="text-xs p-2 rounded space-y-1"
                        style={{ backgroundColor: colors.surfaceLight }}
                      >
                        <div className="flex justify-between">
                          <span style={{ color: colors.muted }}>Stock:</span>
                          <span style={{ color: colors.text }}>
                            {txn.from_asset?.name || txn.source_asset?.name || dividendInfo.ticker}
                          </span>
                        </div>
                        {dividendInfo.shares && (
                          <div className="flex justify-between">
                            <span style={{ color: colors.muted }}>Shares:</span>
                            <span style={{ color: colors.text }}>
                              {dividendInfo.shares.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {dividendInfo.dividendPerShare && (
                          <div className="flex justify-between">
                            <span style={{ color: colors.muted }}>Per Share:</span>
                            <span style={{ color: colors.text }}>
                              ${dividendInfo.dividendPerShare.toFixed(4)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span style={{ color: colors.muted }}>Gross Amount:</span>
                          <span style={{ color: colors.text }}>
                            {formatCurrency(dividendInfo.grossAmount, { currency: txn.currency })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: colors.muted }}>
                            {dividendInfo.market === 'SG' ? '🇸🇬' : '🇺🇸'} Tax ({(dividendInfo.taxRate * 100).toFixed(0)}%):
                          </span>
                          <span style={{ color: colors.negative }}>
                            -{formatCurrency(dividendInfo.taxWithheld, { currency: txn.currency })}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t" style={{ borderColor: colors.border }}>
                          <span style={{ color: colors.muted }}>Net Amount:</span>
                          <span style={{ color: colors.positive, fontWeight: 'bold' }}>
                            {formatCurrency(dividendInfo.netAmount, { currency: txn.currency })}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Hint for dividend - open settings dialog */}
                    {dividendInfo && (
                      <p className="text-xs" style={{ color: colors.info }}>
                        Tip: Adjust your tax rate in{' '}
                        <button
                          onClick={() => setTaxSettingsOpen(true)}
                          style={{ textDecoration: 'underline', background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer' }}
                        >
                          Settings
                        </button>
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleApprove(txn)}
                        disabled={isProcessing}
                        className="gap-1.5"
                      >
                        <IconCheck size={12} />
                        <span>Approve</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(txn)}
                        disabled={isProcessing}
                        className="gap-1.5"
                        style={{ color: colors.negative, borderColor: colors.negative }}
                      >
                        <IconTrash size={12} />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </main>

      <TaxSettingsDialog open={taxSettingsOpen} onOpenChange={setTaxSettingsOpen} />
    </div>
  );
}
