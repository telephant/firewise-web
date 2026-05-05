# Dashboard V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Fire dashboard to a 2-column layout that fits in one viewport, add month-over-month comparison data, and fix two existing bugs.

**Architecture:** Two file changes only — add `MonthlySnapshot` type + `snapshotsApi` to `src/lib/fire/api.ts`, then rewrite the layout and data layer of `src/app/(fire)/fire/page.tsx`. No new components, no backend changes.

**Tech Stack:** Next.js App Router, React hooks, Fire UI design system (`@/components/fire/ui`), `useCurrency` from `@/components/fire/currency-context`.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/fire/api.ts` | Modify (append) | Add `MonthlySnapshot` interface + `snapshotsApi` |
| `src/app/(fire)/fire/page.tsx` | Full rewrite | Layout, data fetching, MoM calculations, bug fixes |

---

## Context for Implementers

### Design System Rules
- **NEVER** use shadcn `@/components/ui` — only `@/components/fire/ui`
- Colors: `colors.bg` (#0A0A0B), `colors.surface` (#141415), `colors.surfaceLight` (#1C1C1E), `colors.text` (#EDEDEF), `colors.muted` (#7C7C82), `colors.border` (rgba(255,255,255,0.08)), `colors.accent` (#5E6AD2), `colors.positive` (#4ADE80), `colors.negative` (#F87171), `colors.info` (#60A5FA), `colors.cyan` (#67E8F9)
- Import: `import { colors, Loader, StatCard, SimpleProgressBar } from '@/components/fire/ui'`

### StatCard API (already exists)
```tsx
<StatCard
  label="Unrealized P&L"
  value="$12,300"
  valueColor="positive"           // 'default' | 'positive' | 'negative'
  trend={{ value: '+$1,200 vs last mo', direction: 'up' }}  // optional
  isLoading={false}
/>
```

### Currency Rule
- Portfolio stats (`total_value`, `unrealized_pl`, `dividend_ytd`) → already USD → `fmt()` directly
- Savings balance/interest → multiply by `toUsdRates[currency]` → then `fmt()`
- `fmt()` comes from `useCurrency()` hook

### Existing page structure (READ THIS BEFORE EDITING)
The current `src/app/(fire)/fire/page.tsx` already has:
- All state variables: `portfolios`, `statsMap`, `savings`, `interestByAccount`, `dividendMonths`, `toUsdRates`
- All loading flags: `portfoliosLoading`, `statsLoading`, `savingsLoading`, `dividendsLoading`, `ratesLoading`, `interestLoading`
- `toUsdAmount` as `useCallback([toUsdRates])`
- All derived values: `totalPortfolioValue`, `totalPortfolioCost`, `totalUnrealizedPl`, `totalDividendYtd`, `totalSavingsUsd`, `totalInterestYtdUsd`, `totalAssetsUsd`, `roi`, `ytdPassiveIncome`, `avgPassivePerMonth`, `fireProgress`
- `interestByMonth`, `dividendsByMonth`, `donutSlices`, `nextPayout` as `useMemo`
- Readiness flags: `statsReady`, `savingsReady`, `assetsReady`, `chartReady`
- `DonutChart` SVG helper, `PassiveIncomeChart` import
- Three rendered sections: stat cards, asset distribution, passive income

---

## Task 1: Add snapshotsApi to api.ts

**Files:**
- Modify: `src/lib/fire/api.ts` (append near line 385, after `portfolioStatsApi`)

- [ ] **Step 1: Add `MonthlySnapshot` interface and `snapshotsApi`**

Open `src/lib/fire/api.ts`. After the `portfolioStatsApi` block (around line 385), add:

```ts
export interface MonthlySnapshot {
  id: string;
  year: number;
  month: number;
  snapshot_date: string;
  total_assets: number;
  total_debts: number;
  net_worth: number;
  passive_income: number;
  avg_passive_income_12m: number;
  total_income: number;
  total_expenses: number;
}

export const snapshotsApi = {
  list: (limit = 2) =>
    fetchApi<{ snapshots: MonthlySnapshot[] }>(`/fire/snapshots?limit=${limit}`),
};
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/telephant/projects/firewise/firewise-web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/telephant/projects/firewise/firewise-web && git add src/lib/fire/api.ts && git commit -m "feat: add MonthlySnapshot type and snapshotsApi"
```

---

## Task 2: Dashboard data layer — add snapshots + MoM values

**Files:**
- Modify: `src/app/(fire)/fire/page.tsx`

This task adds snapshot state, fetches snapshots in the existing `Promise.all`, and adds all MoM derived values. **Do not change the render output yet** — keep the existing JSX intact.

- [ ] **Step 1: Add `MonthlySnapshot` to the import from `@/lib/fire/api`**

Find the line:
```ts
import type { Portfolio, PortfolioStats, SavingsAccount, InterestRecord } from '@/lib/fire/api';
```

Change to:
```ts
import type { Portfolio, PortfolioStats, SavingsAccount, InterestRecord, MonthlySnapshot } from '@/lib/fire/api';
```

Also add `snapshotsApi` to the API imports:
```ts
import {
  portfolioApi,
  portfolioStatsApi,
  savingsApi,
  dividendCalendarApi,
  exchangeRateApi,
  snapshotsApi,
} from '@/lib/fire/api';
```

- [ ] **Step 2: Add `formatMoMTrend` helper above the component**

After the `DonutChart` function (before the `// ── Main Component` comment), add:

