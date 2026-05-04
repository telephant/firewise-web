'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { colors, Button, Loader, StatCard, Tabs, TabsList, TabsTrigger, TabsContent, BarChart } from '@/components/fire/ui';
import type { BarChartData } from '@/components/fire/ui';
import {
  holdingApi,
  dividendApi,
  portfolioStatsApi,
  portfolioApi,
  dcaApi,
} from '@/lib/fire/api';
import type { Holding, Dividend, PortfolioStats, Portfolio, PortfolioSnapshot, RealizedPLItem, DcaPlan, DcaPending } from '@/lib/fire/api';
import { useSetPageTitle } from '@/components/fire/page-context';
import { useCurrency } from '@/components/fire/currency-context';
import { RecordTradeDialog } from '@/components/fire/record-trade-dialog';
import { AddDividendDialog } from '@/components/fire/add-dividend-dialog';
import { HoldingTradesPanel } from '@/components/fire/holding-trades-panel';
import { DcaPlanDialog } from '@/components/fire/dca-plan-dialog';
import { DcaPendingCard } from '@/components/fire/dca-pending-card';
import { isCommodity, displayTicker, displayUnit } from '@/lib/fire/commodities';
import { PortfolioTreemap } from '@/components/fire/portfolio-treemap';
import { PortfolioAnalyticsPanel } from '@/components/fire/portfolio-analytics-panel';
import { DividendViews } from '@/components/fire/dividend-views';

