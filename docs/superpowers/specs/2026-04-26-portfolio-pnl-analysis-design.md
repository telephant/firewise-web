# Portfolio P&L Analysis Design

**Goal:** Add cross-portfolio comparison, realized P&L breakdown, and YoY/MoM trend charts to the portfolio module.

**Architecture:** Three self-contained additions — (1) dashboard redesign with multi-currency comparison table, (2) new P&L tab in portfolio detail, (3) monthly trend chart in Stats tab. All use existing fire UI components and the existing API where possible, with one new backend endpoint for realized P&L and one for exchange rates.

**Tech Stack:** Next.js 15 App Router, fire UI design system, Recharts (via existing chart components), Express backend, Supabase `currency_exchange` table.

---

## 1. New Backend Endpoints

### GET /api/exchange-rates
- Query params: `base` (e.g. `USD`), `codes` (comma-separated, e.g. `HKD,TWD,EUR`)
- Reads from `currency_exchange` table (already populated by `update-currency` task)
- Returns: `{ base: "USD", rates: { HKD: 7.82, TWD: 32.1, EUR: 0.91 } }`
- Auth required

### GET /api/portfolios/:id/realized-pl
- Auth + ownership check via `getViewContext()`
- Fetches all trades, runs `computePositions()`, returns per-ticker realized P&L
- Only returns tickers where `realized_pl !== 0`
- Returns: `{ data: [{ ticker, realized_pl, trade_count }] }` sorted by `realized_pl` descending

## 2. Frontend API Client (`src/lib/fire/api.ts`)

Add two new functions:
```ts
exchangeRateApi.get(base: string, codes: string[]) // GET /exchange-rates?base=...&codes=...
portfolioApi.getRealizedPL(id: string)             // GET /portfolios/:id/realized-pl
```

New types:
```ts
interface ExchangeRates { base: string; rates: Record<string, number> }
interface RealizedPLItem { ticker: string; realized_pl: number; trade_count: number }
```

## 3. Dashboard Page (`/fire/page.tsx`) Redesign

**State:**
- `baseCurrency: string` — persisted to localStorage key `fire_base_currency`, default `USD`
- `convertMode: boolean` — true = fold all into baseCurrency, false = show original currency
- `statsMap: Record<string, PortfolioStats>` — parallel-loaded stats per portfolio
- `rates: Record<string, number>` — exchange rates relative to baseCurrency

**Layout:**
1. Header row: "Portfolios" title + "+ New Portfolio" button
2. Controls row: CurrencyCombobox (base currency selector) + ButtonGroup ["Original" | "Convert"] toggle
3. Comparison table (fire UI Table component):
   - Columns: Name | Currency | Net Value | Total Cost | Unrealized P&L | Realized P&L | YTD Dividends | Return %
   - In convert mode: all amounts converted to baseCurrency; column headers show base currency code
   - In original mode: amounts shown in portfolio's own currency; currency code shown in Currency column
   - Numbers color-coded: positive → `colors.positive`, negative → `colors.negative`
   - Clicking a row navigates to `/fire/portfolios/:id`
4. Loading: show `<Loader size="md" variant="bar" />` while any stats are loading

**Currency conversion logic (client-side):**
- `convertedValue = originalValue / rates[portfolioOriginalCurrency] * rates[baseCurrency]`
- If rate not available, show original value with "~" prefix

## 4. Portfolio Detail Page (`/fire/portfolios/[id]/page.tsx`)

### New "P&L" Tab
- 4th tab added: Holdings | Dividends | P&L | Stats
- Loads `portfolioApi.getRealizedPL(id)` on tab open (lazy load)
- Table columns: Ticker | Realized P&L | # Trades
- Amounts color-coded positive/negative
- If no realized P&L (no sells yet): show empty state "No closed positions yet"

### Stats Tab — Monthly Trend Chart
- Loads `portfolioStatsApi.getSnapshots(id)` (already exists)
- Builds chart data: snapshots sorted ascending by `snapshot_date`, append current `total_value` as latest point
- Uses existing `BarChart` component from fire UI
- X-axis: month labels (e.g. "Jan 25", "Feb 25")
- Y-axis: net value in portfolio currency
- YoY annotation: if snapshot for same month last year exists, show % change as tooltip
- If < 2 snapshots: show "Insufficient data — snapshots are generated monthly" message
- "Since inception" return: `(currentValue - firstSnapshot.total_value) / firstSnapshot.total_value * 100`

## 5. Design Constraints
- All pages use `@/components/fire/ui` only — no shadcn
- Dark theme throughout: `colors.bg` background, `colors.surface` cards
- `baseCurrency` selection persisted in localStorage so it survives page navigation
- Exchange rates fetched once on dashboard mount, cached in component state
- No server-side rendering for portfolio pages (all `'use client'`)