```ts
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
```

- [ ] **Step 3: Add `snapshots` state variable**

Inside `FireDashboard()`, after the existing state declarations (after `const [toUsdRates, setToUsdRates] = useState...`), add:

```ts
const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>([]);
```

- [ ] **Step 4: Add `snapshotsApi.list(2)` to the existing `Promise.all`**

Find the existing `Promise.all` call:
```ts
Promise.all([
  portfolioApi.list(),
  savingsApi.list(),
  dividendCalendarApi.get(CURRENT_YEAR),
]).then(([portRes, savRes, divRes]) => {
```

Change to:
```ts
Promise.all([
  portfolioApi.list(),
  savingsApi.list(),
  dividendCalendarApi.get(CURRENT_YEAR),
  snapshotsApi.list(2),
]).then(([portRes, savRes, divRes, snapRes]) => {
```

Then inside the `.then()` block, after `setDividendsLoading(false);`, add:

```ts
      if (snapRes.success && snapRes.data) {
        setSnapshots(snapRes.data.snapshots);
      }
```

Also update the outer `.catch()` — it doesn't need to change since snapshots have no separate loading flag.

- [ ] **Step 5: Add MoM derived values**

After the existing derived calculations (after the `fireProgress` line, before the `interestByMonth` useMemo), add:

```ts
  // ── MoM derived values ────────────────────────────────────────────────────────

  const currentSnap = snapshots[0] ?? null;
  const prevSnap = snapshots[1] ?? null;

  const totalAssetsMoM = currentSnap && prevSnap
    ? currentSnap.total_assets - prevSnap.total_assets
    : null;

  const passiveIncomeMoM = currentSnap && prevSnap
    ? currentSnap.passive_income - prevSnap.passive_income
    : null;

  const avgPassiveMoM = currentSnap && prevSnap
    ? currentSnap.avg_passive_income_12m - prevSnap.avg_passive_income_12m
    : null;

  const totalMomGain = Object.values(statsMap).some(st => st.mom_gain !== null)
    ? Object.values(statsMap).reduce((s, st) => s + (st.mom_gain ?? 0), 0)
    : null;

  // Split fireProgress into bar value (capped) and label value (uncapped)
  const fireProgressBar = Math.min((avgPassivePerMonth / FIRE_TARGET_MONTHLY) * 100, 100);
  const fireProgressLabel = (avgPassivePerMonth / FIRE_TARGET_MONTHLY) * 100;
```

