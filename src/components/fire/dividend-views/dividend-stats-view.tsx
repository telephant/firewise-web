'use client';

import { useMemo } from 'react';
import { colors, BarChart } from '@/components/fire/ui';
import type { BarChartData } from '@/components/fire/ui';
import { useCurrency } from '@/components/fire/currency-context';
import type { Dividend } from '@/lib/fire/api';

interface Props {
  dividends: Dividend[];
  taxMode: 'gross' | 'net';
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function DividendStatsView({ dividends, taxMode }: Props) {
  const { fmt: fmtCurrency } = useCurrency();

  // Build monthly bar chart from the actual date range in dividends
  const barData = useMemo<BarChartData[]>(() => {
    if (dividends.length === 0) return [];

    // Find min and max months in the filtered set
    const now = new Date();
    let minYear = now.getFullYear(), minMonth = now.getMonth();
    let maxYear = now.getFullYear(), maxMonth = now.getMonth();

    dividends.forEach(d => {
      const dd = new Date(d.ex_date);
      const y = dd.getFullYear(), m = dd.getMonth();
      if (y < minYear || (y === minYear && m < minMonth)) { minYear = y; minMonth = m; }
      if (y > maxYear || (y === maxYear && m > maxMonth)) { maxYear = y; maxMonth = m; }
    });

    // Build month buckets from minDate to maxDate
    const months: BarChartData[] = [];
    let y = minYear, m = minMonth;
    while (y < maxYear || (y === maxYear && m <= maxMonth)) {
      const total = dividends
        .filter(div => {
          const dd = new Date(div.ex_date);
          return dd.getFullYear() === y && dd.getMonth() === m;
        })
        .reduce((sum, div) => sum + (taxMode === 'net' ? (div.amount_usd ?? 0) * (1 - div.tax_rate) : (div.amount_usd ?? 0)), 0);
      const isCurrentMonth = y === now.getFullYear() && m === now.getMonth();
      months.push({
        name: `${MONTH_NAMES[m]} ${String(y).slice(2)}`,
        value: total,
        fill: isCurrentMonth ? colors.accent : colors.positive,
      });
      m++;
      if (m > 11) { m = 0; y++; }
    }
    return months;
  }, [dividends, taxMode]);

  // Per-ticker breakdown
  const tickerTotals = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    dividends.forEach(d => {
      const existing = map.get(d.ticker) ?? { amount: 0, count: 0 };
      const amt = taxMode === 'net' ? (d.amount_usd ?? 0) * (1 - d.tax_rate) : (d.amount_usd ?? 0);
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
        Monthly Trend
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
            valueFormatter={(v) => fmtCurrency(v, { decimals: 0 })}
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
                        {fmtCurrency(amount)}
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

          </div>
        </>
      )}
    </div>
  );
}