function fmt(value: number | null, currency: string): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function pct(value: number | null): string {
  if (value === null) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

type ChartPoint = { month: string; value: number; snapshotDate: string };

function getYoY(snapshot: ChartPoint, allPoints: ChartPoint[]): string | null {
  if (snapshot.snapshotDate === 'now') return null;
  const thisDate = new Date(snapshot.snapshotDate);
  const lastYear = new Date(thisDate);
  lastYear.setFullYear(lastYear.getFullYear() - 1);
  const lastYearStr = lastYear.toISOString().slice(0, 7);
  const prev = allPoints.find(p => p.snapshotDate !== 'now' && p.snapshotDate.startsWith(lastYearStr));
  if (!prev) return null;
  const p = ((snapshot.value - prev.value) / prev.value) * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}% YoY`;
}

const HOLDINGS_PAGE_SIZE = 10;

export default function PortfolioDetail() {
  const { id } = useParams<{ id: string }>();
  const { fmt: fmtCurrency } = useCurrency();

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  useSetPageTitle(portfolio?.name ?? null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  // P&L tab lazy load
  const [plItems, setPlItems] = useState<RealizedPLItem[]>([]);
  const [plLoaded, setPlLoaded] = useState(false);
  const [plLoading, setPlLoading] = useState(false);

  const [dcaPlans, setDcaPlans] = useState<DcaPlan[]>([]);
  const [dcaPending, setDcaPending] = useState<DcaPending[]>([]);
  const [dcaDialogOpen, setDcaDialogOpen] = useState(false);
  const [editDcaPlan, setEditDcaPlan] = useState<DcaPlan | undefined>(undefined);
  const [deletingDcaId, setDeletingDcaId] = useState<string | null>(null);

  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [dividendDialogOpen, setDividendDialogOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [holdingsPage, setHoldingsPage] = useState(0);
  const [copied, setCopied] = useState(false);
  const [holdingsSearch, setHoldingsSearch] = useState('');
  const [holdingsSort, setHoldingsSort] = useState<{ key: 'ticker' | 'shares' | 'value' | 'unrealized_pl' | 'unrealized_pl_pct'; dir: 'asc' | 'desc' }>({ key: 'value', dir: 'desc' });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      portfolioApi.get(id),
      holdingApi.list(id),
      dividendApi.list(id),
      portfolioStatsApi.getStats(id),
      portfolioStatsApi.getSnapshots(id),
      dcaApi.listPlans(),
      dcaApi.listPending(id),
    ]).then(([portfolioRes, holdingsRes, dividendsRes, statsRes, snapshotsRes, dcaPlansRes, dcaPendingRes]) => {
      if (portfolioRes.success && portfolioRes.data) setPortfolio(portfolioRes.data);
      if (holdingsRes.success && holdingsRes.data) setHoldings(holdingsRes.data);
      if (dividendsRes.success && dividendsRes.data) setDividends(dividendsRes.data);
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (snapshotsRes.success && snapshotsRes.data) setSnapshots(snapshotsRes.data);
      if (dcaPlansRes.success && dcaPlansRes.data) setDcaPlans(dcaPlansRes.data.filter(p => p.portfolio_id === id));
      if (dcaPendingRes.success && dcaPendingRes.data) setDcaPending(dcaPendingRes.data);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    setHoldingsPage(0);
  }, [holdings]);

  function handlePlTabActivate() {
    if (plLoaded || plLoading) return;
    setPlLoading(true);
    portfolioApi.getRealizedPL(id).then((res) => {
      if (res.success && res.data) setPlItems(res.data);
      setPlLoaded(true);
      setPlLoading(false);
    });
  }

  const currency = portfolio?.currency || stats?.currency || 'USD';

  const filteredHoldings = holdings
    .filter(h => h.ticker.toLowerCase().includes(holdingsSearch.toLowerCase()))
    .sort((a, b) => {
      const { key, dir } = holdingsSort;
      const mul = dir === 'asc' ? 1 : -1;
      if (key === 'ticker') return mul * a.ticker.localeCompare(b.ticker);
      const av = a[key] ?? -Infinity;
      const bv = b[key] ?? -Infinity;
      return mul * ((av as number) - (bv as number));
    });

  // Build chart data for Stats tab
  const sorted = [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
  const chartData: ChartPoint[] = [
    ...sorted.map(s => ({
      month: formatMonthLabel(s.snapshot_date),
      value: s.total_value,
      snapshotDate: s.snapshot_date,
    })),
    ...(stats ? [{ month: 'Now', value: stats.total_value, snapshotDate: 'now' }] : []),
  ];

  const sinceInception =
    snapshots.length > 0 && stats
      ? ((stats.total_value - snapshots[0].total_value) / snapshots[0].total_value) * 100
      : null;

  // Map chartData to BarChartData (name = month label, value = total_value)
  const barData: BarChartData[] = chartData.map(pt => ({
    name: pt.month,
    value: pt.value,
    snapshotDate: pt.snapshotDate,
    yoy: getYoY(pt, chartData),
    fill: pt.snapshotDate === 'now' ? colors.accent : colors.positive,
  }));

  if (loading) {
    return (
      <div style={{ height: '100%', backgroundColor: colors.bg, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Loader size="md" variant="bar" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: colors.bg, overflow: 'hidden' }}>
      {/* Header — fixed, does not scroll */}
      <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: 0 }}>{portfolio?.name || 'Portfolio'}</h1>
              <button
                onClick={() => {
                  const lines = holdings
                    .filter(h => h.value !== null && h.value > 0)
                    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
                    .map(h => {
                      const weight = stats?.total_value ? ((h.value! / stats.total_value) * 100).toFixed(1) : '—';
                      const value = new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(h.value!);
                      return `${h.ticker}\t${weight}%\t${value}`;
                    });
                  navigator.clipboard.writeText(['Ticker\tWeight\tValue', ...lines].join('\n'));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: copied ? colors.positive : colors.muted, fontSize: 12, padding: '2px 8px',
                  borderRadius: 4, transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = colors.text)}
                onMouseLeave={e => (e.currentTarget.style.color = colors.muted)}
              >
                {copied ? '✓ Copied' : 'Copy Holdings'}
              </button>
            </div>
            {portfolio?.description && (
              <p style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{portfolio.description}</p>
            )}
          </div>
          <Button onClick={() => setTradeDialogOpen(true)}>Record Trade</Button>
        </div>
      </div>

      {/* Tabs — flex column, fills remaining height */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px 24px' }}>
      <Tabs
        defaultValue="distribution"
        onValueChange={(v) => { if (v === 'pl') handlePlTabActivate(); }}
        style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
      >
        <TabsList style={{ flexShrink: 0 }}>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="dividends">Dividends</TabsTrigger>
          <TabsTrigger value="pl">P&amp;L</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="dca">DCA {dcaPending.length > 0 && `(${dcaPending.length})`}</TabsTrigger>
        </TabsList>

        {/* Distribution Tab — fills height, no scroll */}
        <TabsContent value="distribution" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'row', gap: 12, marginTop: 16 }}>
          {/* Treemap — 65% width */}
          <div style={{ flex: '0 0 65%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <PortfolioTreemap
              holdings={holdings}
              currency={currency}
              totalValue={stats?.total_value ?? 0}
            />
          </div>
          {/* Analytics panel — 35% width */}
          <div style={{ flex: '0 0 calc(35% - 12px)', overflow: 'hidden' }}>
            {portfolio && <PortfolioAnalyticsPanel portfolioId={portfolio.id} />}
          </div>
        </TabsContent>

        {/* Holdings Tab */}
        <TabsContent value="holdings" style={{ flex: 1, overflow: 'auto', marginTop: 16 }}>
          <div>
            {holdings.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '48px 0', color: colors.muted, fontSize: 14 }}>
                No holdings yet. Record a buy trade to get started.
              </p>
            ) : (
              <>
                {/* Search */}
                <div style={{ marginBottom: 12 }}>
                  <input
                    value={holdingsSearch}
                    onChange={e => { setHoldingsSearch(e.target.value); setHoldingsPage(0); }}
                    placeholder="Search ticker…"
                    style={{
                      background: colors.surfaceLight,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 6,
                      color: colors.text,
                      fontSize: 13,
                      padding: '6px 12px',
                      outline: 'none',
                      width: 180,
                    }}
                  />
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                        {([
                          { label: 'Ticker', key: 'ticker' },
                          { label: 'Qty', key: null },
                          { label: 'Avg Cost', key: null },
                          { label: 'Current Price', key: null },
                          { label: 'Value', key: 'value' },
                          { label: 'Unrealized P&L', key: 'unrealized_pl' },
                          { label: '', key: null },
                        ] as { label: string; key: string | null }[]).map(col => (
                          <th
                            key={col.label}
                            onClick={() => {
                              if (!col.key) return;
                              const k = col.key as typeof holdingsSort.key;
                              setHoldingsSort(s => s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'desc' });
                              setHoldingsPage(0);
                            }}
                            style={{
                              paddingBottom: 8, paddingRight: 16, textAlign: 'left',
                              color: holdingsSort.key === col.key ? colors.text : colors.muted,
                              fontWeight: 500, fontSize: 12,
                              cursor: col.key ? 'pointer' : 'default',
                              userSelect: 'none',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {col.label}
                            {col.key && holdingsSort.key === col.key && (
                              <span style={{ marginLeft: 4 }}>{holdingsSort.dir === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHoldings
                        .slice(holdingsPage * HOLDINGS_PAGE_SIZE, (holdingsPage + 1) * HOLDINGS_PAGE_SIZE)
                        .map((h) => {
                          const plPositive = h.unrealized_pl !== null ? h.unrealized_pl >= 0 : null;
                          return (
                            <tr key={`${h.ticker}-${h.market}`} style={{ borderBottom: `1px solid ${colors.border}` }}>
                              <td style={{ padding: '12px 16px 12px 0', fontWeight: 600, color: colors.text }}>
                                {displayTicker(h.ticker, h.market)}
                                <span style={{
                                  display: 'inline-block',
                                  marginLeft: 6,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  backgroundColor: isCommodity(h.market) ? `${colors.warning}20` : `${colors.accent}20`,
                                  color: isCommodity(h.market) ? colors.warning : colors.accent,
                                  border: `1px solid ${isCommodity(h.market) ? `${colors.warning}40` : `${colors.accent}40`}`,
                                }}>
                                  {isCommodity(h.market) ? 'CMDTY' : h.market}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{isCommodity(h.market) ? h.shares.toFixed(4) : h.shares} {displayUnit(h.ticker, h.market)}</td>
                              <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{fmt(h.avg_cost, h.currency)}</td>
                              <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>
                                {h.current_price !== null ? fmt(h.current_price, h.currency) : '—'}
                              </td>
                              <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>
                                {h.value !== null ? fmt(h.value, h.currency) : '—'}
                              </td>
                              <td style={{ padding: '12px 16px 12px 0', fontWeight: 600, color: plPositive === true ? colors.positive : plPositive === false ? colors.negative : colors.text }}>
                                {h.unrealized_pl !== null ? fmt(h.unrealized_pl, h.currency) : '—'}
                                {h.unrealized_pl_pct !== null && (
                                  <span style={{ marginLeft: 4, fontSize: 11 }}>({pct(h.unrealized_pl_pct)})</span>
                                )}
                              </td>
                              <td style={{ padding: '12px 0' }}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedHolding(h)}
                                >
                                  Trades
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                {filteredHoldings.length === 0 && holdingsSearch && (
                  <p style={{ textAlign: 'center', padding: '24px 0', color: colors.muted, fontSize: 13 }}>
                    No results for "{holdingsSearch}"
                  </p>
                )}
                {filteredHoldings.length > HOLDINGS_PAGE_SIZE && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16 }}>
                    <Button variant="ghost" size="sm" disabled={holdingsPage === 0} onClick={() => setHoldingsPage(p => p - 1)}>← Prev</Button>
                    <span style={{ fontSize: 12, color: colors.muted }}>
                      Page {holdingsPage + 1} of {Math.ceil(filteredHoldings.length / HOLDINGS_PAGE_SIZE)}
                    </span>
                    <Button variant="ghost" size="sm" disabled={(holdingsPage + 1) * HOLDINGS_PAGE_SIZE >= filteredHoldings.length} onClick={() => setHoldingsPage(p => p + 1)}>Next →</Button>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* Dividends Tab */}
        <TabsContent value="dividends" style={{ flex: 1, overflow: 'auto', marginTop: 16 }}>
          <DividendViews
            dividends={dividends}
            currency={currency}
            onAddDividend={() => setDividendDialogOpen(true)}
          />
        </TabsContent>

        {/* P&L Tab */}
        <TabsContent value="pl" style={{ flex: 1, overflow: 'auto', marginTop: 16 }}>
          <div>
            {plLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                <Loader size="sm" variant="dots" />
              </div>
            ) : !plLoaded || plItems.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '48px 0', color: colors.muted, fontSize: 14 }}>
                No closed positions yet.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                      {['Ticker', 'Realized P&L', '# Trades'].map(h => (
                        <th key={h} style={{ paddingBottom: 8, paddingRight: 16, textAlign: 'left', color: colors.muted, fontWeight: 500, fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {plItems.map((item) => {
                      const plColor =
                        item.realized_pl > 0
                          ? colors.positive
                          : item.realized_pl < 0
                          ? colors.negative
                          : colors.text;
                      return (
                        <tr key={item.ticker} style={{ borderBottom: `1px solid ${colors.border}` }}>
                          <td style={{ padding: '12px 16px 12px 0', fontWeight: 600, color: colors.text }}>{item.ticker}</td>
                          <td style={{ padding: '12px 16px 12px 0', fontWeight: 600, color: plColor }}>
                            {fmtCurrency(item.realized_pl)}
                          </td>
                          <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{item.trade_count}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" style={{ flex: 1, overflow: 'auto', marginTop: 16 }}>
          <div>
            {!stats ? (
              <p style={{ textAlign: 'center', padding: '48px 0', color: colors.muted, fontSize: 14 }}>No stats available.</p>
            ) : (
              <>
                {/* Monthly Trend Chart */}
                <div style={{ marginBottom: 24 }}>
                  <p style={{ color: colors.muted, fontSize: 12, fontWeight: 500, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Portfolio Value Trend</p>
                  {snapshots.length < 2 ? (
                    <p style={{ color: colors.muted, fontSize: 13 }}>Insufficient data — snapshots are generated monthly.</p>
                  ) : (
                    <BarChart
                      data={barData}
                      labelWidth={56}
                      valueWidth={90}
                      rowHeight={32}
                      barSize={14}
                      valueFormatter={(v) => fmtCurrency(v)}
                      showTooltip
                    />
                  )}
                </div>

                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                  <StatCard
                    label="Since Inception"
                    value={
                      sinceInception !== null
                        ? `${sinceInception >= 0 ? '+' : ''}${sinceInception.toFixed(2)}%`
                        : '—'
                    }
                    valueColor={sinceInception !== null && sinceInception >= 0 ? 'positive' : 'negative'}
                  />
                  <StatCard label="Total Value" value={fmtCurrency(stats.total_value)} valueColor="default" />
                  <StatCard label="Total Cost" value={fmtCurrency(stats.total_cost)} valueColor="default" />
                  <StatCard
                    label="Unrealized P&L"
                    value={fmtCurrency(stats.unrealized_pl)}
                    valueColor={stats.unrealized_pl >= 0 ? 'positive' : 'negative'}
                  />
                  <StatCard
                    label="Realized P&L"
                    value={fmtCurrency(stats.realized_pl)}
                    valueColor={stats.realized_pl >= 0 ? 'positive' : 'negative'}
                  />
                  <StatCard label="Dividends (YTD)" value={fmtCurrency(stats.dividend_ytd)} valueColor="positive" />
                  <StatCard label="Dividends (MTD)" value={fmtCurrency(stats.dividend_mtd)} valueColor="positive" />
                  <StatCard
                    label="MoM Gain"
                    value={
                      stats.mom_gain !== null
                        ? `${fmtCurrency(stats.mom_gain)} (${pct(stats.mom_gain_pct)})`
                        : '—'
                    }
                    valueColor={stats.mom_gain !== null ? (stats.mom_gain >= 0 ? 'positive' : 'negative') : 'default'}
                  />
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* DCA Tab */}
        <TabsContent value="dca" style={{ flex: 1, overflow: 'auto', marginTop: 16 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <Button variant="outline" onClick={() => { setEditDcaPlan(undefined); setDcaDialogOpen(true); }}>
                + New Plan
              </Button>
            </div>

            {/* Pending */}
            {dcaPending.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                  Pending Confirmations
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                  {dcaPending.map(p => (
                    <DcaPendingCard
                      key={p.id}
                      pending={p}
                      onConfirmed={(pendingId) => setDcaPending(prev => prev.filter(x => x.id !== pendingId))}
                      onSkipped={(pendingId) => setDcaPending(prev => prev.filter(x => x.id !== pendingId))}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Plans list */}
            {dcaPlans.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '48px 0', color: colors.muted, fontSize: 14 }}>
                No DCA plans yet. Create one to start recurring investments.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                      {['Ticker', 'Frequency', 'Mode', 'Amount / Shares', 'Next Run', 'Status', ''].map(h => (
                        <th key={h} style={{ paddingBottom: 8, paddingRight: 16, textAlign: 'left', color: colors.muted, fontWeight: 500, fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dcaPlans.map(plan => (
                      <tr key={plan.id} style={{ borderBottom: `1px solid ${colors.border}`, opacity: plan.is_active ? 1 : 0.5 }}>
                        <td style={{ padding: '12px 16px 12px 0', fontWeight: 600, color: colors.text }}>
                          {plan.ticker}
                          <span style={{ marginLeft: 6, fontSize: 11, color: colors.muted }}>{plan.market}</span>
                        </td>
                        <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>
                          {{ weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' }[plan.frequency]}
                        </td>
                        <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{plan.mode === 'amount' ? 'Amount' : 'Shares'}</td>
                        <td style={{ padding: '12px 16px 12px 0', color: colors.info }}>
                          {plan.mode === 'amount' ? `${plan.currency} ${plan.amount}` : `${plan.shares} shares`}
                        </td>
                        <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{plan.next_run_date}</td>
                        <td style={{ padding: '12px 16px 12px 0' }}>
                          <span style={{ fontSize: 11, color: plan.is_active ? colors.positive : colors.muted }}>
                            {plan.is_active ? 'Active' : 'Paused'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 0', display: 'flex', gap: 4 }}>
                          <Button variant="ghost" size="sm" onClick={() => { setEditDcaPlan(plan); setDcaDialogOpen(true); }}>Edit</Button>
                          <Button variant="ghost" size="sm"
                            onClick={async () => {
                              if (!confirm('Delete this DCA plan?')) return;
                              setDeletingDcaId(plan.id);
                              await dcaApi.deletePlan(plan.id);
                              setDeletingDcaId(null);
                              setDcaPlans(prev => prev.filter(p => p.id !== plan.id));
                              setDcaPending(prev => prev.filter(p => p.dca_plan_id !== plan.id));
                            }}
                            disabled={deletingDcaId === plan.id}
                            style={{ color: colors.negative }}
                          >
                            {deletingDcaId === plan.id ? '...' : 'Delete'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      </div>

      <RecordTradeDialog
        open={tradeDialogOpen}
        onOpenChange={setTradeDialogOpen}
        portfolioId={id}
        defaultCurrency={currency}
        onSuccess={() => {
          setTradeDialogOpen(false);
          holdingApi.list(id).then((r) => {
            if (r.success && r.data) setHoldings(r.data);
          });
        }}
      />

      <AddDividendDialog
        open={dividendDialogOpen}
        onOpenChange={setDividendDialogOpen}
        portfolioId={id}
        defaultCurrency={currency}
        onSuccess={(d) => {
          setDividends((prev) => [d, ...prev]);
          setDividendDialogOpen(false);
        }}
      />

      <HoldingTradesPanel
        open={!!selectedHolding}
        onClose={() => setSelectedHolding(null)}
        portfolioId={id}
        holding={selectedHolding}
        currency={currency}
        onHoldingsChanged={() => {
          holdingApi.list(id).then((r) => {
            if (r.success && r.data) setHoldings(r.data);
          });
        }}
      />

      <DcaPlanDialog
        open={dcaDialogOpen}
        onOpenChange={(o) => { setDcaDialogOpen(o); if (!o) setEditDcaPlan(undefined); }}
        portfolioId={id}
        defaultCurrency={currency}
        editPlan={editDcaPlan}
        onSuccess={(plan) => {
          setDcaPlans(prev => {
            const idx = prev.findIndex(p => p.id === plan.id);
            return idx >= 0 ? prev.map(p => p.id === plan.id ? plan : p) : [plan, ...prev];
          });
          setDcaDialogOpen(false);
          setEditDcaPlan(undefined);
        }}
      />
    </div>
  );
}
