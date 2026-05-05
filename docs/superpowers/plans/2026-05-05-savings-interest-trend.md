# Savings Interest Trend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `GET /api/fire/savings/interest-trend?year=YYYY` endpoint that returns 12 months of interest data (real credited records for past months, estimated payouts for future months), and wire it into the dashboard so the Passive Income chart shows projected interest instead of zeros.

**Architecture:** New controller handler in `firewise-api` reuses existing `computeForecast()` and exchange-rate logic. Frontend adds one `savingsApi.interestTrend()` method, adds it to the dashboard `Promise.all`, and replaces the client-side `interestByMonth` derivation with the server result. No new components.

**Tech Stack:** Express/TypeScript (backend), Next.js/React (frontend), Supabase (DB), Frankfurter exchange rates

---

## File Map

| File | Change |
|------|--------|
| `firewise-api/src/controllers/savings.controller.ts` | Add `getInterestTrend` handler |
| `firewise-api/src/routes/savings.routes.ts` | Register `GET /interest-trend` before `/:id` routes |
| `src/lib/fire/api.ts` | Add `InterestTrendMonth` interface + `savingsApi.interestTrend()` |
| `src/app/(fire)/fire/page.tsx` | Add interestTrend to Promise.all, replace `interestByMonth` derivation |

---

## Task 1: Backend — `getInterestTrend` controller handler

**Files:**
- Modify: `firewise-api/src/controllers/savings.controller.ts`

### Context

The file already has:
- `PERIODS_PER_YEAR: Record<string, number>` — `{ monthly: 12, quarterly: 4, semi_annual: 2, annual: 1 }`
- `computeForecast(balance, interestRate, frequency): number` — returns `balance * rate / periods`
- `computeNextPayoutDate(fromDate, frequency): string` — returns next ISO date string
- `listAccounts` handler — shows the pattern for fetching accounts by `belong_id` and exchange rates

The `listAccounts` handler does NOT fetch exchange rates — it returns amounts in account currency. But we need USD output. The exchange-rate logic is in the dashboard client side today. For this endpoint we need to fetch rates server-side. The backend uses `node-fetch` or similar — check if there's an existing util, or call `https://api.frankfurter.app/latest?from=USD&to=SGD,AED` directly.

Actually, to keep it simple and avoid adding an external HTTP call to the backend, we'll convert using a straightforward approach: fetch all unique non-USD currencies and call Frankfurter, same pattern the frontend currently uses. If a rate fetch fails, treat as 1:1.

- [ ] **Step 1: Add `getInterestTrend` to `savings.controller.ts`**

Add the following after `deleteInterest` (at the end of the file, before `export`s if any):

