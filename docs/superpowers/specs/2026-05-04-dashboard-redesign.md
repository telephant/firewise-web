# Dashboard Redesign Spec

## Goal

Replace the current basic portfolio dashboard with a comprehensive personal wealth dashboard that covers both investment portfolios and savings accounts, with a strong focus on passive income tracking and FIRE progress.

## Architecture

Single page (`src/app/(fire)/fire/page.tsx`) rewritten with three visual sections. All monetary values displayed in the user-selected display currency via `useCurrency()`. Savings amounts are multi-currency and must be converted to USD first (via `exchangeRateApi`), then formatted with `fmt()`. Portfolio stats are already in USD from the backend.

**Currency conversion rule (enforced everywhere):**
- Portfolio stats → already USD → `fmt()` directly
- Dividend calendar → already in user's preferred currency, treat as USD-equivalent for display
- Savings balance/interest → raw currency → exchangeRateApi(base=USD) to get toUsdRate → multiply → `fmt()`

## Data Sources

| Data | API | Notes |
|------|-----|-------|
| Portfolio list | `portfolioApi.list()` | Names, IDs |
| Portfolio stats | `portfolioStatsApi.getStats(id)` | total_value, total_cost, unrealized_pl, realized_pl, dividend_ytd — all USD |
| Dividend calendar | `dividendCalendarApi.get(year)` | months[].total per month, already converted |
| Savings accounts | `savingsApi.list()` | balance, interest_rate, currency, total_interest_ytd, total_interest_all, next_payout_date, next_payout_amount |
| Savings interest records | `savingsApi.listInterest(id)` | Per-account monthly interest history |
| Exchange rates | `exchangeRateApi.get('USD', ccys)` | For savings currency → USD conversion |

## FIRE Target

Default monthly passive income target: **$2,000 USD**. Hardcoded for now, no settings page required.

---

## Section 1 — Stat Cards

Layout: 1 large primary card + 4 smaller secondary cards in a row below or beside it.

### Primary Card — Total Assets
- Value: sum of all portfolio `total_value` + sum of all savings `balance` (converted to USD)
- Subtitle: `ROI: +X.X%` where ROI = (total_value - total_cost) / total_cost × 100
- Show `<Loader variant="dots">` inline while data loads

### Secondary Cards (4)
1. **Unrealized P&L** — sum of `unrealized_pl` across portfolios; color positive/negative; trend arrow vs prior month if snapshot data available
2. **YTD Passive Income** — sum of `dividend_ytd` (all portfolios) + sum of `total_interest_ytd` (all savings, converted); color positive
3. **Avg Passive / Month** — YTD Passive Income ÷ current month number (1–12)
4. **FIRE Progress** — (Avg/Month ÷ 2000) × 100, shown as percentage + small inline progress bar; color: positive if ≥100%, info if ≥50%, muted if <50%

All cards use `<StatCard>` from fire/ui with inline `<Loader variant="dots">` while loading.

---

## Section 2 — Asset Distribution

Two-column layout: left chart, right detail list.

### Left — Donut Chart (Asset Type)
- Two slices: **Investments** (sum of portfolio total_value) and **Savings** (sum of savings balance, converted)
- Colors: `colors.accent` for Investments, `colors.cyan` for Savings
- Center label: total assets value
- Use existing custom SVG DonutChart component from current dashboard

### Right — Asset Detail List
Two groups separated by uppercase labels:

**INVESTMENTS group:**
- One row per portfolio: name, value (fmt), allocation %, unrealized P&L %
- Clickable → navigates to `/fire/portfolios/{id}`

**SAVINGS group:**
- One row per savings account: name, balance (fmt in original currency), interest rate %, currency badge
- Clickable → navigates to `/fire/savings`

If only 1 portfolio, the list still looks full because savings accounts fill it out.

---

## Section 3 — Passive Income

### Top Stats Row (4 numbers inline)
- YTD Dividends (from portfolio stats sum)
- YTD Interest (from savings, converted)
- YTD Total (sum of above)
- Next Payout: earliest upcoming savings payout date + amount

### Area Chart — 12-Month Passive Income Trend
- X-axis: Jan–Dec (current year)
- Two stacked area layers:
  - **Dividends** (color: `colors.accent` #5E6AD2) — from `dividendCalendarApi` months[].total
  - **Interest** (color: `colors.cyan` #67E8F9) — from all savings interest_records grouped by month
- Use Recharts `AreaChart` with `stackId="passive"` for stacking
- Interest amounts converted to USD before plotting
- Future months show 0 (no projected data in the chart — forecasts are separate)
- Tooltip shows dividends + interest + total for hovered month

### Forecast Row (below chart, above table)
- "Next expected payout" — savings account with earliest `next_payout_date`, show date + amount
- "Est. remaining this month" — sum of savings `next_payout_amount` where `next_payout_date` is within current month

### Monthly Summary Table
Columns: Month | Dividends | Interest | Total
- Only rows with data (dividends > 0 or interest > 0)
- Most recent month first
- Interest converted to USD
- Row highlight for current month

---

## Chart Components

| Chart | Component | Source |
|-------|-----------|--------|
| Asset type donut | Custom SVG DonutChart (copy from current page.tsx) | Inline in page |
| Passive income area | Recharts `AreaChart` via `ResponsiveContainer` | New component: `src/components/fire/passive-income-chart.tsx` |

The `PassiveIncomeChart` component accepts:
```ts
interface PassiveIncomeChartProps {
  dividendsByMonth: Record<number, number>; // month 1-12 → USD amount
  interestByMonth: Record<number, number>;  // month 1-12 → USD amount
  fmt: (usdAmount: number) => string;       // from useCurrency
}
```

---

## Loading Strategy

- Page renders immediately (no full-page spinner)
- Stat cards show `<Loader size="sm" variant="dots">` inline while data loads
- Charts show `<Loader size="md" variant="bar">` in their container while loading
- Data fetched in parallel: `Promise.all([portfolioApi.list(), savingsApi.list(), dividendCalendarApi.get(year)])`
- Portfolio stats fetched after portfolio list arrives (need IDs)
- Exchange rates fetched after savings list arrives (need currencies)

---

## File Changes

| File | Action |
|------|--------|
| `src/app/(fire)/fire/page.tsx` | Full rewrite |
| `src/components/fire/passive-income-chart.tsx` | New component |

No backend changes required. No new API endpoints needed.
