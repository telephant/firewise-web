'use client';

import { useState } from 'react';
import { colors, Input } from '@/components/fire/ui';
import type { Dividend } from '@/lib/fire/api';

interface Props {
  dividends: Dividend[];
  currency: string;
  taxMode: 'gross' | 'net';
}

function fmt(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function DividendTableView({ dividends, currency, taxMode }: Props) {
  const [search, setSearch] = useState('');

  const q = search.trim().toLowerCase();
  const filtered = q
    ? dividends.filter(d =>
        d.ticker.toLowerCase().includes(q) ||
        d.ex_date.includes(q) ||
        (d.pay_date ?? '').includes(q)
      )
    : dividends;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Input
          placeholder="Search ticker or date…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 220, fontSize: 12, height: 30 }}
        />
      </div>
      {filtered.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '48px 0', color: colors.muted, fontSize: 14 }}>
          {dividends.length === 0 ? 'No dividends recorded yet.' : 'No results match your search.'}
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                {['Ticker', 'Ex Date', 'Pay Date', 'Amount/Share', 'Total Amount', 'Tax Rate', 'Source'].map(h => (
                  <th key={h} style={{ paddingBottom: 8, paddingRight: 16, textAlign: 'left', color: colors.muted, fontWeight: 500, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const netAmount = d.total_amount * (1 - d.tax_rate);
                const displayAmount = taxMode === 'net' ? netAmount : d.total_amount;
                return (
                  <tr key={d.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: '12px 16px 12px 0', fontWeight: 600, color: colors.text }}>{d.ticker}</td>
                    <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{d.ex_date}</td>
                    <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{d.pay_date || '—'}</td>
                    <td style={{ padding: '12px 16px 12px 0', color: colors.positive }}>{fmt(d.amount_per_share, d.currency)}</td>
                    <td style={{ padding: '12px 16px 12px 0', color: colors.positive }}>{fmt(displayAmount, d.currency)}</td>
                    <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{(d.tax_rate * 100).toFixed(0)}%</td>
                    <td style={{ padding: '12px 16px 12px 0' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 500,
                        backgroundColor: d.source === 'auto' ? 'rgba(94,106,210,0.15)' : 'rgba(255,255,255,0.06)',
                        color: d.source === 'auto' ? colors.accent : colors.muted,
                        border: `1px solid ${d.source === 'auto' ? 'rgba(94,106,210,0.3)' : colors.border}`,
                      }}>
                        {d.source}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
