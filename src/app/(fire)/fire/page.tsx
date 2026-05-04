'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  portfolioApi,
  portfolioStatsApi,
  savingsApi,
  dividendCalendarApi,
  exchangeRateApi,
} from '@/lib/fire/api';
import type { Portfolio, PortfolioStats, SavingsAccount, InterestRecord } from '@/lib/fire/api';
import { colors, Loader, StatCard, SimpleProgressBar } from '@/components/fire/ui';
import { useCurrency } from '@/components/fire/currency-context';
import { PassiveIncomeChart } from '@/components/fire/passive-income-chart';

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

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FireDashboard() {
  const { fmt } = useCurrency();

  // Raw data
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, PortfolioStats>>({});
  const [savings, setSavings] = useState<SavingsAccount[]>([]);
  const [interestByAccount, setInterestByAccount] = useState<Record<string, InterestRecord[]>>({});
  const [dividendMonths, setDividendMonths] = useState<DividendMonth[]>([]);
  const [toUsdRates, setToUsdRates] = useState<Record<string, number>>({ USD: 1 });

  // Loading flags
  const [portfoliosLoading, setPortfoliosLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [savingsLoading, setSavingsLoading] = useState(true);
  const [dividendsLoading, setDividendsLoading] = useState(true);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [interestLoading, setInterestLoading] = useState(false);

  // ── Fetch all data ────────────────────────────────────────────────────────────

  useEffect(() => {
    let alive = true;

    Promise.all([
      portfolioApi.list(),
      savingsApi.list(),
      dividendCalendarApi.get(CURRENT_YEAR),
    ]).then(([portRes, savRes, divRes]) => {
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

      if (savList.length > 0) {
        setInterestLoading(true);
        Promise.all(savList.map((a: SavingsAccount) => savingsApi.listInterest(a.id))).then(results => {
          if (!alive) return;
          const map: Record<string, InterestRecord[]> = {};
          results.forEach((res, i) => {
            if (res.success && res.data) map[savList[i].id] = res.data.records;
          });
          setInterestByAccount(map);
          setInterestLoading(false);
        }).catch(() => { if (alive) setInterestLoading(false); });
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
  const avgPassivePerMonth = CURRENT_MONTH > 0 ? ytdPassiveIncome / CURRENT_MONTH : 0;
  const fireProgress = Math.min((avgPassivePerMonth / FIRE_TARGET_MONTHLY) * 100, 100);

  // Interest by month (all accounts, converted to USD)
  const interestByMonth = useMemo(() => {
    const map: Record<number, number> = {};
    for (const acct of savings) {
      const records = interestByAccount[acct.id] ?? [];
      for (const r of records) {
        const m = new Date(r.credited_at).getMonth() + 1;
        const usd = toUsdAmount(r.amount, acct.currency);
        map[m] = (map[m] ?? 0) + usd;
      }
    }
    return map;
  }, [savings, interestByAccount, toUsdAmount]);

  // Dividends by month from calendar
  const dividendsByMonth = useMemo(() => {
    const map: Record<number, number> = {};
    for (const m of dividendMonths) map[m.month + 1] = m.total; // API is 0-indexed, chart expects 1-12
    return map;
  }, [dividendMonths]);

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
  const chartReady = assetsReady && !dividendsLoading && !interestLoading;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Dashboard</h1>
      </div>
      {/* Sections added in subsequent tasks */}
      <div style={{ color: colors.muted, fontSize: 13 }}>Data layer ready. UI sections coming next.</div>
    </div>
  );
}
