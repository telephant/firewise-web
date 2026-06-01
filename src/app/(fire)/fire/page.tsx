'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  portfolioApi,
  portfolioStatsApi,
  savingsApi,
  dividendCalendarApi,
  exchangeRateApi,
  snapshotsApi,
  nextDividendApi,
} from '@/lib/fire/api';
import type { Portfolio, PortfolioStats, SavingsAccount, InterestTrendMonth, MonthlySnapshot, NextDividend } from '@/lib/fire/api';
import { colors, Loader, StatCard, SimpleProgressBar } from '@/components/fire/ui';
import { useCurrency } from '@/components/fire/currency-context';
import { PassiveIncomeChart } from '@/components/fire/passive-income-chart';
import { PrivacyNumber } from '@/components/fire/privacy-number';
import { usePrivacy } from '@/components/fire/privacy-context';

const FIRE_TARGET_MONTHLY = 2000; // USD
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1; // 1-12

// ── Types ─────────────────────────────────────────────────────────────────────

interface DividendMonth { month: number; name: string; total: number; }

// ── SVG Donut helpers ─────────────────────────────────────────────────────────

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

interface DonutSlice { name: string; value: number; color: string; }

function DonutChart({ slices, centerLabel }: { slices: DonutSlice[]; centerLabel: string }) {
  const cx = 100, cy = 100, R = 80, r = 54;
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return null;

  const paths: React.ReactNode[] = [];

  if (slices.length === 1) {
    const sl = slices[0];
    const gapDeg = 1;
    const halfAngle = 180 - gapDeg / 2;
    const o1s = polarToXY(cx, cy, R, -halfAngle), o1e = polarToXY(cx, cy, R, halfAngle);
    const i1s = polarToXY(cx, cy, r, halfAngle), i1e = polarToXY(cx, cy, r, -halfAngle);
    const o2s = polarToXY(cx, cy, R, halfAngle + gapDeg), o2e = polarToXY(cx, cy, R, 360 - gapDeg / 2);
    const i2s = polarToXY(cx, cy, r, 360 - gapDeg / 2), i2e = polarToXY(cx, cy, r, halfAngle + gapDeg);
    paths.push(
      <path key="h1" fill={sl.color} d={`M ${o1s.x} ${o1s.y} A ${R} ${R} 0 1 1 ${o1e.x} ${o1e.y} L ${i1s.x} ${i1s.y} A ${r} ${r} 0 1 0 ${i1e.x} ${i1e.y} Z`} />,
      <path key="h2" fill={sl.color} d={`M ${o2s.x} ${o2s.y} A ${R} ${R} 0 0 1 ${o2e.x} ${o2e.y} L ${i2s.x} ${i2s.y} A ${r} ${r} 0 0 0 ${i2e.x} ${i2e.y} Z`} />,
    );
  } else {
    let startAngle = 0;
    slices.forEach((sl, i) => {
      const sweep = (sl.value / total) * 360;
      const endAngle = startAngle + sweep;
      const os = polarToXY(cx, cy, R, startAngle), oe = polarToXY(cx, cy, R, endAngle);
      const ie = polarToXY(cx, cy, r, endAngle), is_ = polarToXY(cx, cy, r, startAngle);
      const large = sweep > 180 ? 1 : 0;
      paths.push(
        <path key={i} fill={sl.color} opacity={0.9}
          d={`M ${os.x} ${os.y} A ${R} ${R} 0 ${large} 1 ${oe.x} ${oe.y} L ${ie.x} ${ie.y} A ${r} ${r} 0 ${large} 0 ${is_.x} ${is_.y} Z`}
        />
      );
      startAngle = endAngle;
    });
  }

  return (
    <svg viewBox="0 0 200 200" width={200} height={200} style={{ flexShrink: 0 }}>
      {paths}
      <text x={cx} y={cy - 6} textAnchor="middle" fill={colors.muted} fontSize={10} fontWeight={500}>Total</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill={colors.text} fontSize={13} fontWeight={700}>{centerLabel}</text>
    </svg>
  );
}

// ── MoM trend helper ──────────────────────────────────────────────────────────