Also remove the existing `fireProgress` line (it's replaced by `fireProgressBar` and `fireProgressLabel`):
Find and delete:
```ts
  const fireProgress = Math.min((avgPassivePerMonth / FIRE_TARGET_MONTHLY) * 100, 100);
```

- [ ] **Step 6: TypeScript check**

```bash
cd /Users/telephant/projects/firewise/firewise-web && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors only about `fireProgress` being undefined in JSX (the render still uses the old name) — that's fine, it gets fixed in Task 3. No other errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/telephant/projects/firewise/firewise-web && git add 'src/app/(fire)/fire/page.tsx' && git commit -m "feat: dashboard snapshot fetch and MoM derived values"
```

---

## Task 3: Rewrite the render — 2-col layout + MoM trends + bug fixes

**Files:**
- Modify: `src/app/(fire)/fire/page.tsx`

Replace the entire `return (...)` block with the new layout. This is the largest task — read the full code before editing.

- [ ] **Step 1: Replace the entire return block**

Find `return (` at the start of the render and replace everything up to and including the final `);` with:

```tsx
  return (
    <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Dashboard</h1>
      </div>

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
              <p style={{ color: colors.text, fontSize: 32, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{fmt(totalAssetsUsd)}</p>
            ) : (
              <div style={{ paddingTop: 4 }}><Loader size="md" variant="dots" /></div>
            )}
            {assetsReady && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                <p style={{ color: roi >= 0 ? colors.positive : colors.negative, fontSize: 13, margin: 0, fontWeight: 500 }}>
                  ROI {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
                </p>
                {totalAssetsMoM !== null && (
                  <p style={{ color: totalAssetsMoM >= 0 ? colors.positive : colors.negative, fontSize: 12, margin: 0, fontWeight: 500 }}>
                    {totalAssetsMoM >= 0 ? '↑' : '↓'} {totalAssetsMoM >= 0 ? '+' : ''}{fmt(totalAssetsMoM)} vs last mo
                  </p>
                )}
              </div>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <StatCard
            label="Unrealized P&L"
            value={statsReady ? fmt(totalUnrealizedPl) : '—'}
            valueColor={statsReady ? (totalUnrealizedPl >= 0 ? 'positive' : 'negative') : 'default'}
            trend={statsReady ? formatMoMTrend(totalMomGain, fmt) : undefined}
            isLoading={!statsReady}
          />
          <StatCard
            label="YTD Passive Income"
            value={assetsReady ? fmt(ytdPassiveIncome) : '—'}
            valueColor="positive"
            trend={assetsReady ? formatMoMTrend(passiveIncomeMoM, fmt) : undefined}
            isLoading={!assetsReady}
          />
          <StatCard
            label="Avg / Month"
            value={assetsReady ? fmt(avgPassivePerMonth) : '—'}
            valueColor="positive"
            trend={assetsReady ? formatMoMTrend(avgPassiveMoM, fmt) : undefined}
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
                  {fmt(avgPassivePerMonth)} / {fmt(FIRE_TARGET_MONTHLY)} target
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

          {/* Detail list */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
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
                      {savingsReady ? fmt(balUsd) : '—'}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
            {[
              { label: 'YTD Dividends', value: assetsReady ? fmt(totalDividendYtd) : null, color: colors.accent },
              { label: 'YTD Interest', value: assetsReady ? fmt(totalInterestYtdUsd) : null, color: colors.cyan },
              { label: 'YTD Total', value: assetsReady ? fmt(ytdPassiveIncome) : null, color: colors.positive },
              {
                label: 'Next Payout',
                value: savingsReady && nextPayout ? fmt(nextPayout.amountUsd) : null,
                sub: savingsReady && nextPayout ? nextPayout.date : null,
                color: colors.text,
              },
            ].map(({ label, value, color, sub }) => (
              <div key={label}>
                <p style={{ color: colors.muted, fontSize: 11, fontWeight: 500, marginBottom: 4 }}>{label}</p>
                {value === null ? (
                  <Loader size="sm" variant="dots" />
                ) : (
                  <>
                    <p style={{ color, fontSize: 16, fontWeight: 700, margin: 0 }}>{value}</p>
                    {sub && <p style={{ color: colors.muted, fontSize: 11, margin: '2px 0 0' }}>{sub}</p>}
                  </>
                )}
              </div>
            ))}
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
                        <td style={{ padding: '7px 8px', color: colors.accent, textAlign: 'right' }}>{r.div > 0 ? fmt(r.div) : '—'}</td>
                        <td style={{ padding: '7px 8px', color: colors.cyan, textAlign: 'right' }}>{r.int > 0 ? fmt(r.int) : '—'}</td>
                        <td style={{ padding: '7px 8px', color: colors.positive, fontWeight: 600, textAlign: 'right' }}>{fmt(r.total)}</td>
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/telephant/projects/firewise/firewise-web && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/telephant/projects/firewise/firewise-web && git add 'src/app/(fire)/fire/page.tsx' && git commit -m "feat: dashboard v2 — 2-col layout, MoM trends, bug fixes"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Two-column grid with `45fr 55fr`, `flex: 1` bottom section
- ✅ Left column: Asset Distribution (donut + investment/savings list)
- ✅ Right column: Passive Income (`overflowY: 'auto'` internal scroll)
- ✅ Total Assets MoM delta below ROI line
- ✅ Unrealized P&L trend from `totalMomGain` (portfolio `mom_gain` summed)
- ✅ YTD Passive Income trend from `passiveIncomeMoM` (snapshot delta)
- ✅ Avg/Month trend from `avgPassiveMoM` (snapshot `avg_passive_income_12m` delta)
- ✅ FIRE Progress uses `fireProgressLabel` (uncapped) for display, `fireProgressBar` (capped) for bar width
- ✅ `formatMoMTrend` helper returns `undefined` when delta is null (graceful no-op)
- ✅ Section 3 indentation bug fixed (all JSX now properly indented under the two-column grid)
- ✅ `snapshotsApi` added to `api.ts`
- ✅ `MonthlySnapshot` type added to `api.ts`

**2. Placeholder scan:** None found.

**3. Type consistency:**
- `formatMoMTrend(delta: number | null, fmt)` → returns `{ value, direction } | undefined` — matches `StatCard` `trend` prop type exactly
- `fireProgressBar` / `fireProgressLabel` both `number` — used in JSX for `value` prop and color comparison
- `totalMomGain: number | null` — passed to `formatMoMTrend`, handles null correctly
- `snapshots: MonthlySnapshot[]` — `snapshots[0]` / `snapshots[1]` both typed as `MonthlySnapshot | undefined`, coerced to null via `?? null`
