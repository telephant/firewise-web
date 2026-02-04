'use client';

import { useMemo } from 'react';
import { colors, Card, Loader } from '@/components/fire/ui';
import { formatCurrency } from '@/lib/fire/utils';
import { useFlows, useAssets } from '@/hooks/fire/use-fire-data';
import type { FlowWithDetails } from '@/types/fire';

// Helper to get effective amount for stats (use converted amount when available)
function getEffectiveAmount(flow: FlowWithDetails): number {
  return flow.converted_amount ?? flow.amount;
}

interface MoneyFlowCardProps {
  currency?: string;
}

// Color palette for different income categories
const INCOME_COLORS: Record<string, string> = {
  salary: '#e74c3c',     // red
  bonus: '#e67e22',      // orange
  freelance: '#9b59b6',  // purple
  gift: '#1abc9c',       // teal
  rental: '#f39c12',     // yellow
  other: '#95a5a6',      // gray
};

// Special colors
const COLORS = {
  dividend: '#3498db',   // blue - passive income from assets
  interest: '#3498db',   // blue - passive income from assets
  invest: '#27ae60',     // green - investment flow
  spending: '#e74c3c',   // red - expenses
  existing: '#bdc3c7',   // light gray - existing assets
};

// Generate color from string hash for expense categories
const EXPENSE_COLORS = ['#e74c3c', '#3498db', '#9b59b6', '#1abc9c', '#f39c12', '#e67e22', '#2ecc71', '#8e44ad'];
const getExpenseColor = (_label: string, index: number): string => {
  return EXPENSE_COLORS[index % EXPENSE_COLORS.length];
};

interface BucketLayer {
  color: string;
  amount: number;
  label: string;
}

interface IncomeSource {
  category: string;
  amount: number;
  color: string;
  label: string;
}

interface ExpenseCategory {
  category: string;
  amount: number;
  color: string;
  label: string;
}