```typescript
// GET /fire/savings/interest-trend?year=YYYY
export const getInterestTrend = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<{ months: { month: number; amount: number }[] }>>
): Promise<void> => {
  try {
    const ctx = await getViewContext(req);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12

    // 1. Fetch all savings accounts for this user
    const { data: accounts, error: accErr } = await supabaseAdmin
      .from('savings_accounts')
      .select('*')
      .eq('belong_id', ctx.belongId);

    if (accErr) throw new AppError('Failed to fetch savings accounts', 500);
    const accts = accounts || [];

    if (accts.length === 0) {
      res.json({ success: true, data: { months: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, amount: 0 })) } });
      return;
    }

    const accountIds = accts.map((a: { id: string }) => a.id);

    // 2. Fetch historical interest records for this year
    const { data: records } = await supabaseAdmin
      .from('interest_records')
      .select('account_id, amount, credited_at')
      .in('account_id', accountIds);

    const yearRecords = (records || []).filter(
      (r: { credited_at: string }) => new Date(r.credited_at).getFullYear() === year
    );

    // 3. Fetch USD exchange rates for non-USD currencies
    const ccys = [...new Set(accts.map((a: { currency: string }) => a.currency))].filter((c: string) => c !== 'USD');
    const toUsd: Record<string, number> = { USD: 1 };
    if (ccys.length > 0) {
      try {
        const url = `https://api.frankfurter.app/latest?from=USD&to=${ccys.join(',')}`;
        const rateRes = await fetch(url);
        const rateJson = await rateRes.json() as { rates: Record<string, number> };
        for (const [ccy, rate] of Object.entries(rateJson.rates)) {
          toUsd[ccy] = rate > 0 ? 1 / rate : 1;
        }
      } catch {
        // fallback: 1:1 for unknown currencies
      }
    }

    // 4. Build historical month map (real credited records)
    const histMap: Record<number, number> = {};
    for (const r of yearRecords as { account_id: string; amount: number; credited_at: string }[]) {
      const acct = accts.find((a: { id: string }) => a.id === r.account_id) as { currency: string } | undefined;
      const rate = toUsd[acct?.currency ?? 'USD'] ?? 1;
      const m = new Date(r.credited_at).getMonth() + 1;
      histMap[m] = (histMap[m] ?? 0) + r.amount * rate;
    }

    // 5. Build forecast map for future months
    // For each account, figure out which future months in `year` get a payout
    // using next_payout_date as the first future payout, then advancing by frequency
    const forecastMap: Record<number, number> = {};

    for (const a of accts as {
      id: string; currency: string; balance: number; interest_rate: number;
      compound_frequency: string; last_credited_at?: string | null;
      start_date?: string | null; created_at: string;
    }[]) {
      // Find last credited date for this account
      const acctRecords = (yearRecords as { account_id: string; credited_at: string }[])
        .filter(r => r.account_id === a.id)
        .sort((x, y) => y.credited_at.localeCompare(x.credited_at));

      // Use all records (not just this year) to find last credited date
      const allAcctRecords = (records || [])
        .filter((r: { account_id: string }) => r.account_id === a.id)
        .sort((x: { credited_at: string }, y: { credited_at: string }) => y.credited_at.localeCompare(x.credited_at));
      const lastCreditedAt: string | null = (allAcctRecords[0] as { credited_at: string } | undefined)?.credited_at ?? null;

      const baseDate = lastCreditedAt ?? a.start_date ?? a.created_at.slice(0, 10);
      const payoutUsd = computeForecast(a.balance, a.interest_rate, a.compound_frequency) * (toUsd[a.currency] ?? 1);

      // Walk forward from baseDate, collecting payout months that are:
      //   - in `year`
      //   - month > currentMonth (future only)
      let cursor = baseDate;
      // advance up to 24 steps to find all payouts in the target year
      for (let i = 0; i < 24; i++) {
        cursor = computeNextPayoutDate(cursor, a.compound_frequency);
        const d = new Date(cursor);
        const pYear = d.getFullYear();
        const pMonth = d.getMonth() + 1;
        if (pYear > year) break;
        if (pYear === year && pMonth > currentMonth) {
          forecastMap[pMonth] = (forecastMap[pMonth] ?? 0) + payoutUsd;
        }
      }
    }

    // 6. Merge: historical takes priority, forecast fills the rest
    const months = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const amount = histMap[m] ?? forecastMap[m] ?? 0;
      return { month: m, amount: Math.round(amount * 100) / 100 };
    });

    res.json({ success: true, data: { months } });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ success: false, error: err.message });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to compute interest trend' });
  }
};
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd /Users/telephant/projects/firewise/firewise-api
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/telephant/projects/firewise/firewise-api
git add src/controllers/savings.controller.ts
git commit -m "feat: add getInterestTrend controller handler"
```

---

## Task 2: Backend — Register the route

**Files:**
- Modify: `firewise-api/src/routes/savings.routes.ts`

### Context

Current routes file:
```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  listAccounts, createAccount, updateAccount, deleteAccount,
  listInterest, addInterest, deleteInterest,
} from '../controllers/savings.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', listAccounts);
router.post('/', createAccount);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);

router.get('/:id/interest', listInterest);
router.post('/:id/interest', addInterest);
router.delete('/:id/interest/:recordId', deleteInterest);

export default router;
```

The new route MUST be added before `router.get('/:id/interest', ...)` — Express matches routes in order, and `/interest-trend` would be caught by `/:id` if placed after it.

- [ ] **Step 1: Add import and route**

Replace the file with:

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getInterestTrend,
  listInterest,
  addInterest,
  deleteInterest,
} from '../controllers/savings.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', listAccounts);
router.post('/', createAccount);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);

router.get('/interest-trend', getInterestTrend);

router.get('/:id/interest', listInterest);
router.post('/:id/interest', addInterest);
router.delete('/:id/interest/:recordId', deleteInterest);

export default router;
```

- [ ] **Step 2: Verify compile**

```bash
cd /Users/telephant/projects/firewise/firewise-api
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Start the API server if not running:
```bash
cd /Users/telephant/projects/firewise/firewise-api
npm run dev
```

In another terminal (with a valid auth token from the app):
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3001/api/fire/savings/interest-trend?year=2026"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "months": [
      { "month": 1, "amount": 30.00 },
      { "month": 2, "amount": 30.00 },
      ...
      { "month": 12, "amount": 30.00 }
    ]
  }
}
```
Past months should show actual credited amounts (if any). Future months should show estimated values.

- [ ] **Step 4: Commit**

