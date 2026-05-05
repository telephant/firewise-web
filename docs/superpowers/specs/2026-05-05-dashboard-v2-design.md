# Dashboard V2 Design Spec

## Goal

Redesign the Fire dashboard layout from vertical stacking to a two-column grid that fits in one viewport, add month-over-month (MoM) comparison data to all stat cards, and fix existing bugs.

## Current State

- Three sections stacked vertically: Stat Cards → Asset Distribution → Passive Income
- Requires heavy scrolling to see Passive Income chart
- No MoM comparison anywhere
- Two bugs: Section 3 indentation inconsistency; `fireProgress` label capped at 100% even when actual value exceeds target

## Architecture

Single file change: `src/app/(fire)/fire/page.tsx` (rewrite layout and add snapshot data).
One API addition: `snapshotsApi` in `src/lib/fire/api.ts`.

No new components needed — existing `StatCard` already supports `trend` prop (`{ value: string, direction: 'up' | 'down' | 'neutral' }`).

---

## Layout

```
┌─────────────────────────────────────────────────────┐
│  Total Assets (primary card — full width)           │
│  $320,000   ROI +12.3%   ↑ +$8,200 vs last month   │
│                      Investments $X | Savings $X    │
└─────────────────────────────────────────────────────┘
┌────────────┬────────────┬────────────┬──────────────┐
│Unrealized  │YTD Passive │ Avg/Month  │ FIRE Progress│
│P&L         │Income      │            │ 70%  ████░░  │
│↑ trend     │↑ trend     │↑ trend     │ $X / $2000   │
└────────────┴────────────┴────────────┴──────────────┘
┌──────────────────────┬──────────────────────────────┐
│ ASSET DISTRIBUTION   │ PASSIVE INCOME               │
│ (fixed height, no    │ (fixed height,               │
│  internal scroll)    │  right column scrolls        │
│                      │  internally)                 │
│  Donut chart         │ Stats row (4 numbers)        │
│  Investment list     │ Area chart                   │
│  Savings list        │ Monthly table                │
└──────────────────────┴──────────────────────────────┘
```

**Two-column grid:**
- `display: grid; grid-template-columns: 45fr 55fr; gap: 16px; align-items: stretch`
- Left column: Asset Distribution card, fixed height, no internal scroll
- Right column: Passive Income card, same height as left, `overflow-y: auto` internally
- The two columns fill the remaining viewport height after the top stat rows

**Viewport height math:**
- Page padding: 24px top + 24px bottom
- Header: ~46px
- Primary card: ~88px
- 4 StatCards row: ~80px
- Gaps: ~40px
- Remaining for two-column section: `calc(100vh - 24px - 46px - 88px - 80px - 40px)` ≈ use `flex: 1` with the outer wrapper as a flex column, so the bottom row stretches to fill remaining space.

---

## Section 1 — Stat Cards (unchanged structure, new data)

### Primary Card — Total Assets

Add MoM delta below ROI:
```
Total Assets: $320,000
ROI +12.3%
↑ +$8,200 vs last month   ← new line, from snapshot comparison
```

- Delta = `currentSnapshot.total_assets - prevSnapshot.total_assets`
- Color: positive (green) if delta ≥ 0, negative (red) if < 0
- Format: `fmt(Math.abs(delta))` with `↑` or `↓` prefix
- Show only when snapshot data is available (graceful no-op if missing)

### Secondary StatCards — MoM Trends

| Card | Value | Trend source |
|------|-------|-------------|
| Unrealized P&L | `fmt(totalUnrealizedPl)` | `portfolioStats.mom_gain` / `mom_gain_pct` — already in `PortfolioStats` |
| YTD Passive Income | `fmt(ytdPassiveIncome)` | `currentSnapshot.passive_income - prevSnapshot.passive_income` |
| Avg / Month | `fmt(avgPassivePerMonth)` | `currentSnapshot.avg_passive_income_12m - prevSnapshot.avg_passive_income_12m` |
| FIRE Progress | `fireProgressActual.toFixed(1)%` | No trend arrow — progress bar + target label |

**Trend format for StatCard:**
```tsx
trend={{ value: '+$1,200 vs last mo', direction: 'up' }}
// or
trend={{ value: '-$300 vs last mo', direction: 'down' }}
```

**FIRE Progress bug fix:** Separate the display value from the bar value:
```ts
const fireProgressBar = Math.min((avgPassivePerMonth / FIRE_TARGET_MONTHLY) * 100, 100); // capped for bar
const fireProgressLabel = (avgPassivePerMonth / FIRE_TARGET_MONTHLY) * 100; // uncapped for display
```

---

## Section 2 — Asset Distribution (left column)

No content changes. Layout change only: becomes left column of a 2-col grid.

---

## Section 3 — Passive Income (right column)

No content changes. Layout change only: becomes right column with `overflow-y: auto`.

**Bug fix:** Fix the indentation inconsistency (Section 3 outer div uses 4-space indent instead of 6-space like Sections 1 and 2). Correct to match the surrounding JSX.

---

## Data Layer Changes

### New: `snapshotsApi` in `src/lib/fire/api.ts`

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

### Fetch in dashboard `useEffect`

Add `snapshotsApi.list(2)` to the initial `Promise.all`:
```ts
Promise.all([
  portfolioApi.list(),
  savingsApi.list(),
  dividendCalendarApi.get(CURRENT_YEAR),
  snapshotsApi.list(2),   // ← new
])
```

Result: `snapshots[0]` = most recent month, `snapshots[1]` = previous month.

**Note:** Snapshots may not exist (new users, or snapshot job hasn't run yet). All MoM displays must be conditional — show `—` or simply omit the trend if either snapshot is missing.

### New state variable

```ts
const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>([]);
```

Loading is bundled with the outer `Promise.all` — no separate loading flag needed. MoM data simply shows nothing until the outer fetch completes.

### Derived MoM values (computed inline, no useMemo needed — O(1))

```ts
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
```

For Unrealized P&L trend, use `portfolioStats.mom_gain` / `mom_gain_pct` which are already fetched:
```ts
// Sum mom_gain across all portfolios
const totalMomGain = Object.values(statsMap).reduce(
  (s, st) => s + (st.mom_gain ?? 0), 0
);
const hasMomGain = Object.values(statsMap).some(st => st.mom_gain !== null);
```

### Helper: `formatMoM`

```ts
function formatMoMTrend(
  delta: number | null,
  fmt: (v: number) => string
): { value: string; direction: 'up' | 'down' | 'neutral' } | undefined {
  if (delta === null) return undefined;
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral';
  const sign = delta > 0 ? '+' : '';
  return { value: `${sign}${fmt(Math.abs(delta))} vs last mo`, direction };
}
```

---

## File Changes

| File | Action |
|------|--------|
| `src/lib/fire/api.ts` | Add `MonthlySnapshot` interface + `snapshotsApi` |
| `src/app/(fire)/fire/page.tsx` | Add snapshot fetch, MoM derived values, new 2-col layout, bug fixes |

No new component files. No backend changes.

---

## Bug Fixes (bundled)

1. **`fireProgress` label capped at 100%** — split into `fireProgressBar` (capped) and `fireProgressLabel` (uncapped). Label shows true %, bar capped at 100.
2. **Section 3 indentation** — fix 4-space indent to match surrounding 6-space JSX context.
