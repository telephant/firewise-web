'use client';

import { useMemo } from 'react';
import { colors, BarChart } from '@/components/fire/ui';
import type { BarChartData } from '@/components/fire/ui';
import type { Dividend } from '@/lib/fire/api';

interface Props {
  dividends: Dividend[];
  currency: string;
  taxMode: 'gross' | 'net';
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtFull(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function DividendStatsView({ dividends, currency, taxMode }: Props) {
  // Build last-12-months bar chart data
  const barData = useMemo<BarChartData[]>(() => {
    const now = new Date();
    const months: BarChartData[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const total = dividends
        .filter(div => {
          const dd = new Date(div.ex_date);
          return dd.getFullYear() === y && dd.getMonth() === m;
        })
        .reduce((sum, div) => sum + (taxMode === 'net' ? div.total_amount * (1 - div.tax_rate) : div.total_amount), 0);
      months.push({
        name: `${MONTH_NAMES[m]} ${String(y).slice(2)}`,
        value: total,
        fill: i === 0 ? colors.accent : colors.positive,
      });
    }
    return months;
  }, [dividends, taxMode]);

  // Per-ticker breakdown
  const tickerTotals = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    dividends.forEach(d => {
      const existing = map.get(d.ticker) ?? { amount: 0, count: 0 };
      const amt = taxMode === 'net' ? d.total_amount * (1 - d.tax_rate) : d.total_amount;
      map.set(d.ticker, { amount: existing.amount + amt, count: existing.count + 1 });
    });
    return [...map.entries()]
      .map(([ticker, { amount, count }]) => ({ ticker, amount, count }))
      .sort((a, b) => b.amount - a.amount);
  }, [dividends, taxMode]);

  const grandTotal = tickerTotals.reduce((s, item) => s + item.amount, 0);

  return (
    <div>
      {/* Monthly trend */}
      <p style={{ color: colors.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
        Monthly Trend (last 12 months)
      </p>
      {dividends.length === 0 ? (
        <p style={{ color: colors.muted, fontSize: 13, marginBottom: 24 }}>No dividend data yet.</p>
      ) : (
        <div style={{ marginBottom: 28 }}>
          <BarChart
            data={barData}
            labelWidth={52}
            valueWidth={80}
            rowHeight={28}
            barSize={11}
            valueFormatter={(v) => fmt(v, currency)}
            showTooltip
          />
        </div>
      )}

      {/* Per-ticker breakdown */}
      {tickerTotals.length > 0 && (
        <>
          <p style={{ color: colors.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            By Ticker
          </p>
          <div>
            {tickerTotals.map(({ ticker, amount, count }) => {
              const pct = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
              return (
                <div key={ticker} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: colors.text, fontSize: 13, fontWeight: 600, minWidth: 80 }}>{ticker}</span>
                      <span style={{ color: colors.muted, fontSize: 11 }}>{count}×</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: colors.muted, fontSize: 11 }}>{pct.toFixed(1)}%</span>
                      <span style={{ color: colors.positive, fontSize: 13, fontWeight: 500, minWidth: 90, textAlign: 'right' }}>
                        {fmtFull(amount, currency)}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 3, backgroundColor: colors.surfaceLight, borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: colors.positive, borderRadius: 2, transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              );
            })}
            {/* Grand total */}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: colors.muted, fontSize: 12, fontWeight: 600 }}>Total</span>
              <span style={{ color: colors.positive, fontSize: 14, fontWeight: 700 }}>{fmtFull(grandTotal, currency)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