```bash
cd /Users/telephant/projects/firewise/firewise-api
git add src/routes/savings.routes.ts
git commit -m "feat: register GET /fire/savings/interest-trend route"
```

---

## Task 3: Frontend — Add `InterestTrendMonth` and `savingsApi.interestTrend()`

**Files:**
- Modify: `src/lib/fire/api.ts`

### Context

Current end of `src/lib/fire/api.ts` (lines ~609-623):
```typescript
export const savingsApi = {
  list: () => fetchApi<SavingsAccount[]>('/fire/savings'),
  create: (data: CreateSavingsAccountData) =>
    fetchApi<SavingsAccount>('/fire/savings', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreateSavingsAccountData>) =>
    fetchApi<{ id: string }>(`/fire/savings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetchApi(`/fire/savings/${id}`, { method: 'DELETE' }),
  listInterest: (id: string) =>
    fetchApi<{ records: InterestRecord[]; forecast: ForecastPeriod[] }>(`/fire/savings/${id}/interest`),
  addInterest: (id: string, data: { amount: number; credited_at: string; notes?: string }) =>
    fetchApi<InterestRecord>(`/fire/savings/${id}/interest`, { method: 'POST', body: JSON.stringify(data) }),
  deleteInterest: (id: string, recordId: string) =>
    fetchApi(`/fire/savings/${id}/interest/${recordId}`, { method: 'DELETE' }),
};
```

- [ ] **Step 1: Add `InterestTrendMonth` interface before `savingsApi`**

Find the `export const savingsApi` block. Just above it, add:

```typescript
export interface InterestTrendMonth {
  month: number;
  amount: number;
}
```

- [ ] **Step 2: Add `interestTrend` method to `savingsApi`**

Add as the last method in `savingsApi`:

```typescript
  interestTrend: (year: number) =>
    fetchApi<{ months: InterestTrendMonth[] }>(`/fire/savings/interest-trend?year=${year}`),
