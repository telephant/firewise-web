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
import { Breadcrumb } from '@/components/fire/breadcrumb';
import { RecordTradeDialog } from '@/components/fire/record-trade-dialog';
import { AddDividendDialog } from '@/components/fire/add-dividend-dialog';
import { HoldingTradesPanel } from '@/components/fire/holding-trades-panel';
import { DcaPlanDialog } from '@/components/fire/dca-plan-dialog';
import { DcaPendingCard } from '@/components/fire/dca-pending-card';
import { isCommodity, displayTicker, displayUnit } from '@/lib/fire/commodities';
import { PortfolioTreemap } from '@/components/fire/portfolio-treemap';

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

const HOLDINGS_PAGE_SIZE = 20;

export default function PortfolioDetail() {
  const { id } = useParams<{ id: string }>();

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
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
      <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Loader size="md" variant="bar" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Breadcrumb items={[{ label: 'Portfolios', href: '/fire/portfolios' }, { label: portfolio?.name || '...' }]} />
          <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: 0 }}>{portfolio?.name || 'Portfolio'}</h1>
          {portfolio?.description && (
            <p style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{portfolio.description}</p>
          )}
        </div>
        <Button onClick={() => setTradeDialogOpen(true)}>Record Trade</Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="distribution" onValueChange={(v) => { if (v === 'pl') handlePlTabActivate(); }}>
        <TabsList>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="dividends">Dividends</TabsTrigger>
          <TabsTrigger value="pl">P&amp;L</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="dca">DCA {dcaPending.length > 0 && `(${dcaPending.length})`}</TabsTrigger>
        </TabsList>

        {/* Distribution Tab */}
        <TabsContent value="distribution">
          <div style={{ marginTop: 16 }}>
            <PortfolioTreemap
              holdings={holdings}
              currency={currency}
              totalValue={stats?.total_value ?? 0}
            />
          </div>
        </TabsContent>

        {/* Holdings Tab */}
        <TabsContent value="holdings">
          <div style={{ marginTop: 16 }}>
            {holdings.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '48px 0', color: colors.muted, fontSize: 14 }}>
                No holdings yet. Record a buy trade to get started.
              </p>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                        {['Ticker', 'Qty', 'Avg Cost', 'Current Price', 'Value', 'Unrealized P&L', ''].map(h => (
                          <th key={h} style={{ paddingBottom: 8, paddingRight: 16, textAlign: 'left', color: colors.muted, fontWeight: 500, fontSize: 12 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {holdings
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
                {holdings.length > HOLDINGS_PAGE_SIZE && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={holdingsPage === 0}
                      onClick={() => setHoldingsPage(p => p - 1)}
                    >
                      ← Prev
                    </Button>
                    <span style={{ fontSize: 12, color: colors.muted }}>
                      Page {holdingsPage + 1} of {Math.ceil(holdings.length / HOLDINGS_PAGE_SIZE)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={(holdingsPage + 1) * HOLDINGS_PAGE_SIZE >= holdings.length}
                      onClick={() => setHoldingsPage(p => p + 1)}
                    >
                      Next →
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* Dividends Tab */}
        <TabsContent value="dividends">
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <Button variant="outline" onClick={() => setDividendDialogOpen(true)}>Add Dividend</Button>
            </div>
            {dividends.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '48px 0', color: colors.muted, fontSize: 14 }}>No dividends recorded yet.</p>
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
                    {dividends.map((d) => (
                      <tr key={d.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <td style={{ padding: '12px 16px 12px 0', fontWeight: 600, color: colors.text }}>{d.ticker}</td>
                        <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{d.ex_date}</td>
                        <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{d.pay_date || '—'}</td>
                        <td style={{ padding: '12px 16px 12px 0', color: colors.positive }}>{fmt(d.amount_per_share, d.currency)}</td>
                        <td style={{ padding: '12px 16px 12px 0', color: colors.positive }}>{fmt(d.total_amount, d.currency)}</td>
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* P&L Tab */}
        <TabsContent value="pl">
          <div style={{ marginTop: 16 }}>
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
                            {fmt(item.realized_pl, currency)}
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
        <TabsContent value="stats">
          <div style={{ marginTop: 16 }}>
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
                      valueFormatter={(v) => fmt(v, currency)}
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
                  <StatCard label="Total Value" value={fmt(stats.total_value, currency)} valueColor="default" />
                  <StatCard label="Total Cost" value={fmt(stats.total_cost, currency)} valueColor="default" />
                  <StatCard
                    label="Unrealized P&L"
                    value={fmt(stats.unrealized_pl, currency)}
                    valueColor={stats.unrealized_pl >= 0 ? 'positive' : 'negative'}
                  />
                  <StatCard
                    label="Realized P&L"
                    value={fmt(stats.realized_pl, currency)}
                    valueColor={stats.realized_pl >= 0 ? 'positive' : 'negative'}
                  />
                  <StatCard label="Dividends (YTD)" value={fmt(stats.dividend_ytd, currency)} valueColor="positive" />
                  <StatCard label="Dividends (MTD)" value={fmt(stats.dividend_mtd, currency)} valueColor="positive" />
                  <StatCard
                    label="MoM Gain"
                    value={
                      stats.mom_gain !== null
                        ? `${fmt(stats.mom_gain, currency)} (${pct(stats.mom_gain_pct)})`
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
        <TabsContent value="dca">
          <div style={{ marginTop: 16 }}>
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