export function MoneyFlowCard({ currency = 'USD' }: MoneyFlowCardProps) {
  const { flows, isLoading: flowsLoading } = useFlows();
  const { assets, isLoading: assetsLoading } = useAssets();

  const isLoading = flowsLoading || assetsLoading;

  // Process flows into the money circle data
  const {
    externalIncome,
    passiveIncome,
    expenseCategories,
    cashLayers,
    assetLayers,
    spendingTotal,
    investTotal,
    totalIncome,
    existingAssets,
    hasData,
  } = useMemo(() => {
    if (!flows || flows.length === 0) {
      return {
        externalIncome: [],
        passiveIncome: [],
        expenseCategories: [],
        cashLayers: [],
        assetLayers: [],
        spendingTotal: 0,
        investTotal: 0,
        totalIncome: 0,
        existingAssets: 0,
        hasData: false,
      };
    }

    // Filter out adjustments
    const filteredFlows = flows.filter((f) => f.category !== 'adjustment');

    if (filteredFlows.length === 0) {
      return {
        externalIncome: [],
        passiveIncome: [],
        expenseCategories: [],
        cashLayers: [],
        assetLayers: [],
        spendingTotal: 0,
        investTotal: 0,
        totalIncome: 0,
        existingAssets: 0,
        hasData: false,
      };
    }

    // Calculate existing assets total (gray base) - excludes cash which has its own layers
    // Use converted balance when available
    const existingAssetsTotal = assets
      .filter((a) => a.type !== 'cash')
      .reduce((sum, a) => sum + Math.max(0, a.converted_balance ?? a.balance), 0);

    // Group income by category and source
    const externalIncomeMap: Record<string, number> = {};
    const passiveIncomeMap: Record<string, { amount: number; assetName: string }> = {};
    const expenseMap: Record<string, { amount: number; label: string }> = {};
    let totalSpending = 0;
    let totalInvest = 0;

    // Track cash layers by source
    const cashLayerMap: Record<string, number> = {};

    filteredFlows.forEach((flow) => {
      const category = flow.category || 'other';
      const amount = getEffectiveAmount(flow);

      if (flow.type === 'income') {
        // Check if it's from an asset (passive) or external (active)
        if (flow.from_asset) {
          // Passive income - from assets (dividend, interest)
          const key = flow.from_asset.name;
          if (!passiveIncomeMap[key]) {
            passiveIncomeMap[key] = { amount: 0, assetName: flow.from_asset.name };
          }
          passiveIncomeMap[key].amount += amount;

          // Add to cash layers as blue (passive)
          cashLayerMap['passive'] = (cashLayerMap['passive'] || 0) + amount;
        } else {
          // External income - salary, bonus, etc.
          externalIncomeMap[category] = (externalIncomeMap[category] || 0) + amount;

          // Add to cash layers by category color
          cashLayerMap[category] = (cashLayerMap[category] || 0) + amount;
        }
      } else if (flow.type === 'expense') {
        totalSpending += amount;

        // Check if it's a ledger expense (has ledger_id in metadata) or a Fire expense category
        const metadata = flow.metadata as Record<string, unknown> | null;
        const isLedgerExpense = metadata?.ledger_id || metadata?.ledger_name;

        if (isLedgerExpense) {
          // Group all ledger expenses together as "Spends"
          if (!expenseMap['__ledger__']) {
            expenseMap['__ledger__'] = { amount: 0, label: 'Spends' };
          }
          expenseMap['__ledger__'].amount += amount;
        } else {
          // Use Fire expense category name
          const expenseLabel = flow.flow_expense_category?.name || category || 'Other';
          if (!expenseMap[expenseLabel]) {
            expenseMap[expenseLabel] = { amount: 0, label: expenseLabel };
          }
          expenseMap[expenseLabel].amount += amount;
        }
      } else if (flow.type === 'transfer') {
        // Transfer to investment assets
        if (flow.to_asset && ['stock', 'etf', 'bond', 'crypto', 'deposit'].includes(flow.to_asset.type)) {
          totalInvest += amount;
        }
      }
    });

    // Format label
    const formatLabel = (cat: string): string => {
      const labels: Record<string, string> = {
        salary: 'Salary',
        bonus: 'Bonus',
        freelance: 'Freelance',
        gift: 'Gift',
        rental: 'Rental',
        dividend: 'Dividend',
        interest: 'Interest',
        other: 'Other',
      };
      return labels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
    };

    // Build external income sources
    const externalIncomeSources: IncomeSource[] = Object.entries(externalIncomeMap)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        color: INCOME_COLORS[cat] || INCOME_COLORS.other,
        label: formatLabel(cat),
      }));

    // Build passive income sources
    const passiveIncomeSources: IncomeSource[] = Object.entries(passiveIncomeMap)
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([key, data]) => ({
        category: 'passive',
        amount: data.amount,
        color: COLORS.dividend,
        label: data.assetName,
      }));

    // Build cash layers
    const cashLayers: BucketLayer[] = [];

    // Add external income layers
    externalIncomeSources.forEach((source) => {
      cashLayers.push({
        color: source.color,
        amount: source.amount,
        label: source.label,
      });
    });

    // Add passive income as one blue layer
    const totalPassive = Object.values(passiveIncomeMap).reduce((sum, p) => sum + p.amount, 0);
    if (totalPassive > 0) {
      cashLayers.push({
        color: COLORS.dividend,
        amount: totalPassive,
        label: 'From Assets',
      });
    }

    // Build asset layers
    const assetLayers: BucketLayer[] = [];

    // Existing assets (gray)
    if (existingAssetsTotal > 0) {
      assetLayers.push({
        color: COLORS.existing,
        amount: existingAssetsTotal,
        label: 'Existing',
      });
    }

    // New investments this month (green)
    if (totalInvest > 0) {
      assetLayers.push({
        color: COLORS.invest,
        amount: totalInvest,
        label: 'New Invest',
      });
    }

    const totalIncome = externalIncomeSources.reduce((sum, s) => sum + s.amount, 0) + totalPassive;

    // Build expense categories from expenseMap
    const expenseCategoriesList: ExpenseCategory[] = Object.entries(expenseMap)
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([key, data], index) => ({
        category: key,
        amount: data.amount,
        color: getExpenseColor(key, index),
        label: data.label,
      }));

    return {
      externalIncome: externalIncomeSources,
      passiveIncome: passiveIncomeSources,
      expenseCategories: expenseCategoriesList,
      cashLayers,
      assetLayers,
      spendingTotal: totalSpending,
      investTotal: totalInvest,
      totalIncome,
      existingAssets: existingAssetsTotal,
      hasData: totalIncome > 0 || totalSpending > 0 || totalInvest > 0,
    };
  }, [flows, assets]);

  // Render a bucket with stacked layers
  const Bucket = ({
    layers,
    title,
    maxHeight = 120,
    width = 70,
  }: {
    layers: BucketLayer[];
    title: string;
    maxHeight?: number;
    width?: number;
  }) => {
    const total = layers.reduce((sum, l) => sum + l.amount, 0);
    if (total === 0) return null;

    return (
      <div className="flex flex-col items-center">
        <div
          className="rounded-md overflow-hidden flex flex-col-reverse"
          style={{
            width,
            height: maxHeight,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.surfaceLight,
          }}
        >
          {layers.map((layer, idx) => {
            const height = (layer.amount / total) * (maxHeight - 4);
            return (
              <div
                key={idx}
                style={{
                  height: Math.max(4, height),
                  backgroundColor: layer.color,
                  borderTop: idx > 0 ? `1px solid rgba(0,0,0,0.2)` : undefined,
                }}
                title={`${layer.label}: ${formatCurrency(layer.amount, { currency, compact: true })}`}
              />
            );
          })}
        </div>
        <p className="text-[10px] mt-1 font-medium text-center" style={{ color: colors.text }}>
          {title}
        </p>
        <p className="text-[9px]" style={{ color: colors.muted }}>
          {formatCurrency(total, { currency, compact: true })}
        </p>
      </div>
    );
  };

  // Income source bucket (single color)
  const IncomeBucket = ({ source }: { source: IncomeSource }) => {
    return (
      <div className="flex flex-col items-center">
        <div
          className="rounded-md"
          style={{
            width: 50,
            height: Math.max(30, Math.min(80, (source.amount / totalIncome) * 100)),
            backgroundColor: source.color,
            border: `1px solid ${colors.border}`,
          }}
        />
        <p className="text-[9px] mt-1 font-medium text-center" style={{ color: colors.text }}>
          {source.label}
        </p>
        <p className="text-[8px]" style={{ color: colors.muted }}>
          {formatCurrency(source.amount, { currency, compact: true })}
        </p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card title="Money Flow" contentHeight="280px">
        <div className="h-full flex items-center justify-center">
          <Loader size="md" variant="bar" />
        </div>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card title="Money Flow" contentHeight="200px">
        <div className="h-full flex flex-col items-center justify-center text-center">
          <div
            className="w-12 h-12 rounded-md flex items-center justify-center mb-3"
            style={{
              backgroundColor: colors.surfaceLight,
              border: `1px solid ${colors.border}`,
            }}
          >
            <span className="text-xl">💸</span>
          </div>
          <p className="text-sm font-medium" style={{ color: colors.text }}>
            No flow data yet
          </p>
          <p className="text-xs mt-1" style={{ color: colors.muted }}>
            Record income and expenses to see your money flow!
          </p>
        </div>
      </Card>
    );
  }

  const totalPassiveIncome = passiveIncome.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Card title="Money Flow" contentHeight="auto">
      <div className="p-2">
        {/* Top: External Income */}
        {externalIncome.length > 0 && (
          <div className="mb-3">
            <p className="text-[9px] text-center uppercase tracking-wider mb-2" style={{ color: colors.muted }}>
              Income Sources
            </p>
            <div className="flex justify-center gap-3">
              {externalIncome.slice(0, 4).map((source, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div
                    className="rounded-md shadow-sm"
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor: source.color,
                      border: `1px solid ${colors.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span className="text-white text-[10px] font-bold">
                      {formatCurrency(source.amount, { currency, compact: true })}
                    </span>
                  </div>
                  <p className="text-[8px] mt-1 font-medium" style={{ color: colors.text }}>
                    {source.label}
                  </p>
                </div>
              ))}
            </div>
            {/* Flow indicator */}
            <div className="flex justify-center mt-1">
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-3" style={{ backgroundColor: colors.muted }} />
                <div style={{ color: colors.muted }}>▼</div>
              </div>
            </div>
          </div>
        )}

        {/* Middle: Main Flow - ASSETS ↔ CASH → SPENDING */}
        <div className="flex items-stretch justify-center gap-2">
          {/* ASSETS */}
          {assetLayers.length > 0 && (
            <div className="flex flex-col items-center">
              <div
                className="rounded-md overflow-hidden flex flex-col-reverse"
                style={{
                  width: 56,
                  height: 72,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.surfaceLight,
                }}
              >
                {assetLayers.map((layer, idx) => {
                  const total = assetLayers.reduce((s, l) => s + l.amount, 0);
                  const heightPercent = (layer.amount / total) * 100;
                  return (
                    <div
                      key={idx}
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: layer.color,
                        minHeight: 4,
                      }}
                    />
                  );
                })}
              </div>
              <p className="text-[9px] mt-1 font-bold" style={{ color: colors.text }}>ASSETS</p>
              <p className="text-[8px]" style={{ color: colors.muted }}>
                {formatCurrency(assetLayers.reduce((s, l) => s + l.amount, 0), { currency, compact: true })}
              </p>
            </div>
          )}

          {/* Arrows between Assets ↔ Cash */}
          {(totalPassiveIncome > 0 || investTotal > 0) && (
            <div className="flex flex-col justify-center gap-1 px-1">
              {totalPassiveIncome > 0 && (
                <div
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[7px] font-medium"
                  style={{ backgroundColor: `${COLORS.dividend}20`, color: COLORS.dividend }}
                >
                  <span>{formatCurrency(totalPassiveIncome, { currency, compact: true })}</span>
                  <span>→</span>
                </div>
              )}
              {investTotal > 0 && (
                <div
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[7px] font-medium"
                  style={{ backgroundColor: `${COLORS.invest}20`, color: COLORS.invest }}
                >
                  <span>←</span>
                  <span>{formatCurrency(investTotal, { currency, compact: true })}</span>
                </div>
              )}
            </div>
          )}

          {/* CASH */}
          <div className="flex flex-col items-center">
            <div
              className="rounded-md overflow-hidden flex flex-col-reverse"
              style={{
                width: 64,
                height: 72,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.surfaceLight,
              }}
            >
              {cashLayers.map((layer, idx) => {
                const total = cashLayers.reduce((s, l) => s + l.amount, 0);
                const heightPercent = total > 0 ? (layer.amount / total) * 100 : 0;
                return (
                  <div
                    key={idx}
                    style={{
                      height: `${heightPercent}%`,
                      backgroundColor: layer.color,
                      minHeight: heightPercent > 0 ? 4 : 0,
                    }}
                  />
                );
              })}
            </div>
            <p className="text-[9px] mt-1 font-bold" style={{ color: colors.text }}>CASH</p>
            <p className="text-[8px]" style={{ color: colors.muted }}>
              {formatCurrency(totalIncome, { currency, compact: true })}
            </p>
          </div>

          {/* Arrow Cash → Spending */}
          {spendingTotal > 0 && (
            <div className="flex items-center px-1">
              <div
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[7px] font-medium"
                style={{ backgroundColor: `${COLORS.spending}20`, color: COLORS.spending }}
              >
                <span>{formatCurrency(spendingTotal, { currency, compact: true })}</span>
                <span>→</span>
              </div>
            </div>
          )}

          {/* SPENDING - show breakdown if we have categories */}
          {spendingTotal > 0 && (
            <div className="flex flex-col items-center">
              {expenseCategories.length > 1 ? (
                // Stacked expense bucket showing breakdown
                <div
                  className="rounded-md overflow-hidden flex flex-col-reverse"
                  style={{
                    width: 56,
                    height: 72,
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.surfaceLight,
                  }}
                >
                  {expenseCategories.map((exp, idx) => {
                    const heightPercent = (exp.amount / spendingTotal) * 100;
                    return (
                      <div
                        key={idx}
                        style={{
                          height: `${heightPercent}%`,
                          backgroundColor: exp.color,
                          minHeight: heightPercent > 0 ? 4 : 0,
                        }}
                        title={`${exp.label}: ${formatCurrency(exp.amount, { currency, compact: true })}`}
                      />
                    );
                  })}
                </div>
              ) : (
                // Single color if no breakdown
                <div
                  className="rounded-md flex items-center justify-center"
                  style={{
                    width: 56,
                    height: 72,
                    backgroundColor: COLORS.spending,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <span className="text-white text-[10px] font-bold">
                    {formatCurrency(spendingTotal, { currency, compact: true })}
                  </span>
                </div>
              )}
              <p className="text-[9px] mt-1 font-bold" style={{ color: colors.text }}>SPENT</p>
              <p className="text-[8px]" style={{ color: colors.muted }}>
                {formatCurrency(spendingTotal, { currency, compact: true })}
              </p>
            </div>
          )}
        </div>

        {/* Expense Categories Breakdown */}
        {expenseCategories.length > 0 && (
          <div className="mt-3">
            <div className="flex justify-center mt-1">
              <div className="flex flex-col items-center">
                <div style={{ color: colors.muted }}>▼</div>
                <div className="w-0.5 h-2" style={{ backgroundColor: colors.muted }} />
              </div>
            </div>
            <p className="text-[9px] text-center uppercase tracking-wider mb-2" style={{ color: colors.muted }}>
              Spending Breakdown
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              {expenseCategories.slice(0, 6).map((exp, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div
                    className="rounded-md shadow-sm"
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor: exp.color,
                      border: `1px solid ${colors.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span className="text-white text-[10px] font-bold">
                      {formatCurrency(exp.amount, { currency, compact: true })}
                    </span>
                  </div>
                  <p className="text-[8px] mt-1 font-medium truncate max-w-[50px]" style={{ color: colors.text }}>
                    {exp.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend / Passive income note */}
        {passiveIncome.length > 0 && (
          <div className="mt-3 pt-2 text-center" style={{ borderTop: `1px dashed ${colors.border}` }}>
            <p className="text-[8px]" style={{ color: COLORS.dividend }}>
              💰 Passive income from: {passiveIncome.map(p => p.label).slice(0, 3).join(', ')}
            </p>
          </div>
        )}

        {/* Color Legend */}
        <div className="flex justify-center gap-3 mt-2 text-[7px]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-md" style={{ backgroundColor: COLORS.existing }} />
            <span style={{ color: colors.muted }}>Existing</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-md" style={{ backgroundColor: COLORS.invest }} />
            <span style={{ color: colors.muted }}>Invested</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-md" style={{ backgroundColor: COLORS.dividend }} />
            <span style={{ color: colors.muted }}>Passive</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
