# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the Fire dashboard into a comprehensive personal wealth page with asset distribution charts, passive income area chart, FIRE progress tracking, and full multi-currency support.

**Architecture:** Two files only — `src/app/(fire)/fire/page.tsx` (full rewrite, orchestrates all data fetching and layout) and `src/components/fire/passive-income-chart.tsx` (new Recharts AreaChart component). All amounts displayed in user-selected currency via `useCurrency()`; savings balances/interest are converted USD-first via `exchangeRateApi`.

**Tech Stack:** Next.js App Router, Recharts (already installed — used in existing chart components), Fire UI design system (`@/components/fire/ui`), `useCurrency` hook from `@/components/fire/currency-context`.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/(fire)/fire/page.tsx` | Full rewrite | Data fetching, layout, stat cards, donut chart, asset list, passive income section |
| `src/components/fire/passive-income-chart.tsx` | Create | Recharts stacked AreaChart for 12-month passive income trend |

---

## Context for Implementers

### Design System Rules
- **NEVER** use shadcn `@/components/ui` — only `@/components/fire/ui`
- Import pattern: `import { colors, StatCard, Loader, SimpleProgressBar, Card } from '@/components/fire/ui'`
- Colors: `colors.bg` (#0A0A0B), `colors.surface` (#141415), `colors.surfaceLight` (#1C1C1E), `colors.text` (#EDEDEF), `colors.muted` (#7C7C82), `colors.border` (rgba(255,255,255,0.08)), `colors.accent` (#5E6AD2), `colors.positive` (#4ADE80), `colors.negative` (#F87171), `colors.cyan` (#67E8F9), `colors.info` (#60A5FA)

### Currency Conversion Rule
```ts
// Savings amounts (raw currency) → USD → display currency
// Step 1: fetch rates after savings load
const ccys = [...new Set(savings.map(a => a.currency))].filter(c => c !== 'USD');
const ratesRes = await exchangeRateApi.get('USD', ccys);
// ratesRes.data.rates[CCY] = how many CCY per 1 USD
// toUsd[CCY] = 1 / rates[CCY]  (= how many USD per 1 CCY)
const toUsd: Record<string, number> = { USD: 1 };
for (const [ccy, rate] of Object.entries(ratesRes.data.rates)) {
  toUsd[ccy] = rate > 0 ? 1 / rate : 1;
}

// Step 2: convert to USD, then use fmt() which converts USD → display currency
const balanceUsd = savings.balance * (toUsd[savings.currency] ?? 1);
fmt(balanceUsd); // formats in user's display currency
```

Portfolio stats (`total_value`, `unrealized_pl`, `dividend_ytd`, `total_cost`) are already in USD — pass directly to `fmt()`.

### API Types (already in `@/lib/fire/api`)
```ts
// Portfolio
interface Portfolio { id: string; name: string; }
interface PortfolioStats {
  total_value: number; total_cost: number; unrealized_pl: number;
  realized_pl: number; dividend_ytd: number; dividend_mtd: number;
}

// Savings
interface SavingsAccount {
  id: string; name: string; bank: string | null; currency: string;
  balance: number; interest_rate: number;
  compound_frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  total_interest_ytd: number; total_interest_all: number;
  next_payout_date: string; next_payout_amount: number;
}
interface InterestRecord { id: string; account_id: string; amount: number; credited_at: string; }

// Dividend Calendar
// dividendCalendarApi.get(year) returns:
// { months: Array<{ month: number; name: string; total: number }>, annualTotal: number, currency: string }
```

### StatCard API
```tsx
<StatCard
  label="Total Assets"
  value="$1,234,567"
  valueColor="positive"        // 'default' | 'positive' | 'negative'
  trend={{ value: '+12.3%', direction: 'up' }}  // optional
  isLoading={false}            // shows dots loader when true