```

Final `savingsApi` should look like:

```typescript
export const savingsApi = {
  list: () => fetchApi<SavingsAccount[]>('/fire/savings'),
  create: (data: CreateSavingsAccountData) =>
    fetchApi<SavingsAccount>('/fire/savings', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreateSavingsAccountData>) =>
    fetchApi<{ id: string }>(`/fire/savings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetchApi(`/fire/savings/${id}`, { method: 'DELETE' }),
  listInterest: (id: string) =>
    fetchApi<{ records: InterestRecord[]; forecast: ForecastPeriod[] }>(`/fire/savings/${id}/interest`),
  addInterest: (id: string, data: { amount: number; credited_at: string; notes?: string }) =>
    fetchApi<InterestRecord>(`/fire/savings/${id}/interest`, { method: 'POST', body: JSON.stringify(data) }),
  deleteInterest: (id: string, recordId: string) =>
    fetchApi(`/fire/savings/${id}/interest/${recordId}`, { method: 'DELETE' }),
  interestTrend: (year: number) =>
    fetchApi<{ months: InterestTrendMonth[] }>(`/fire/savings/interest-trend?year=${year}`),
};
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/telephant/projects/firewise/firewise-web
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/telephant/projects/firewise/firewise-web
git add src/lib/fire/api.ts
git commit -m "feat: add InterestTrendMonth and savingsApi.interestTrend"
```

---

## Task 4: Frontend — Wire interest trend into dashboard

**Files:**
- Modify: `src/app/(fire)/fire/page.tsx`

### Context

Current dashboard data flow in `page.tsx`:

**State (lines ~100-115):**
```typescript
const [interestByAccount, setInterestByAccount] = useState<Record<string, InterestRecord[]>>({});
const [interestLoading, setInterestLoading] = useState(false);
```

**Promise.all (lines ~122-127):**
```typescript
Promise.all([
  portfolioApi.list(),
  savingsApi.list(),
  dividendCalendarApi.get(CURRENT_YEAR),
  snapshotsApi.list(2),
]).then(([portRes, savRes, divRes, snapRes]) => {
```

**Per-account interest fetch (lines ~177-188):**
```typescript
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
```

**`interestByMonth` derivation (lines ~266-277):**
```typescript
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
```

**`chartReady` flag (line ~311):**
```typescript
const chartReady = assetsReady && !dividendsLoading && !interestLoading;
```

The plan:
1. Add `interestTrend` to `Promise.all` as the 5th item
2. Store the result in new state `interestTrendMonths: InterestTrendMonth[]`
3. Remove the per-account `listInterest` secondary fetch (the `if (savList.length > 0)` block) — we no longer need it for the chart. **Keep the `interestByAccount` state and `interestLoading` state** because they may be used elsewhere in the page (savings detail tab). Actually, check: the dashboard page uses `interestByAccount` only in the `interestByMonth` useMemo. So we can safely remove the secondary fetch and the related state.
4. Replace the `interestByMonth` useMemo with a simple derivation from `interestTrendMonths`
5. Update `chartReady` to remove `!interestLoading`

- [ ] **Step 1: Add `InterestTrendMonth` to the import from `api.ts`**

Find line ~13:
```typescript
import type { Portfolio, PortfolioStats, SavingsAccount, InterestRecord, MonthlySnapshot } from '@/lib/fire/api';
```

Change to:
```typescript
import type { Portfolio, PortfolioStats, SavingsAccount, InterestTrendMonth, MonthlySnapshot } from '@/lib/fire/api';
```

(Remove `InterestRecord` if it's no longer used after removing the per-account fetch. If it's used elsewhere in the file, keep it.)

- [ ] **Step 2: Replace state and loading flags**

Find:
```typescript
const [interestByAccount, setInterestByAccount] = useState<Record<string, InterestRecord[]>>({});
// ...
const [interestLoading, setInterestLoading] = useState(false);
```

Replace `interestByAccount` state with:
```typescript
const [interestTrendMonths, setInterestTrendMonths] = useState<InterestTrendMonth[]>([]);
```

Remove the `interestLoading` state entirely (it's no longer needed — `interestTrend` is bundled in the main `Promise.all`).

- [ ] **Step 3: Add `interestTrend` to `Promise.all`**

Find:
```typescript
Promise.all([
  portfolioApi.list(),
  savingsApi.list(),
  dividendCalendarApi.get(CURRENT_YEAR),
  snapshotsApi.list(2),
]).then(([portRes, savRes, divRes, snapRes]) => {
```

Replace with:
```typescript
Promise.all([
  portfolioApi.list(),
  savingsApi.list(),
  dividendCalendarApi.get(CURRENT_YEAR),
  snapshotsApi.list(2),
  savingsApi.interestTrend(CURRENT_YEAR),
]).then(([portRes, savRes, divRes, snapRes, trendRes]) => {
```

- [ ] **Step 4: Store the trend result inside the `.then` handler**

After:
```typescript
if (snapRes.success && snapRes.data) {
  setSnapshots(snapRes.data.snapshots);
}
```

Add:
```typescript
if (trendRes.success && trendRes.data) {
  setInterestTrendMonths(trendRes.data.months);
}
```

- [ ] **Step 5: Remove the per-account `listInterest` secondary fetch**

Delete this entire block (lines ~177-188):
```typescript
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
```

- [ ] **Step 6: Replace `interestByMonth` useMemo**

Find:
```typescript
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
```

Replace with:
```typescript
const interestByMonth = useMemo(() => {
  const map: Record<number, number> = {};
  interestTrendMonths.forEach(m => { if (m.amount > 0) map[m.month] = m.amount; });
  return map;
}, [interestTrendMonths]);
```

- [ ] **Step 7: Update `chartReady`**

Find:
```typescript
const chartReady = assetsReady && !dividendsLoading && !interestLoading;
```

Replace with:
```typescript
const chartReady = assetsReady && !dividendsLoading;
```

- [ ] **Step 8: Check for any remaining references to `interestByAccount`, `interestLoading`, `InterestRecord`**

Search the file for these names. If `InterestRecord` is no longer imported or used, remove it from the import line. If any of these appear elsewhere in the file, address them accordingly — but based on the code reviewed, they should only be in the sections we already changed.

- [ ] **Step 9: Verify TypeScript**

```bash
cd /Users/telephant/projects/firewise/firewise-web
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
cd /Users/telephant/projects/firewise/firewise-web
git add src/app/(fire)/fire/page.tsx
git commit -m "feat: wire savings interest trend into dashboard chart"
```

---

## Self-Review Checklist

- [x] Backend endpoint `GET /fire/savings/interest-trend?year=YYYY` — Task 1 + Task 2
- [x] Historical months use real credited records — Task 1 Step 1 (histMap)
- [x] Future months use forecast (balance × rate / periods) — Task 1 Step 1 (forecastMap)
- [x] Currency conversion to USD — Task 1 Step 1 (toUsd map via Frankfurter)
- [x] Route registered before `/:id` to avoid conflict — Task 2 Step 1
- [x] No accounts → 12 zeros returned — Task 1 Step 1 (early return)
- [x] `year` param missing → defaults to current year — Task 1 Step 1
- [x] Frontend API method `savingsApi.interestTrend(year)` — Task 3
- [x] Dashboard wired up, old per-account fetch removed — Task 4
- [x] `chartReady` no longer depends on removed `interestLoading` — Task 4 Step 7
