# Savings Interest Trend Design Spec

## Goal

Fill the future months of the Dashboard Passive Income area chart with estimated interest data, computed from each savings account's current balance, interest rate, and compound frequency. History months show real credited data; future months show a projection.

## Current State

- Dashboard calls `dividendCalendarApi.get(CURRENT_YEAR)` which returns `interestByMonth: Record<number, number>` (month → USD amount) for historical credited records only
- Future months (after current month) are absent from this map → chart renders them as 0
- Backend already has `computeForecast(balance, rate, frequency)` in `savings.controller.ts`
- No endpoint exists to return a full-year merged interest trend

## Architecture

Single new backend endpoint in `firewise-api`. No new frontend components — only a new API method in `src/lib/fire/api.ts` and one additional call in the dashboard `useEffect`.

---

## Backend: New Endpoint

**Route:** `GET /api/fire/savings/interest-trend?year=YYYY`

**File:** `firewise-api/src/routes/savings.routes.ts` — add route before `/:id` routes to avoid conflict  
**Controller:** `firewise-api/src/controllers/savings.controller.ts` — add `getInterestTrend` handler

### Logic

1. Fetch all `savings_accounts` for `belong_id` (same auth pattern as `listAccounts`)
2. Fetch all `interest_records` for those account IDs where `EXTRACT(year FROM credited_at) = year`
3. Build historical map: sum `amount` by month (1–12) from real records, converting each account's currency to USD using the same exchange rate logic already used in `listAccounts`
4. For each account, compute monthly contribution:
   - `periods_per_year` from `PERIODS_PER_YEAR[compound_frequency]`
   - `monthly_amount = balance * interest_rate / periods_per_year` (same as `computeForecast`)
   - Distribute across future months based on `next_payout_date`: only months ≥ next payout month in `year` get a value
5. Merge: for each month 1–12, use historical sum if it exists (real data), otherwise use forecast sum
6. Return 12-entry array

**Response:**
```ts
GET /api/fire/savings/interest-trend?year=2026
→ { months: Array<{ month: number; amount: number }> }
```

`amount` is always in USD. `month` is 1–12.

### Currency conversion

Reuse the same Frankfurter/exchange-rate fetch already used in `listAccounts`. If exchange rate is unavailable for a currency, treat as 1:1 (same existing fallback behavior).

### Edge cases

- No accounts → return 12 months all 0
- Account has no `next_payout_date` → skip forecast contribution for that account
- `year` param missing or invalid → default to current year

---

## Frontend

### New API method in `src/lib/fire/api.ts`

```ts
export interface InterestTrendMonth {
  month: number;
  amount: number;
}

// Add to savingsApi:
interestTrend: (year: number) =>
  fetchApi<{ months: InterestTrendMonth[] }>(`/fire/savings/interest-trend?year=${year}`),
```

### Dashboard change in `src/app/(fire)/fire/page.tsx`

Replace the existing `dividendCalendarApi.get(CURRENT_YEAR)` interest data source with `savingsApi.interestTrend(CURRENT_YEAR)` for the `interestByMonth` map passed to `PassiveIncomeChart`.

Add to the `Promise.all` in the dashboard `useEffect`:
```ts
Promise.all([
  portfolioApi.list(),
  savingsApi.list(),
  dividendCalendarApi.get(CURRENT_YEAR),   // dividends — unchanged
  snapshotsApi.list(2),
  savingsApi.interestTrend(CURRENT_YEAR),  // ← new: replaces interest from dividend calendar
])
```

Build `interestByMonth` from the trend response:
```ts
const interestByMonth: Record<number, number> = {};
trendMonths.forEach(m => { if (m.amount > 0) interestByMonth[m.month] = m.amount; });
```

`PassiveIncomeChart` receives this map unchanged — no component changes needed.

---

## File Changes

| File | Action |
|------|--------|
| `firewise-api/src/routes/savings.routes.ts` | Add `GET /interest-trend` route (before `/:id` routes) |
| `firewise-api/src/controllers/savings.controller.ts` | Add `getInterestTrend` handler, reuse `computeForecast` and exchange rate logic |
| `src/lib/fire/api.ts` | Add `InterestTrendMonth` interface + `savingsApi.interestTrend()` |
| `src/app/(fire)/fire/page.tsx` | Add `interestTrend` to Promise.all, build `interestByMonth` from result |

No new components. No database changes.