/>
```

### SimpleProgressBar API
```tsx
<SimpleProgressBar value={65} size="sm" color={colors.positive} />
// value: 0-100
```

---

## Task 1: PassiveIncomeChart Component

**Files:**
- Create: `src/components/fire/passive-income-chart.tsx`

This is a Recharts stacked AreaChart. Two areas stack on top of each other: Dividends (accent color) at the bottom, Interest (cyan) on top.

- [ ] **Step 1: Create the component file**

```tsx
'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { colors } from '@/components/fire/ui';

export interface PassiveIncomeChartProps {
  dividendsByMonth: Record<number, number>; // month 1-12 → USD amount
  interestByMonth: Record<number, number>;  // month 1-12 → USD amount
  fmt: (usdAmount: number) => string;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface ChartRow {
  month: string;
  dividends: number;
  interest: number;
  total: number;
}

function buildChartData(
  dividendsByMonth: Record<number, number>,
  interestByMonth: Record<number, number>,
): ChartRow[] {
  return MONTH_LABELS.map((label, i) => {
    const m = i + 1;
    const dividends = dividendsByMonth[m] ?? 0;
    const interest = interestByMonth[m] ?? 0;
    return { month: label, dividends, interest, total: dividends + interest };
  });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  fmt: (v: number) => string;
}

function CustomTooltip({ active, payload, label, fmt }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const dividends = payload.find(p => p.name === 'dividends')?.value ?? 0;
  const interest = payload.find(p => p.name === 'interest')?.value ?? 0;
  const total = dividends + interest;
  return (
    <div style={{
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    }}>
      <p style={{ color: colors.muted, marginBottom: 6, fontWeight: 600 }}>{label}</p>
      <p style={{ color: colors.accent }}>Dividends: {fmt(dividends)}</p>
      <p style={{ color: colors.cyan }}>Interest: {fmt(interest)}</p>
      <p style={{ color: colors.text, marginTop: 4, borderTop: `1px solid ${colors.border}`, paddingTop: 4 }}>
        Total: {fmt(total)}
      </p>
    </div>
  );
}

export function PassiveIncomeChart({ dividendsByMonth, interestByMonth, fmt }: PassiveIncomeChartProps) {
  const data = buildChartData(dividendsByMonth, interestByMonth);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradDividends" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors.accent} stopOpacity={0.3} />
            <stop offset="95%" stopColor={colors.accent} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradInterest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors.cyan} stopOpacity={0.3} />
            <stop offset="95%" stopColor={colors.cyan} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: colors.muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: colors.muted, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => fmt(v)}
          width={60}
        />
        <Tooltip content={<CustomTooltip fmt={fmt} />} />
        <Area
          type="monotone"
          dataKey="dividends"
          stackId="passive"
          stroke={colors.accent}
          strokeWidth={2}
          fill="url(#gradDividends)"
          dot={false}
          activeDot={{ r: 4, fill: colors.accent }}
        />
        <Area
          type="monotone"
          dataKey="interest"
          stackId="passive"
          stroke={colors.cyan}
          strokeWidth={2}
          fill="url(#gradInterest)"
          dot={false}
          activeDot={{ r: 4, fill: colors.cyan }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Verify the file exists**

```bash
ls src/components/fire/passive-income-chart.tsx
```
Expected: file listed.

- [ ] **Step 3: Commit**

```bash
git add src/components/fire/passive-income-chart.tsx
git commit -m "feat: add PassiveIncomeChart stacked area component"
```

---

## Task 2: Dashboard Data Fetching Layer

**Files:**
- Modify: `src/app/(fire)/fire/page.tsx` (full rewrite — replace everything)

This task sets up all state and data fetching. No UI yet — just the data layer. The page will render a loading skeleton for now.

- [ ] **Step 1: Write the new page with data fetching only**

```tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  portfolioApi,
  portfolioStatsApi,
  savingsApi,
  dividendCalendarApi,
  exchangeRateApi,
} from '@/lib/fire/api';
import type { Portfolio, PortfolioStats, SavingsAccount, InterestRecord } from '@/lib/fire/api';
import { colors, Loader } from '@/components/fire/ui';
import { useCurrency } from '@/components/fire/currency-context';

const FIRE_TARGET_MONTHLY = 2000; // USD
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1; // 1-12

// ── Types ─────────────────────────────────────────────────────────────────────

interface DividendMonth { month: number; name: string; total: number; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FireDashboard() {
  const router = useRouter();
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

  // ── Fetch all data ───────────────────────────────────────────────────────────

  useEffect(() => {
    // 1. Portfolios + savings + dividend calendar in parallel
    Promise.all([
      portfolioApi.list(),
      savingsApi.list(),
      dividendCalendarApi.get(CURRENT_YEAR),
    ]).then(([portRes, savRes, divRes]) => {
      // Portfolios
      const portList = (portRes.success && portRes.data) ? portRes.data : [];
      setPortfolios(portList);
      setPortfoliosLoading(false);

      // Savings
      const savList = (savRes.success && savRes.data) ? savRes.data : [];
      setSavings(savList);
      setSavingsLoading(false);

      // Dividend calendar
      if (divRes.success && divRes.data) {
        setDividendMonths(divRes.data.months);
      }
      setDividendsLoading(false);

      // 2. Portfolio stats (need IDs from portfolio list)
      if (portList.length > 0) {
        Promise.all(portList.map(p => portfolioStatsApi.getStats(p.id))).then(results => {
          const map: Record<string, PortfolioStats> = {};
          results.forEach((res, i) => {
            if (res.success && res.data) map[portList[i].id] = res.data;
          });
          setStatsMap(map);
          setStatsLoading(false);
        }).catch(() => setStatsLoading(false));
      } else {
        setStatsLoading(false);
      }

      // 3. Exchange rates (need currencies from savings list)
      const ccys = [...new Set(savList.map((a: SavingsAccount) => a.currency))].filter(c => c !== 'USD');
      if (ccys.length > 0) {
        setRatesLoading(true);
        exchangeRateApi.get('USD', ccys).then(res => {
          if (res.success && res.data) {
            const toUsd: Record<string, number> = { USD: 1 };
            for (const [ccy, rate] of Object.entries(res.data.rates as Record<string, number>)) {
              toUsd[ccy] = rate > 0 ? 1 / rate : 1;
            }
            setToUsdRates(toUsd);
          }
          setRatesLoading(false);
        });
      }

      // 4. Interest records for each savings account
      if (savList.length > 0) {
        setInterestLoading(true);
        Promise.all(savList.map((a: SavingsAccount) => savingsApi.listInterest(a.id))).then(results => {
          const map: Record<string, InterestRecord[]> = {};
          results.forEach((res, i) => {
            if (res.success && res.data) map[savList[i].id] = res.data.records;
          });
          setInterestByAccount(map);
          setInterestLoading(false);
        }).catch(() => setInterestLoading(false));
      }
    });
  }, []);

  // ── Derived calculations ──────────────────────────────────────────────────────

  const toUsdAmount = (amount: number, currency: string) =>
    amount * (toUsdRates[currency] ?? 1);

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
    [savings, toUsdRates]);

  const totalInterestYtdUsd = useMemo(() =>
    savings.reduce((s, a) => s + toUsdAmount(a.total_interest_ytd, a.currency), 0),
    [savings, toUsdRates]);

  const totalAssetsUsd = totalPortfolioValue + totalSavingsUsd;

  const roi = totalPortfolioCost > 0
    ? ((totalPortfolioValue - totalPortfolioCost) / totalPortfolioCost) * 100
    : 0;

  const ytdPassiveIncome = totalDividendYtd + totalInterestYtdUsd;
  const avgPassivePerMonth = CURRENT_MONTH > 0 ? ytdPassiveIncome / CURRENT_MONTH : 0;
  const fireProgress = Math.min((avgPassivePerMonth / FIRE_TARGET_MONTHLY) * 100, 100);

  // Interest by month (all accounts combined, in USD)
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
  }, [savings, interestByAccount, toUsdRates]);

  // Dividends by month from calendar
  const dividendsByMonth = useMemo(() => {
    const map: Record<number, number> = {};
    for (const m of dividendMonths) map[m.month] = m.total;
    return map;
  }, [dividendMonths]);

  // Donut slices
  const donutSlices = useMemo(() => {
    const slices = [];
    if (totalPortfolioValue > 0) slices.push({ name: 'Investments', value: totalPortfolioValue, color: colors.accent });
    if (totalSavingsUsd > 0) slices.push({ name: 'Savings', value: totalSavingsUsd, color: colors.cyan });
    return slices;
  }, [totalPortfolioValue, totalSavingsUsd]);

  // Next payout (earliest savings account payout)
  const nextPayout = useMemo(() => {
    if (savings.length === 0) return null;
    const sorted = [...savings].sort((a, b) => a.next_payout_date.localeCompare(b.next_payout_date));
    const acct = sorted[0];
    return { date: acct.next_payout_date, amountUsd: toUsdAmount(acct.next_payout_amount, acct.currency), name: acct.name };
  }, [savings, toUsdRates]);

  // Loading flags
  const statsReady = !statsLoading && portfolios.every(p => statsMap[p.id]);
  const savingsReady = !savingsLoading && !ratesLoading;
  const assetsReady = statsReady && savingsReady;
  const chartReady = assetsReady && !dividendsLoading && !interestLoading;

  return (
    <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Dashboard</h1>
      </div>
      {/* Sections will be added in subsequent tasks */}
      <div style={{ color: colors.muted, fontSize: 13 }}>Loading data layer... (UI coming next)</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page compiles**

```bash
cd /path/to/firewise-web && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors related to `fire/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/(fire)/fire/page.tsx
git commit -m "feat: dashboard data fetching layer"
```

---

## Task 3: Section 1 — Stat Cards

**Files:**
- Modify: `src/app/(fire)/fire/page.tsx`

Replace the placeholder `<div>Loading data layer...</div>` with the full Section 1 stat card layout. The primary card is large, the 4 secondary cards are in a row.

- [ ] **Step 1: Replace the return JSX with Section 1**

Replace everything inside the `return (...)` with:

```tsx
return (
  <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh' }}>
    {/* Header */}
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Dashboard</h1>
    </div>

    {/* ── Section 1: Stat Cards ── */}
    <div style={{ marginBottom: 28 }}>
      {/* Primary card — Total Assets */}
      <div style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ color: colors.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total Assets</p>
          {assetsReady ? (
            <p style={{ color: colors.text, fontSize: 32, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{fmt(totalAssetsUsd)}</p>
          ) : (
            <div style={{ paddingTop: 4 }}><Loader size="md" variant="dots" /></div>
          )}
          {assetsReady && (
            <p style={{ color: roi >= 0 ? colors.positive : colors.negative, fontSize: 13, margin: '4px 0 0', fontWeight: 500 }}>
              ROI {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
            </p>
          )}
        </div>
        <div style={{ textAlign: 'right', display: 'flex', gap: 24 }}>
          <div>
            <p style={{ color: colors.muted, fontSize: 11, fontWeight: 500, margin: '0 0 2px' }}>Investments</p>
            <p style={{ color: colors.accent, fontSize: 16, fontWeight: 600, margin: 0 }}>
              {statsReady ? fmt(totalPortfolioValue) : '—'}
            </p>
          </div>
          <div>
            <p style={{ color: colors.muted, fontSize: 11, fontWeight: 500, margin: '0 0 2px' }}>Savings</p>
            <p style={{ color: colors.cyan, fontSize: 16, fontWeight: 600, margin: 0 }}>
              {savingsReady ? fmt(totalSavingsUsd) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Secondary cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatCard
          label="Unrealized P&L"
          value={statsReady ? fmt(totalUnrealizedPl) : '—'}
          valueColor={statsReady ? (totalUnrealizedPl >= 0 ? 'positive' : 'negative') : 'default'}
          isLoading={!statsReady}
        />
        <StatCard
          label="YTD Passive Income"
          value={assetsReady ? fmt(ytdPassiveIncome) : '—'}
          valueColor="positive"
          isLoading={!assetsReady}
        />
        <StatCard
          label="Avg / Month"
          value={assetsReady ? fmt(avgPassivePerMonth) : '—'}
          valueColor="positive"
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
                color: fireProgress >= 100 ? colors.positive : fireProgress >= 50 ? colors.info : colors.muted,
              }}>
                {fireProgress.toFixed(1)}%
              </p>
              <SimpleProgressBar
                value={fireProgress}
                size="sm"
                color={fireProgress >= 100 ? colors.positive : fireProgress >= 50 ? colors.info : colors.muted}
              />
              <p style={{ color: colors.muted, fontSize: 10, marginTop: 6 }}>
                {fmt(avgPassivePerMonth)} / {fmt(FIRE_TARGET_MONTHLY)} target
              </p>
            </>
          ) : (
            <div style={{ paddingTop: 4 }}><Loader size="sm" variant="dots" /></div>
          )}
        </div>
      </div>
    </div>

    {/* Sections 2 & 3 coming in next tasks */}
  </div>
);
```

Also add `StatCard` and `SimpleProgressBar` to the import from `@/components/fire/ui`:
```tsx
import { colors, Loader, StatCard, SimpleProgressBar } from '@/components/fire/ui';
```

- [ ] **Step 2: Check it renders in browser**

Navigate to `http://localhost:3000/fire` and verify:
- Primary card shows "Total Assets" with large number (or dots loader while fetching)
- 4 secondary cards below: Unrealized P&L, YTD Passive Income, Avg/Month, FIRE Progress with progress bar

- [ ] **Step 3: Commit**

```bash
git add src/app/(fire)/fire/page.tsx
git commit -m "feat: dashboard stat cards section"
```

---

## Task 4: Section 2 — Asset Distribution (Donut + Detail List)

**Files:**
- Modify: `src/app/(fire)/fire/page.tsx`

Add the DonutChart SVG helper and the asset distribution section (two columns).

- [ ] **Step 1: Add DonutChart helper before the component**

Add this above the `export default function FireDashboard()` line:

```tsx
// ── SVG Donut Chart ───────────────────────────────────────────────────────────

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
```

- [ ] **Step 2: Replace the `{/* Sections 2 & 3 coming in next tasks */}` placeholder with Section 2**

```tsx
    {/* ── Section 2: Asset Distribution ── */}
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Asset Distribution</p>
      <div style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex',
        gap: 32,
        alignItems: 'flex-start',
      }}>
        {/* Left: Donut */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {assetsReady ? (
            <>
              <DonutChart slices={donutSlices} centerLabel={fmt(totalAssetsUsd)} />
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

        {/* Right: Detail list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Investments group */}
          <p style={{ color: colors.muted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Investments</p>
          {portfoliosLoading ? (
            <Loader size="sm" variant="dots" />
          ) : portfolios.length === 0 ? (
            <p style={{ color: colors.muted, fontSize: 12 }}>No portfolios yet.</p>
          ) : (
            portfolios.map((p, i) => {
              const stats = statsMap[p.id];
              const value = stats?.total_value ?? 0;
              const pct = totalAssetsUsd > 0 ? (value / totalAssetsUsd) * 100 : 0;
              const plPct = stats && stats.total_cost > 0 ? ((stats.unrealized_pl) / stats.total_cost) * 100 : null;
              return (
                <div
                  key={p.id}
                  onClick={() => router.push(`/fire/portfolios/${p.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '8px 0',
                    borderBottom: `1px solid ${colors.border}`, cursor: 'pointer',
                    gap: 8,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#5E6AD2', flexShrink: 0, opacity: 0.8 }} />
                  <span style={{ flex: 1, color: colors.text, fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                  <span style={{ color: colors.muted, fontSize: 12 }}>{pct.toFixed(1)}%</span>
                  <span style={{ color: colors.text, fontSize: 13, fontWeight: 600, minWidth: 90, textAlign: 'right' }}>
                    {statsLoading ? '—' : fmt(value)}
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

          {/* Savings group */}
          <p style={{ color: colors.muted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '16px 0 8px' }}>Savings</p>
          {savingsLoading ? (
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
                  style={{
                    display: 'flex', alignItems: 'center', padding: '8px 0',
                    borderBottom: `1px solid ${colors.border}`, cursor: 'pointer',
                    gap: 8,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: colors.cyan, flexShrink: 0, opacity: 0.8 }} />
                  <span style={{ flex: 1, color: colors.text, fontSize: 13, fontWeight: 500 }}>{a.name}</span>
                  <span style={{ color: colors.muted, fontSize: 12 }}>{pct.toFixed(1)}%</span>
                  <span style={{ color: colors.info, fontSize: 12 }}>{(a.interest_rate * 100).toFixed(2)}%</span>
                  <span style={{ color: colors.muted, fontSize: 10, backgroundColor: colors.surfaceLight, padding: '1px 6px', borderRadius: 4 }}>{a.currency}</span>
                  <span style={{ color: colors.text, fontSize: 13, fontWeight: 600, minWidth: 90, textAlign: 'right' }}>
                    {savingsReady ? fmt(balUsd) : '—'}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>

    {/* Section 3 coming next */}
```

- [ ] **Step 3: Check it renders in browser**

Navigate to `http://localhost:3000/fire`. Verify:
- Donut chart shows Investments (blue) vs Savings (cyan) slices
- Detail list shows portfolios and savings accounts with allocation %
- Clicking a portfolio row navigates to `/fire/portfolios/{id}`

- [ ] **Step 4: Commit**

```bash
git add src/app/(fire)/fire/page.tsx
git commit -m "feat: dashboard asset distribution section"
```

---

## Task 5: Section 3 — Passive Income

**Files:**
- Modify: `src/app/(fire)/fire/page.tsx`

Add the full passive income section: top stats row, area chart, forecast row, and monthly table.

- [ ] **Step 1: Add PassiveIncomeChart import at top of file**

```tsx
import { PassiveIncomeChart } from '@/components/fire/passive-income-chart';
```

- [ ] **Step 2: Replace `{/* Section 3 coming next */}` with the full section**

```tsx
    {/* ── Section 3: Passive Income ── */}
    <div>
      <p style={{ fontSize: 11, fontWeight: 600, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Passive Income</p>
      <div style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: '20px 24px',
      }}>

        {/* Top stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${colors.border}` }}>
          {[
            { label: 'YTD Dividends', value: assetsReady ? fmt(totalDividendYtd) : null, color: colors.accent },
            { label: 'YTD Interest', value: assetsReady ? fmt(totalInterestYtdUsd) : null, color: colors.cyan },
            { label: 'YTD Total', value: assetsReady ? fmt(ytdPassiveIncome) : null, color: colors.positive },
            {
              label: 'Next Payout',
              value: savingsReady && nextPayout ? `${fmt(nextPayout.amountUsd)}` : null,
              sub: nextPayout ? nextPayout.date : null,
              color: colors.text,
            },
          ].map(({ label, value, color, sub }) => (
            <div key={label}>
              <p style={{ color: colors.muted, fontSize: 11, fontWeight: 500, marginBottom: 4 }}>{label}</p>
              {value === null ? (
                <Loader size="sm" variant="dots" />
              ) : (
                <>
                  <p style={{ color, fontSize: 18, fontWeight: 700, margin: 0 }}>{value}</p>
                  {sub && <p style={{ color: colors.muted, fontSize: 11, margin: '2px 0 0' }}>{sub}</p>}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Area chart */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12, alignItems: 'center' }}>
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
            />
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader size="md" variant="bar" />
            </div>
          )}
        </div>

        {/* Monthly summary table */}
        <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 16 }}>
          <p style={{ color: colors.text, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Monthly Breakdown</p>
          {chartReady ? (() => {
            const rows = Array.from({ length: 12 }, (_, i) => {
              const m = i + 1;
              const div = dividendsByMonth[m] ?? 0;
              const int_ = interestByMonth[m] ?? 0;
              return { month: m, div, int: int_, total: div + int_ };
            })
              .filter(r => r.total > 0)
              .sort((a, b) => b.month - a.month);

            const MONTH_NAMES_FULL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            if (rows.length === 0) {
              return <p style={{ color: colors.muted, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No passive income recorded yet this year.</p>;
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
                      <td style={{ padding: '8px', color: r.month === CURRENT_MONTH ? colors.text : colors.muted, fontWeight: r.month === CURRENT_MONTH ? 600 : 400 }}>
                        {MONTH_NAMES_FULL[r.month - 1]} {CURRENT_YEAR}
                        {r.month === CURRENT_MONTH && <span style={{ color: colors.accent, fontSize: 10, marginLeft: 6, fontWeight: 600 }}>NOW</span>}
                      </td>
                      <td style={{ padding: '8px', color: colors.accent, textAlign: 'right' }}>{r.div > 0 ? fmt(r.div) : '—'}</td>
                      <td style={{ padding: '8px', color: colors.cyan, textAlign: 'right' }}>{r.int > 0 ? fmt(r.int) : '—'}</td>
                      <td style={{ padding: '8px', color: colors.positive, fontWeight: 600, textAlign: 'right' }}>{fmt(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })() : (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}><Loader size="sm" variant="dots" /></div>
          )}
        </div>
      </div>
    </div>
  </div>
);
```

- [ ] **Step 3: Check it renders in browser**

Navigate to `http://localhost:3000/fire`. Verify:
- Top stats row shows YTD Dividends, YTD Interest, YTD Total, Next Payout
- Area chart renders with two stacked areas (blue for dividends, cyan for interest)
- Hovering chart shows tooltip with breakdown
- Monthly table shows rows with data, current month highlighted

- [ ] **Step 4: Commit**

```bash
git add src/app/(fire)/fire/page.tsx
git commit -m "feat: dashboard passive income section with area chart and monthly table"
```

---

## Self-Review

**1. Spec coverage check:**
- ✅ Section 1: Primary card (Total Assets + ROI), 4 secondary cards (Unrealized P&L, YTD Passive Income, Avg/Month, FIRE Progress with progress bar)
- ✅ Section 2: Donut chart (Investments vs Savings), detail list with INVESTMENTS and SAVINGS groups
- ✅ Section 3: Top stats row (YTD Dividends, YTD Interest, YTD Total, Next Payout), area chart (12-month, stacked dividends + interest), monthly table (month/dividends/interest/total, current month highlighted)
- ✅ Loading: inline dots/bar loaders everywhere, no full-page spinner
- ✅ Currency: savings converted via toUsdRates, portfolio stats passed directly to fmt(), dividends treated as USD-equivalent
- ✅ FIRE Progress: avg/month ÷ $2000 with progress bar and color coding

**2. Placeholder scan:** No TBD or TODO in plan.

**3. Type consistency:**
- `toUsdRates: Record<string, number>` defined in Task 2, used in Task 3, 4, 5
- `dividendsByMonth: Record<number, number>` defined in Task 2, passed to `PassiveIncomeChart` in Task 5
- `interestByMonth: Record<number, number>` defined in Task 2, passed to `PassiveIncomeChart` in Task 5
- `PassiveIncomeChartProps` defined in Task 1, consumed in Task 5 — types match
- `donutSlices: { name, value, color }[]` defined in Task 2, used in Task 4 `DonutChart`