function formatMoMTrend(
  delta: number | null,
  fmt: (v: number) => string,
): { value: string; direction: 'up' | 'down' | 'neutral' } | undefined {
  if (delta === null) return undefined;
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral';
  return {
    value: `${delta > 0 ? '+' : ''}${fmt(Math.abs(delta))} vs last mo`,
    direction,
  };
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FireDashboard() {
  const { fmt } = useCurrency();
  const { privacyMode } = usePrivacy();
  const router = useRouter();

  // Raw data
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, PortfolioStats>>({});
  const [savings, setSavings] = useState<SavingsAccount[]>([]);
  const [interestTrendMonths, setInterestTrendMonths] = useState<InterestTrendMonth[]>([]);
  const [dividendMonths, setDividendMonths] = useState<DividendMonth[]>([]);
  const [toUsdRates, setToUsdRates] = useState<Record<string, number>>({ USD: 1 });
  const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>([]);
  const [nextDividend, setNextDividend] = useState<NextDividend | null>(null);
  const [nextDividendLoading, setNextDividendLoading] = useState(true);

  // Loading flags
  const [portfoliosLoading, setPortfoliosLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [savingsLoading, setSavingsLoading] = useState(true);
  const [dividendsLoading, setDividendsLoading] = useState(true);
  const [ratesLoading, setRatesLoading] = useState(false);

  // ── Fetch all data ────────────────────────────────────────────────────────────

  useEffect(() => {
    let alive = true;

    Promise.all([
      portfolioApi.list(),
      savingsApi.list(),
      dividendCalendarApi.get(CURRENT_YEAR),
      snapshotsApi.list(2),
      savingsApi.interestTrend(CURRENT_YEAR),
    ]).then(([portRes, savRes, divRes, snapRes, trendRes]) => {
      if (!alive) return;

      const portList = (portRes.success && portRes.data) ? portRes.data : [];
      setPortfolios(portList);
      setPortfoliosLoading(false);

      const savList = (savRes.success && savRes.data) ? savRes.data : [];
      setSavings(savList);
      setSavingsLoading(false);

      if (divRes.success && divRes.data) {
        setDividendMonths(divRes.data.months);
      }
      setDividendsLoading(false);

      if (snapRes.success && snapRes.data) {
        setSnapshots(snapRes.data.snapshots);
      }

      if (trendRes.success && trendRes.data) {
        setInterestTrendMonths(trendRes.data.months);
      }

      if (portList.length > 0) {
        Promise.all(portList.map((p: Portfolio) => portfolioStatsApi.getStats(p.id))).then(results => {
          if (!alive) return;
          const map: Record<string, PortfolioStats> = {};
          results.forEach((res, i) => {
            if (res.success && res.data) map[portList[i].id] = res.data;
          });
          setStatsMap(map);
          setStatsLoading(false);
        }).catch(() => { if (alive) setStatsLoading(false); });
      } else {
        setStatsLoading(false);
      }

      const ccys = [...new Set(savList.map((a: SavingsAccount) => a.currency))].filter((c: string) => c !== 'USD');
      if (ccys.length > 0) {
        setRatesLoading(true);
        exchangeRateApi.get('USD', ccys).then(res => {
          if (!alive) return;
          if (res.success && res.data) {
            const toUsd: Record<string, number> = { USD: 1 };
            for (const [ccy, rate] of Object.entries(res.data.rates as Record<string, number>)) {
              toUsd[ccy] = rate > 0 ? 1 / rate : 1;
            }
            setToUsdRates(toUsd);
          }
          setRatesLoading(false);
        }).catch(() => { if (alive) setRatesLoading(false); });
      }

    }).catch(() => {
      if (!alive) return;
      setPortfoliosLoading(false);
      setSavingsLoading(false);
      setDividendsLoading(false);
      setStatsLoading(false);
    });

    return () => { alive = false; };
  }, []);

  // ── Next dividend: lazy, non-blocking ────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    nextDividendApi.get().then(res => {
      if (!alive) return;
      if (res.success) setNextDividend(res.data ?? null);
      setNextDividendLoading(false);
    }).catch(() => { if (alive) setNextDividendLoading(false); });
    return () => { alive = false; };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const toUsdAmount = useCallback(
    (amount: number, currency: string) => amount * (toUsdRates[currency] ?? 1),
    [toUsdRates],
  );

  // ── Derived calculations ──────────────────────────────────────────────────────

  const totalPortfolioValue = useMemo(() =>
    Object.values(statsMap).reduce((s, st) => s + st.total_value, 0),
    [statsMap]);

  const totalPortfolioCost = useMemo(() =>
    Object.values(statsMap).reduce((s, st) => s + st.total_cost, 0),
    [statsMap]);

  const totalUnrealizedPl = useMemo(() =>
    Object.values(statsMap).reduce((s, st) => s + st.unrealized_pl, 0),
    [statsMap]);

  const totalDividendYtd = useMemo(() =>
    Object.values(statsMap).reduce((s, st) => s + st.dividend_ytd, 0),
    [statsMap]);

  const totalSavingsUsd = useMemo(() =>
    savings.reduce((s, a) => s + toUsdAmount(a.balance, a.currency), 0),
    [savings, toUsdAmount]);

  const totalInterestYtdUsd = useMemo(() =>
    savings.reduce((s, a) => s + toUsdAmount(a.total_interest_ytd, a.currency), 0),
    [savings, toUsdAmount]);

  const totalAssetsUsd = totalPortfolioValue + totalSavingsUsd;

  const roi = totalPortfolioCost > 0
    ? ((totalPortfolioValue - totalPortfolioCost) / totalPortfolioCost) * 100
    : 0;

  const ytdPassiveIncome = totalDividendYtd + totalInterestYtdUsd;
  // Divide by completed months (CURRENT_MONTH - 1), not the current month which has no data yet
  const completedMonths = CURRENT_MONTH > 1 ? CURRENT_MONTH - 1 : 1;

  // Interest by month (merged historical + forecast from backend)
  const interestByMonth = useMemo(() => {
    const map: Record<number, number> = {};
    interestTrendMonths.forEach(m => { if (m.amount > 0) map[m.month] = m.amount; });
    return map;
  }, [interestTrendMonths]);

  // Dividends by month from calendar
  const dividendsByMonth = useMemo(() => {
    const map: Record<number, number> = {};
    for (const m of dividendMonths) map[m.month + 1] = m.total; // API is 0-indexed, chart expects 1-12
    return map;
  }, [dividendMonths]);

  // Full-year projections: actual months + forecast remaining months
  const projectedDividends = useMemo(() =>
    Object.values(dividendsByMonth).reduce((s, v) => s + v, 0),
    [dividendsByMonth]);

  const projectedInterest = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => interestByMonth[i + 1] ?? 0).reduce((s, v) => s + v, 0),
    [interestByMonth]);

  const projectedTotal = projectedDividends + projectedInterest;

  // Avg passive/month: use full-year projection ÷ 12 for consistency with projected total
  // Falls back to YTD ÷ completed months until projection data is ready
  const avgPassivePerMonth = projectedTotal > 0 ? projectedTotal / 12 : ytdPassiveIncome / completedMonths;
  const fireProgressBar = Math.min((avgPassivePerMonth / FIRE_TARGET_MONTHLY) * 100, 100);
  const fireProgressLabel = (avgPassivePerMonth / FIRE_TARGET_MONTHLY) * 100;

  // Donut slices
  const donutSlices = useMemo(() => {
    const slices: DonutSlice[] = [];
    if (totalPortfolioValue > 0) slices.push({ name: 'Investments', value: totalPortfolioValue, color: colors.accent });
    if (totalSavingsUsd > 0) slices.push({ name: 'Savings', value: totalSavingsUsd, color: colors.cyan });
    return slices;
  }, [totalPortfolioValue, totalSavingsUsd]);

  // Next payout (earliest savings account)
  const nextPayout = useMemo(() => {
    if (savings.length === 0) return null;
    const sorted = [...savings].sort((a, b) => a.next_payout_date.localeCompare(b.next_payout_date));
    const acct = sorted[0];
    return {
      date: acct.next_payout_date,
      amountUsd: toUsdAmount(acct.next_payout_amount, acct.currency),
      name: acct.name,
    };
  }, [savings, toUsdAmount]);

  // ── Loading state flags ───────────────────────────────────────────────────────

  const statsReady = !statsLoading && portfolios.every(p => statsMap[p.id]);
  const savingsReady = !savingsLoading && !ratesLoading;
  const assetsReady = statsReady && savingsReady;
  const chartReady = assetsReady && !dividendsLoading;

  // ── MoM derived values ────────────────────────────────────────────────────────
  // Use already-loaded monthly data to compare current month vs last month

  const PREV_MONTH = CURRENT_MONTH === 1 ? 12 : CURRENT_MONTH - 1;

  // Passive income MoM: current month vs last month (from calendar + interest trend)
  const currentMonthPassive = (dividendsByMonth[CURRENT_MONTH] ?? 0) + (interestByMonth[CURRENT_MONTH] ?? 0);
  const prevMonthPassive = (dividendsByMonth[PREV_MONTH] ?? 0) + (interestByMonth[PREV_MONTH] ?? 0);
  const passiveIncomeMoM = chartReady && prevMonthPassive > 0
    ? currentMonthPassive - prevMonthPassive
    : null;

  // Avg passive MoM: use snapshot if available
  // snapshots are ordered newest-first; [0]=most recent, [1]=previous month
  const lastMonthSnap = snapshots[1] ?? null;
  const avgPassiveMoM = assetsReady && lastMonthSnap
    ? avgPassivePerMonth - lastMonthSnap.avg_passive_income_12m
    : null;

  // Total assets MoM: use portfolio_snapshots mom_gain (populated by task:monthly)
  // monthly_financial_snapshots is not written by any task so lastMonthSnap.total_assets is unreliable
  const totalMomGain = Object.values(statsMap).some(st => st.mom_gain !== null)
    ? Object.values(statsMap).reduce((s, st) => s + (st.mom_gain ?? 0), 0)
    : null;

  const totalAssetsMoM = totalMomGain;

  const totalUnrealizedPlMoM = Object.values(statsMap).some(st => st.mom_unrealized_pl !== null)
    ? Object.values(statsMap).reduce((s, st) => s + (st.mom_unrealized_pl ?? 0), 0)
    : null;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24, backgroundColor: colors.bg, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

      {/* ── Section 1: Stat Cards ── */}
      <div style={{ marginBottom: 16 }}>
        {/* Primary card — Total Assets */}
        <div style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: '16px 24px',
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ color: colors.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total Assets</p>
            {assetsReady ? (
              <p style={{ color: colors.text, fontSize: 32, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                <PrivacyNumber value={fmt(totalAssetsUsd)} />
              </p>
            ) : (
              <div style={{ paddingTop: 4 }}><Loader size="md" variant="dots" /></div>
            )}
            {assetsReady && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                <p style={{ color: roi >= 0 ? colors.positive : colors.negative, fontSize: 13, margin: 0, fontWeight: 500 }}>
                  ROI {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
                </p>
                {totalAssetsMoM !== null && !privacyMode && (
                  <p style={{ color: totalAssetsMoM >= 0 ? colors.positive : colors.negative, fontSize: 12, margin: 0, fontWeight: 500 }}>
                    {totalAssetsMoM >= 0 ? '↑' : '↓'} {totalAssetsMoM >= 0 ? '+' : ''}{fmt(Math.abs(totalAssetsMoM))} vs last mo
                  </p>
                )}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right', display: 'flex', gap: 24 }}>
            <div>
              <p style={{ color: colors.muted, fontSize: 11, fontWeight: 500, margin: '0 0 2px' }}>Investments</p>
              <p style={{ color: colors.accent, fontSize: 16, fontWeight: 600, margin: 0 }}>
                {statsReady ? <PrivacyNumber value={fmt(totalPortfolioValue)} /> : '—'}
              </p>
            </div>
            <div>
              <p style={{ color: colors.muted, fontSize: 11, fontWeight: 500, margin: '0 0 2px' }}>Savings</p>
              <p style={{ color: colors.cyan, fontSize: 16, fontWeight: 600, margin: 0 }}>
                {savingsReady ? <PrivacyNumber value={fmt(totalSavingsUsd)} /> : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Secondary cards row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <StatCard
            label="Unrealized P&L"
            value={statsReady ? <PrivacyNumber value={fmt(totalUnrealizedPl)} /> : '—'}
            valueColor={statsReady ? (totalUnrealizedPl >= 0 ? 'positive' : 'negative') : 'default'}
            trend={statsReady && !privacyMode ? formatMoMTrend(totalUnrealizedPlMoM, fmt) : undefined}
            isLoading={!statsReady}
          />
          <StatCard
            label="YTD Passive Income"
            value={assetsReady ? <PrivacyNumber value={fmt(ytdPassiveIncome)} /> : '—'}
            valueColor="positive"
            trend={chartReady && !privacyMode ? formatMoMTrend(passiveIncomeMoM, fmt) : undefined}
            isLoading={!assetsReady}
          />
          <StatCard
            label="Avg / Month"
            value={assetsReady ? <PrivacyNumber value={fmt(avgPassivePerMonth)} /> : '—'}
            valueColor="positive"
            trend={assetsReady && !privacyMode ? formatMoMTrend(avgPassiveMoM, fmt) : undefined}
            isLoading={!assetsReady}
          />
          {/* FIRE Progress card */}
          <div style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            padding: '12px',
            textAlign: 'center',
          }}>
            <p style={{ color: colors.muted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>FIRE Progress</p>
            {assetsReady ? (
              <>
                <p style={{
                  fontSize: 20, fontWeight: 700, margin: '0 0 8px',
                  color: fireProgressLabel >= 100 ? colors.positive : fireProgressLabel >= 50 ? colors.info : colors.muted,
                }}>
                  {fireProgressLabel.toFixed(1)}%
                </p>
                <SimpleProgressBar
                  value={fireProgressBar}
                  size="sm"
                  color={fireProgressLabel >= 100 ? colors.positive : fireProgressLabel >= 50 ? colors.info : colors.muted}
                />
                <p style={{ color: colors.muted, fontSize: 10, marginTop: 6 }}>
                  <PrivacyNumber value={fmt(avgPassivePerMonth)} /> / {fmt(FIRE_TARGET_MONTHLY)} target
                </p>
              </>
            ) : (
              <div style={{ paddingTop: 4 }}><Loader size="sm" variant="dots" /></div>
            )}
          </div>
        </div>
      </div>

      {/* ── Two-column section: stretches to fill remaining height ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '45fr 55fr', gap: 16, flex: 1, minHeight: 0 }}>

        {/* Left column: Asset Distribution */}
        <div style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, flexShrink: 0 }}>Asset Distribution</p>

          {/* Donut */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 16, flexShrink: 0 }}>
            {assetsReady ? (
              <>
                <DonutChart slices={donutSlices} centerLabel={privacyMode ? '••••' : fmt(totalAssetsUsd)} />
                <div style={{ display: 'flex', gap: 16 }}>
                  {donutSlices.map(sl => (
                    <div key={sl.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: sl.color }} />
                      <span style={{ color: colors.muted, fontSize: 11 }}>{sl.name}</span>
                      <span style={{ color: colors.text, fontSize: 11, fontWeight: 600 }}>
                        {totalAssetsUsd > 0 ? ((sl.value / totalAssetsUsd) * 100).toFixed(1) : '0'}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader size="md" variant="bar" />
              </div>
            )}
          </div>

          {/* Detail list */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <p style={{ color: colors.muted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Investments</p>
            {portfoliosLoading ? (
              <Loader size="sm" variant="dots" />
            ) : portfolios.length === 0 ? (
              <p style={{ color: colors.muted, fontSize: 12 }}>No portfolios yet.</p>
            ) : (
              portfolios.map((p) => {
                const stats = statsMap[p.id];
                const value = stats?.total_value ?? 0;
                const pct = totalAssetsUsd > 0 ? (value / totalAssetsUsd) * 100 : 0;
                const plPct = stats && stats.total_cost > 0 ? (stats.unrealized_pl / stats.total_cost) * 100 : null;
                return (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/fire/portfolios/${p.id}`)}
                    style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${colors.border}`, cursor: 'pointer', gap: 8 }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: colors.accent, flexShrink: 0, opacity: 0.8 }} />
                    <span style={{ flex: 1, color: colors.text, fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                    <span style={{ color: colors.muted, fontSize: 12 }}>{pct.toFixed(1)}%</span>
                    <span style={{ color: colors.text, fontSize: 13, fontWeight: 600, minWidth: 90, textAlign: 'right' }}>
                      {statsLoading ? '—' : <PrivacyNumber value={fmt(value)} />}
                    </span>
                    {plPct !== null && (
                      <span style={{ color: plPct >= 0 ? colors.positive : colors.negative, fontSize: 11, minWidth: 55, textAlign: 'right' }}>
                        {plPct >= 0 ? '+' : ''}{plPct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                );
              })
            )}

            <p style={{ color: colors.muted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '12px 0 6px' }}>Savings</p>
            {!savingsReady ? (
              <Loader size="sm" variant="dots" />
            ) : savings.length === 0 ? (
              <p style={{ color: colors.muted, fontSize: 12 }}>No savings accounts yet.</p>
            ) : (
              savings.map(a => {
                const balUsd = toUsdAmount(a.balance, a.currency);
                const pct = totalAssetsUsd > 0 ? (balUsd / totalAssetsUsd) * 100 : 0;
                return (
                  <div
                    key={a.id}
                    onClick={() => router.push('/fire/savings')}
                    style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${colors.border}`, cursor: 'pointer', gap: 8 }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: colors.cyan, flexShrink: 0, opacity: 0.8 }} />
                    <span style={{ flex: 1, color: colors.text, fontSize: 13, fontWeight: 500 }}>{a.name}</span>
                    <span style={{ color: colors.muted, fontSize: 12 }}>{pct.toFixed(1)}%</span>
                    <span style={{ color: colors.info, fontSize: 12 }}>{(a.interest_rate * 100).toFixed(2)}%</span>
                    <span style={{ color: colors.muted, fontSize: 10, backgroundColor: colors.surfaceLight, padding: '1px 6px', borderRadius: 4 }}>{a.currency}</span>
                    <span style={{ color: colors.text, fontSize: 13, fontWeight: 600, minWidth: 90, textAlign: 'right' }}>
                      {savingsReady ? <PrivacyNumber value={fmt(balUsd)} /> : '—'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Passive Income (scrollable internally) */}
        <div style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflowY: 'auto',
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, flexShrink: 0 }}>Passive Income</p>

          {/* Top stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
            {[
              { label: 'YTD Dividends', value: assetsReady ? fmt(totalDividendYtd) : null, color: colors.accent, sub: null, net: true },
              { label: 'YTD Interest', value: assetsReady ? fmt(totalInterestYtdUsd) : null, color: colors.cyan, sub: null, net: false },
              { label: 'YTD Total', value: assetsReady ? fmt(ytdPassiveIncome) : null, color: colors.positive, sub: null, net: true },
              {
                label: 'Next Interest',
                value: savingsReady ? (nextPayout ? fmt(nextPayout.amountUsd) : '—') : null,
                sub: savingsReady && nextPayout ? nextPayout.date : null,
                color: colors.cyan,
                net: false,
              },
            ].map(({ label, value, color, sub, net }) => (
              <div key={label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <p style={{ color: colors.muted, fontSize: 11, fontWeight: 500, margin: 0 }}>{label}</p>
                  {net && <span style={{ color: colors.muted, fontSize: 9, padding: '1px 4px', borderRadius: 3, backgroundColor: `rgba(255,255,255,0.06)`, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', border: `1px solid rgba(255,255,255,0.08)` }}>net</span>}
                </div>
                {value === null ? (
                  <Loader size="sm" variant="dots" />
                ) : (
                  <>
                    <p style={{ color, fontSize: 16, fontWeight: 700, margin: 0 }}>
                      <PrivacyNumber value={value} />
                    </p>
                    {sub && <p style={{ color: colors.muted, fontSize: 11, margin: '2px 0 0' }}>{sub}</p>}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Full-year projection row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
            {[
              { label: `${CURRENT_YEAR} Dividends`, value: chartReady ? fmt(projectedDividends) : null, color: colors.accent, net: true },
              { label: `${CURRENT_YEAR} Interest`, value: chartReady ? fmt(projectedInterest) : null, color: colors.cyan, net: false },
              { label: `${CURRENT_YEAR} Total`, value: chartReady ? fmt(projectedTotal) : null, color: colors.positive, net: true },
              { label: 'Remaining', value: chartReady ? fmt(projectedTotal - ytdPassiveIncome) : null, color: colors.warning, net: true },
            ].map(({ label, value, color, net }) => (
              <div key={label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <p style={{ color: colors.muted, fontSize: 11, fontWeight: 500, margin: 0 }}>{label}</p>
                  {net && <span style={{ color: colors.muted, fontSize: 9, padding: '1px 4px', borderRadius: 3, backgroundColor: `rgba(255,255,255,0.06)`, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', border: `1px solid rgba(255,255,255,0.08)` }}>net</span>}
                </div>
                {value === null ? (
                  <Loader size="sm" variant="dots" />
                ) : (
                  <p style={{ color, fontSize: 16, fontWeight: 700, margin: 0 }}>
                    <PrivacyNumber value={value} />
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Next Dividend — lazy loaded independently */}
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
            <p style={{ color: colors.muted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Next Dividend</p>
            {nextDividendLoading ? (
              <Loader size="sm" variant="dots" />
            ) : nextDividend ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div>
                  <p style={{ color: colors.accent, fontSize: 20, fontWeight: 700, margin: 0 }}><PrivacyNumber value={fmt(nextDividend.amount_usd)} /></p>
                  <p style={{ color: colors.muted, fontSize: 11, margin: '2px 0 0' }}>{nextDividend.date}</p>
                </div>
                <div>
                  <p style={{ color: colors.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{nextDividend.ticker}</p>
                  <p style={{ color: colors.muted, fontSize: 11, margin: '2px 0 0' }}>{nextDividend.portfolio_name}</p>
                </div>
                {nextDividend.is_forecasted && (
                  <span style={{ fontSize: 10, color: colors.muted, backgroundColor: colors.surfaceLight, padding: '2px 6px', borderRadius: 4 }}>est.</span>
                )}
              </div>
            ) : (
              <p style={{ color: colors.muted, fontSize: 12 }}>No upcoming dividends found.</p>
            )}
          </div>

          {/* Area chart */}
          <div style={{ marginBottom: 16, flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 10, alignItems: 'center' }}>
              <p style={{ color: colors.text, fontSize: 13, fontWeight: 600, margin: 0 }}>Monthly Trend</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: colors.muted }}>
                  <span style={{ width: 10, height: 2, backgroundColor: colors.accent, display: 'inline-block', borderRadius: 1 }} />
                  Dividends
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: colors.muted }}>
                  <span style={{ width: 10, height: 2, backgroundColor: colors.cyan, display: 'inline-block', borderRadius: 1 }} />
                  Interest
                </span>
              </div>
            </div>
            {chartReady ? (
              <PassiveIncomeChart
                dividendsByMonth={dividendsByMonth}
                interestByMonth={interestByMonth}
                fmt={fmt}
                forecastFromMonth={CURRENT_MONTH + 1}
              />
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader size="md" variant="bar" />
              </div>
            )}
          </div>

          {/* Monthly summary table */}
          <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
            <p style={{ color: colors.text, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Monthly Breakdown</p>
            {chartReady ? (() => {
              const MONTH_NAMES_FULL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const rows = Array.from({ length: 12 }, (_, i) => {
                const m = i + 1;
                const div = dividendsByMonth[m] ?? 0;
                const int_ = interestByMonth[m] ?? 0;
                return { month: m, div, int: int_, total: div + int_ };
              })
                .filter(r => r.total > 0)
                .sort((a, b) => b.month - a.month);

              if (rows.length === 0) {
                return <p style={{ color: colors.muted, fontSize: 13, textAlign: 'center', padding: '12px 0' }}>No passive income recorded yet this year.</p>;
              }

              return (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Month', 'Dividends', 'Interest', 'Total'].map((h, i) => (
                        <th key={h} style={{
                          textAlign: i === 0 ? 'left' : 'right',
                          color: colors.muted, fontWeight: 500, fontSize: 11,
                          padding: '4px 8px', borderBottom: `1px solid ${colors.border}`,
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.month} style={{
                        backgroundColor: r.month === CURRENT_MONTH ? `${colors.accent}10` : 'transparent',
                      }}>
                        <td style={{ padding: '7px 8px', color: r.month === CURRENT_MONTH ? colors.text : colors.muted, fontWeight: r.month === CURRENT_MONTH ? 600 : 400 }}>
                          {MONTH_NAMES_FULL[r.month - 1]} {CURRENT_YEAR}
                          {r.month === CURRENT_MONTH && <span style={{ color: colors.accent, fontSize: 10, marginLeft: 6, fontWeight: 600 }}>NOW</span>}
                        </td>
                        <td style={{ padding: '7px 8px', color: colors.accent, textAlign: 'right' }}>{r.div > 0 ? <PrivacyNumber value={fmt(r.div)} /> : '—'}</td>
                        <td style={{ padding: '7px 8px', color: colors.cyan, textAlign: 'right' }}>{r.int > 0 ? <PrivacyNumber value={fmt(r.int)} /> : '—'}</td>
                        <td style={{ padding: '7px 8px', color: colors.positive, fontWeight: 600, textAlign: 'right' }}><PrivacyNumber value={fmt(r.total)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })() : (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}><Loader size="sm" variant="dots" /></div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
