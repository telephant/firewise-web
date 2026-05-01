'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  portfolioApi,
  portfolioStatsApi,
  exchangeRateApi,
} from '@/lib/fire/api';
import type { Portfolio, PortfolioStats } from '@/lib/fire/api';
import {
  colors,
  Button,
  Loader,
  CurrencyCombobox,
  ButtonGroup,
} from '@/components/fire/ui';
import { CreatePortfolioDialog } from '@/components/fire/create-portfolio-dialog';

// ── helpers ────────────────────────────────────────────────────────────────

function convert(
  value: number,
  fromCurrency: string,
  rates: Record<string, number>
): { value: number; approximate: boolean } {
  if (!rates[fromCurrency] || rates[fromCurrency] === 0) {
    return { value, approximate: true };
  }
  return { value: value / rates[fromCurrency], approximate: false };
}

function fmtNumber(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ColoredCell({
  value,
  prefix = '',
  dash = false,
}: {
  value?: number | null;
  prefix?: string;
  dash?: boolean;
}) {
  if (dash || value === undefined || value === null) {
    return <span style={{ color: colors.muted }}>—</span>;
  }
  const color = value >= 0 ? colors.positive : colors.negative;
  return (
    <span style={{ color }}>
      {prefix}{fmtNumber(value)}
    </span>
  );
}

// ── component ──────────────────────────────────────────────────────────────

export default function PortfoliosPage() {
  const router = useRouter();

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsMap, setStatsMap] = useState<Record<string, PortfolioStats>>({});
  const [statsLoading, setStatsLoading] = useState(false);
  const [baseCurrency, setBaseCurrencyState] = useState('USD');
  const [convertMode, setConvertMode] = useState(false);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [createOpen, setCreateOpen] = useState(false);

  const setBaseCurrency = useCallback((val: string) => {
    setBaseCurrencyState(val);
    localStorage.setItem('fire_base_currency', val);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('fire_base_currency');
    if (saved) setBaseCurrencyState(saved);

    portfolioApi.list().then(r => {
      if (r.success && r.data) {
        const list = r.data;
        setPortfolios(list);
        setLoading(false);

        if (list.length > 0) {
          setStatsLoading(true);
          Promise.all(list.map(p => portfolioStatsApi.getStats(p.id))).then(results => {
            const map: Record<string, PortfolioStats> = {};
            results.forEach((res, i) => {
              if (res.success && res.data) {
                map[list[i].id] = res.data;
              }
            });
            setStatsMap(map);
            setStatsLoading(false);
          });
        }
      } else {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (portfolios.length === 0) return;
    const uniqueCurrencies = [...new Set(portfolios.map(p => p.currency))];
    exchangeRateApi.get(baseCurrency, uniqueCurrencies).then(r => {
      if (r.success && r.data) {
        setRates(r.data.rates);
      }
    });
  }, [portfolios, baseCurrency]);

  function getCellValue(
    portfolioId: string,
    portfolioCurrency: string,
    field: keyof Pick<PortfolioStats, 'total_value' | 'total_cost' | 'unrealized_pl' | 'realized_pl' | 'dividend_ytd'>
  ): { display: string | null; raw: number | null; approximate: boolean } {
    if (statsLoading) return { display: null, raw: null, approximate: false };
    const stats = statsMap[portfolioId];
    if (!stats) return { display: null, raw: null, approximate: false };

    const rawVal = stats[field];

    if (convertMode) {
      const { value: converted, approximate } = convert(rawVal, portfolioCurrency, rates);
      return { display: `${approximate ? '~' : ''}${fmtNumber(converted)}`, raw: converted, approximate };
    }
    return { display: fmtNumber(rawVal), raw: rawVal, approximate: false };
  }

  function getReturnPct(portfolioId: string, portfolioCurrency: string): number | null {
    if (statsLoading) return null;
    const stats = statsMap[portfolioId];
    if (!stats || !stats.total_cost || stats.total_cost === 0) return null;
    const totalReturn = stats.unrealized_pl + stats.realized_pl + stats.dividend_ytd;
    return (totalReturn / stats.total_cost) * 100;
  }

  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    textAlign: 'left',
    color: colors.muted,
    fontWeight: 500,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: `1px solid ${colors.border}`,
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 14px',
    color: colors.text,
    fontSize: 13,
    borderBottom: `1px solid ${colors.border}`,
  };

  const currencyLabel = convertMode ? ` (${baseCurrency})` : '';

  return (
    <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Portfolios</h1>
        <Button onClick={() => setCreateOpen(true)} size="sm">+ New Portfolio</Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 200 }}>
          <CurrencyCombobox value={baseCurrency} onChange={setBaseCurrency} />
        </div>
        <ButtonGroup
          options={[
            { id: 'original', label: 'Original' },
            { id: 'convert', label: 'Convert' },
          ]}
          value={convertMode ? 'convert' : 'original'}
          onChange={(v) => setConvertMode(v === 'convert')}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <Loader size="md" variant="bar" />
        </div>
      ) : portfolios.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 80, color: colors.muted }}>
          <p style={{ marginBottom: 16, fontSize: 14 }}>No portfolios yet.</p>
          <Button onClick={() => setCreateOpen(true)}>Create your first portfolio</Button>
        </div>
      ) : (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Currency</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Net Value{currencyLabel}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total Cost{currencyLabel}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Unrealized P&amp;L{currencyLabel}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Realized P&amp;L{currencyLabel}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>YTD Dividends{currencyLabel}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Return %</th>
              </tr>
            </thead>
            <tbody>
              {portfolios.map(p => {
                const currency = p.currency;
                const netVal = getCellValue(p.id, currency, 'total_value');
                const totalCost = getCellValue(p.id, currency, 'total_cost');
                const unrealized = getCellValue(p.id, currency, 'unrealized_pl');
                const realized = getCellValue(p.id, currency, 'realized_pl');
                const ytdDiv = getCellValue(p.id, currency, 'dividend_ytd');
                const returnPct = getReturnPct(p.id, currency);

                return (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/fire/portfolios/${p.id}`)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = colors.surfaceLight; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''; }}
                  >
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{p.name}</td>
                    <td style={{ ...tdStyle, color: colors.muted }}>{currency}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {statsLoading || netVal.display === null ? <span style={{ color: colors.muted }}>—</span> : <span style={{ color: colors.text }}>{netVal.approximate ? '~' : ''}{netVal.display}</span>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {statsLoading || totalCost.display === null ? <span style={{ color: colors.muted }}>—</span> : <span style={{ color: colors.text }}>{totalCost.approximate ? '~' : ''}{totalCost.display}</span>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {statsLoading || unrealized.raw === null ? <span style={{ color: colors.muted }}>—</span> : <span style={{ color: unrealized.raw >= 0 ? colors.positive : colors.negative }}>{unrealized.approximate ? '~' : ''}{unrealized.display}</span>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {statsLoading || realized.raw === null ? <span style={{ color: colors.muted }}>—</span> : <span style={{ color: realized.raw >= 0 ? colors.positive : colors.negative }}>{realized.approximate ? '~' : ''}{realized.display}</span>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {statsLoading || ytdDiv.raw === null ? <span style={{ color: colors.muted }}>—</span> : <span style={{ color: ytdDiv.raw >= 0 ? colors.positive : colors.negative }}>{ytdDiv.approximate ? '~' : ''}{ytdDiv.display}</span>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {statsLoading || returnPct === null ? <span style={{ color: colors.muted }}>—</span> : <span style={{ color: returnPct >= 0 ? colors.positive : colors.negative }}>{returnPct >= 0 ? '+' : ''}{fmtNumber(returnPct)}%</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CreatePortfolioDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={p => { setPortfolios(prev => [...prev, p]); setCreateOpen(false); }}
      />
    </div>
  );
}
