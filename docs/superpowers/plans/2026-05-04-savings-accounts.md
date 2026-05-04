# Savings Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Savings Accounts module to the Fire module that lets users track fixed-deposit accounts, manually log interest received, and see a forecast of upcoming interest payouts.

**Architecture:** New `savings_accounts` and `interest_records` tables in Supabase; a `savings.controller.ts` + `savings.routes.ts` in firewise-api under `/fire/savings`; a new `/fire/savings` page in firewise-web with account cards and a detail drawer showing history + 12-period forecast. Follows the exact same patterns as the existing DCA module (controller, routes, api client, page).

**Tech Stack:** TypeScript/Express (API), Next.js App Router (frontend), Supabase (DB), Fire UI design system (`@/components/fire/ui`)

---

## File Map

**firewise-api (new/modified):**
- Create: `supabase/migrations/003_savings.sql` — DB tables
- Create: `src/controllers/savings.controller.ts` — CRUD for accounts + interest records + forecast enrichment
- Create: `src/routes/savings.routes.ts` — route definitions
- Modify: `src/routes/index.ts` — register `/fire/savings` routes
- Create: `tests/savings.test.ts` — unit tests for forecast logic

**firewise-web (new/modified):**
- Modify: `src/lib/fire/api.ts` — add `SavingsAccount`, `InterestRecord` types + `savingsApi`
- Modify: `src/components/fire/portfolio-sidebar.tsx` — add Savings nav item
- Create: `src/app/(fire)/fire/savings/page.tsx` — main page
- Create: `src/components/fire/savings-account-dialog.tsx` — add/edit account dialog
- Create: `src/components/fire/savings-interest-dialog.tsx` — add interest record dialog

---

## Task 1: Database Migration

**Files:**
- Create: `firewise-api/supabase/migrations/003_savings.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- firewise-api/supabase/migrations/003_savings.sql

CREATE TABLE savings_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  belong_id           UUID NOT NULL,
  name                TEXT NOT NULL,
  bank                TEXT,
  currency            TEXT NOT NULL DEFAULT 'USD',
  balance             NUMERIC(18,2) NOT NULL DEFAULT 0,
  interest_rate       NUMERIC(8,4) NOT NULL,
  compound_frequency  TEXT NOT NULL DEFAULT 'monthly'
                        CHECK (compound_frequency IN ('monthly','quarterly','semi_annual','annual')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX savings_accounts_belong_id_idx ON savings_accounts(belong_id);

CREATE TABLE interest_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID NOT NULL REFERENCES savings_accounts(id) ON DELETE CASCADE,
  amount       NUMERIC(18,2) NOT NULL,
  credited_at  DATE NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX interest_records_account_id_idx ON interest_records(account_id);
```

- [ ] **Step 2: Apply the migration**

Run in firewise-api directory:
```bash
npx supabase db push
```
Expected: migration applied without errors. Verify tables exist in Supabase dashboard.

- [ ] **Step 3: Commit**

```bash
cd /path/to/firewise-api
git add supabase/migrations/003_savings.sql
git commit -m "feat: add savings_accounts and interest_records tables"
```

---

## Task 2: API Controller (savings.controller.ts)

**Files:**
- Create: `firewise-api/src/controllers/savings.controller.ts`

The controller handles:
- `listAccounts` — fetch all accounts for `belongId`, enrich each with `last_credited_at`, `next_payout_date`, `next_payout_amount`, `total_interest_ytd`
- `createAccount` / `updateAccount` / `deleteAccount`
- `listInterest` / `addInterest` / `deleteInterest`

Forecast logic (pure function, exported for testing):
```
periodsPerYear: monthly=12, quarterly=4, semi_annual=2, annual=1
payoutAmount = balance * interest_rate / periodsPerYear
daysPerPeriod: monthly=30, quarterly=91, semi_annual=182, annual=365
nextPayoutDate = lastCreditedAt + daysPerPeriod (or createdAt if no records)
```

- [ ] **Step 1: Write the failing unit test for `computeForecast`**

Create `firewise-api/tests/savings.test.ts`:

```typescript
import { computeForecast, computeNextPayoutDate } from '../src/controllers/savings.controller';

describe('computeForecast', () => {
  it('monthly: returns correct payout amount', () => {
    const result = computeForecast(12000, 0.03, 'monthly');
    expect(result).toBeCloseTo(30, 2); // 12000 * 0.03 / 12 = 30
  });

  it('quarterly: returns correct payout amount', () => {
    const result = computeForecast(12000, 0.04, 'quarterly');
    expect(result).toBeCloseTo(120, 2); // 12000 * 0.04 / 4 = 120
  });

  it('semi_annual: returns correct payout amount', () => {
    const result = computeForecast(10000, 0.05, 'semi_annual');
    expect(result).toBeCloseTo(250, 2); // 10000 * 0.05 / 2 = 250
  });

  it('annual: returns correct payout amount', () => {
    const result = computeForecast(10000, 0.035, 'annual');
    expect(result).toBeCloseTo(350, 2); // 10000 * 0.035 / 1 = 350
  });
});

describe('computeNextPayoutDate', () => {
  it('monthly: advances by 30 days', () => {
    const result = computeNextPayoutDate('2025-01-01', 'monthly');
    expect(result).toBe('2025-01-31');
  });

  it('quarterly: advances by 91 days', () => {
    const result = computeNextPayoutDate('2025-01-01', 'quarterly');
    expect(result).toBe('2025-04-02');
  });

  it('semi_annual: advances by 182 days', () => {
    const result = computeNextPayoutDate('2025-01-01', 'semi_annual');
    expect(result).toBe('2025-07-02');
  });

  it('annual: advances by 365 days', () => {
    const result = computeNextPayoutDate('2025-01-01', 'annual');
    expect(result).toBe('2026-01-01');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd firewise-api
npx jest tests/savings.test.ts --no-coverage
```
Expected: FAIL — `computeForecast` and `computeNextPayoutDate` not found.

- [ ] **Step 3: Write the controller**

Create `firewise-api/src/controllers/savings.controller.ts`:

```typescript
import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { AppError } from '../middleware/error';
import { getViewContext } from '../utils/family-context';

// ── Types ──────────────────────────────────────────────────────────────────

export interface SavingsAccount {
  id: string;
  belong_id: string;
  name: string;
  bank: string | null;
  currency: string;
  balance: number;
  interest_rate: number;
  compound_frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Enriched fields
  last_credited_at: string | null;
  next_payout_date: string;
  next_payout_amount: number;
  total_interest_ytd: number;
}

export interface InterestRecord {
  id: string;
  account_id: string;
  amount: number;
  credited_at: string;
  notes: string | null;
  created_at: string;
}

export interface ForecastPeriod {
  period: number;       // 1-based index
  date: string;         // ISO date YYYY-MM-DD
  amount: number;
}

const PERIODS_PER_YEAR: Record<string, number> = {
  monthly: 12,
  quarterly: 4,
  semi_annual: 2,
  annual: 1,
};

const DAYS_PER_PERIOD: Record<string, number> = {
  monthly: 30,
  quarterly: 91,
  semi_annual: 182,
  annual: 365,
};

// ── Pure helpers (exported for testing) ───────────────────────────────────

export function computeForecast(
  balance: number,
  interestRate: number,
  frequency: string
): number {
  const periods = PERIODS_PER_YEAR[frequency] ?? 12;
  return balance * interestRate / periods;
}

export function computeNextPayoutDate(fromDate: string, frequency: string): string {
  const days = DAYS_PER_PERIOD[frequency] ?? 30;
  const d = new Date(fromDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildForecast(
  balance: number,
  interestRate: number,
  frequency: string,
  lastCreditedAt: string | null,
  createdAt: string,
  periods = 12
): ForecastPeriod[] {
  const payoutAmount = computeForecast(balance, interestRate, frequency);
  const baseDate = lastCreditedAt ?? createdAt.slice(0, 10);
  const result: ForecastPeriod[] = [];
  let currentDate = baseDate;
  for (let i = 1; i <= periods; i++) {
    currentDate = computeNextPayoutDate(currentDate, frequency);
    result.push({ period: i, date: currentDate, amount: payoutAmount });
  }
  return result;
}

// ── Controller functions ───────────────────────────────────────────────────

// GET /fire/savings
export const listAccounts = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<SavingsAccount[]>>
): Promise<void> => {
  try {
    const ctx = await getViewContext(req);

    const { data: accounts, error } = await supabaseAdmin
      .from('savings_accounts')
      .select('*')
      .eq('belong_id', ctx.belongId)
      .order('created_at', { ascending: false });

    if (error) throw new AppError('Failed to fetch savings accounts', 500);

    const accountIds = (accounts || []).map((a: { id: string }) => a.id);
    if (accountIds.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    // Fetch all interest records for these accounts
    const { data: records } = await supabaseAdmin
      .from('interest_records')
      .select('account_id, amount, credited_at')
      .in('account_id', accountIds);

    const allRecords: { account_id: string; amount: number; credited_at: string }[] = records || [];
    const currentYear = new Date().getFullYear();

    const enriched: SavingsAccount[] = (accounts || []).map((a: {
      id: string; belong_id: string; name: string; bank: string | null;
      currency: string; balance: number; interest_rate: number;
      compound_frequency: string; notes: string | null;
      created_at: string; updated_at: string;
    }) => {
      const acctRecords = allRecords.filter(r => r.account_id === a.id);
      const sorted = [...acctRecords].sort((x, y) => y.credited_at.localeCompare(x.credited_at));
      const lastCreditedAt = sorted[0]?.credited_at ?? null;
      const nextPayoutDate = computeNextPayoutDate(
        lastCreditedAt ?? a.created_at.slice(0, 10),
        a.compound_frequency
      );
      const nextPayoutAmount = computeForecast(a.balance, a.interest_rate, a.compound_frequency);
      const totalInterestYtd = acctRecords
        .filter(r => new Date(r.credited_at).getFullYear() === currentYear)
        .reduce((sum, r) => sum + r.amount, 0);

      return {
        ...a,
        compound_frequency: a.compound_frequency as SavingsAccount['compound_frequency'],
        last_credited_at: lastCreditedAt,
        next_payout_date: nextPayoutDate,
        next_payout_amount: nextPayoutAmount,
        total_interest_ytd: totalInterestYtd,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ success: false, error: err.message });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to fetch savings accounts' });
  }
};

// POST /fire/savings
export const createAccount = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<SavingsAccount>>
): Promise<void> => {
  try {
    const ctx = await getViewContext(req);
    const { name, bank, currency, balance, interest_rate, compound_frequency, notes } = req.body;

    if (!name || balance === undefined || interest_rate === undefined) {
      throw new AppError('name, balance, and interest_rate are required', 400);
    }

    const { data, error } = await supabaseAdmin
      .from('savings_accounts')
      .insert({
        belong_id: ctx.belongId,
        name,
        bank: bank || null,
        currency: currency || 'USD',
        balance: Number(balance),
        interest_rate: Number(interest_rate),
        compound_frequency: compound_frequency || 'monthly',
        notes: notes || null,
      })
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to create savings account', 500);

    res.status(201).json({
      success: true,
      data: {
        ...data,
        last_credited_at: null,
        next_payout_date: computeNextPayoutDate(data.created_at.slice(0, 10), data.compound_frequency),
        next_payout_amount: computeForecast(data.balance, data.interest_rate, data.compound_frequency),
        total_interest_ytd: 0,
      },
    });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ success: false, error: err.message });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to create savings account' });
  }
};

// PUT /fire/savings/:id
export const updateAccount = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<{ id: string }>>
): Promise<void> => {
  try {
    const ctx = await getViewContext(req);
    const { id } = req.params;
    const { name, bank, currency, balance, interest_rate, compound_frequency, notes } = req.body;

    const { data: existing } = await supabaseAdmin
      .from('savings_accounts')
      .select('id')
      .eq('id', id)
      .eq('belong_id', ctx.belongId)
      .single();

    if (!existing) throw new AppError('Savings account not found', 404);

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (bank !== undefined) updates.bank = bank || null;
    if (currency !== undefined) updates.currency = currency;
    if (balance !== undefined) updates.balance = Number(balance);
    if (interest_rate !== undefined) updates.interest_rate = Number(interest_rate);
    if (compound_frequency !== undefined) updates.compound_frequency = compound_frequency;
    if (notes !== undefined) updates.notes = notes || null;

    const { error } = await supabaseAdmin
      .from('savings_accounts')
      .update(updates)
      .eq('id', id);

    if (error) throw new AppError('Failed to update savings account', 500);

    res.json({ success: true, data: { id } });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ success: false, error: err.message });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to update savings account' });
  }
};

// DELETE /fire/savings/:id
export const deleteAccount = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<{ id: string }>>
): Promise<void> => {
  try {
    const ctx = await getViewContext(req);
    const { id } = req.params;

    const { data: existing } = await supabaseAdmin
      .from('savings_accounts')
      .select('id')
      .eq('id', id)
      .eq('belong_id', ctx.belongId)
      .single();

    if (!existing) throw new AppError('Savings account not found', 404);

    await supabaseAdmin.from('savings_accounts').delete().eq('id', id);

    res.json({ success: true, data: { id } });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ success: false, error: err.message });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to delete savings account' });
  }
};

// GET /fire/savings/:id/interest
export const listInterest = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<{ records: InterestRecord[]; forecast: ForecastPeriod[] }>>
): Promise<void> => {
  try {
    const ctx = await getViewContext(req);
    const { id } = req.params;

    const { data: account } = await supabaseAdmin
      .from('savings_accounts')
      .select('*')
      .eq('id', id)
      .eq('belong_id', ctx.belongId)
      .single();

    if (!account) throw new AppError('Savings account not found', 404);

    const { data: records, error } = await supabaseAdmin
      .from('interest_records')
      .select('*')
      .eq('account_id', id)
      .order('credited_at', { ascending: false });

    if (error) throw new AppError('Failed to fetch interest records', 500);

    const sorted = (records || []).sort((a: { credited_at: string }, b: { credited_at: string }) =>
      b.credited_at.localeCompare(a.credited_at)
    );
    const lastCreditedAt = sorted[0]?.credited_at ?? null;

    const forecast = buildForecast(
      account.balance,
      account.interest_rate,
      account.compound_frequency,
      lastCreditedAt,
      account.created_at,
      12
    );

    res.json({ success: true, data: { records: records || [], forecast } });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ success: false, error: err.message });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to fetch interest records' });
  }
};

// POST /fire/savings/:id/interest
export const addInterest = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<InterestRecord>>
): Promise<void> => {
  try {
    const ctx = await getViewContext(req);
    const { id } = req.params;
    const { amount, credited_at, notes } = req.body;

    if (!amount || !credited_at) {
      throw new AppError('amount and credited_at are required', 400);
    }

    const { data: account } = await supabaseAdmin
      .from('savings_accounts')
      .select('id')
      .eq('id', id)
      .eq('belong_id', ctx.belongId)
      .single();

    if (!account) throw new AppError('Savings account not found', 404);

    const { data, error } = await supabaseAdmin
      .from('interest_records')
      .insert({ account_id: id, amount: Number(amount), credited_at, notes: notes || null })
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to add interest record', 500);

    res.status(201).json({ success: true, data });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ success: false, error: err.message });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to add interest record' });
  }
};

// DELETE /fire/savings/:id/interest/:recordId
export const deleteInterest = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<{ id: string }>>
): Promise<void> => {
  try {
    const ctx = await getViewContext(req);
    const { id, recordId } = req.params;

    // Verify account ownership
    const { data: account } = await supabaseAdmin
      .from('savings_accounts')
      .select('id')
      .eq('id', id)
      .eq('belong_id', ctx.belongId)
      .single();

    if (!account) throw new AppError('Savings account not found', 404);

    await supabaseAdmin
      .from('interest_records')
      .delete()
      .eq('id', recordId)
      .eq('account_id', id);

    res.json({ success: true, data: { id: recordId } });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ success: false, error: err.message });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to delete interest record' });
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd firewise-api
npx jest tests/savings.test.ts --no-coverage
```
Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/controllers/savings.controller.ts tests/savings.test.ts
git commit -m "feat: add savings controller with forecast logic and unit tests"
```

---

## Task 3: API Routes + Registration

**Files:**
- Create: `firewise-api/src/routes/savings.routes.ts`
- Modify: `firewise-api/src/routes/index.ts`

- [ ] **Step 1: Create the routes file**

```typescript
// firewise-api/src/routes/savings.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
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

router.get('/:id/interest', listInterest);
router.post('/:id/interest', addInterest);
router.delete('/:id/interest/:recordId', deleteInterest);

export default router;
```

- [ ] **Step 2: Register in index.ts**

In `firewise-api/src/routes/index.ts`, add after the `import commodityRoutes` line:

```typescript
import savingsRoutes from './savings.routes';
```

And add after `router.use('/fire/commodities', commodityRoutes);`:

```typescript
router.use('/fire/savings', savingsRoutes);
```

- [ ] **Step 3: Verify API starts without errors**

```bash
cd firewise-api
npm run dev
```
Expected: Server starts, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/savings.routes.ts src/routes/index.ts
git commit -m "feat: register savings routes at /fire/savings"
```

---

## Task 4: Frontend API Client Types

**Files:**
- Modify: `firewise-web/src/lib/fire/api.ts`

- [ ] **Step 1: Add types and `savingsApi` to api.ts**

After the `ExchangeRates` interface (around line 229), add:

```typescript
export interface SavingsAccount {
  id: string;
  belong_id: string;
  name: string;
  bank: string | null;
  currency: string;
  balance: number;
  interest_rate: number;
  compound_frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  notes: string | null;
  created_at: string;
  updated_at: string;
  last_credited_at: string | null;
  next_payout_date: string;
  next_payout_amount: number;
  total_interest_ytd: number;
}

export interface InterestRecord {
  id: string;
  account_id: string;
  amount: number;
  credited_at: string;
  notes: string | null;
  created_at: string;
}

export interface ForecastPeriod {
  period: number;
  date: string;
  amount: number;
}

export interface CreateSavingsAccountData {
  name: string;
  bank?: string;
  currency: string;
  balance: number;
  interest_rate: number;
  compound_frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  notes?: string;
}
```

After the existing `dcaApi` object, add:

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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd firewise-web
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/fire/api.ts
git commit -m "feat: add SavingsAccount types and savingsApi client"
```

---

## Task 5: Sidebar Navigation

**Files:**
- Modify: `firewise-web/src/components/fire/portfolio-sidebar.tsx`

- [ ] **Step 1: Add Savings nav item**

In `portfolio-sidebar.tsx`, add to the `navItems` array after the Portfolios item (around line 47):

```typescript
{
  label: 'Savings',
  href: '/fire/savings',
  icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
},
```

- [ ] **Step 2: Verify sidebar renders**

Start dev server and navigate to `/fire` — confirm "Savings" appears in sidebar between Portfolios and Family, with correct active state on `/fire/savings`.

- [ ] **Step 3: Commit**

```bash
git add src/components/fire/portfolio-sidebar.tsx
git commit -m "feat: add Savings nav item to portfolio sidebar"
```

---

## Task 6: Add/Edit Account Dialog

**Files:**
- Create: `firewise-web/src/components/fire/savings-account-dialog.tsx`

- [ ] **Step 1: Create the dialog component**

```tsx
// firewise-web/src/components/fire/savings-account-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { colors, Button, Input } from '@/components/fire/ui';
import { savingsApi, SavingsAccount, CreateSavingsAccountData } from '@/lib/fire/api';

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'SGD', 'HKD', 'JPY', 'CNY', 'AUD', 'CAD', 'CHF'];
const FREQUENCY_OPTIONS: { value: CreateSavingsAccountData['compound_frequency']; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
];

interface Props {
  account?: SavingsAccount;
  onSuccess: (account: SavingsAccount) => void;
  onClose: () => void;
}

export function SavingsAccountDialog({ account, onSuccess, onClose }: Props) {
  const isEdit = !!account;
  const [form, setForm] = useState<CreateSavingsAccountData>({
    name: account?.name ?? '',
    bank: account?.bank ?? '',
    currency: account?.currency ?? 'USD',
    balance: account?.balance ?? 0,
    interest_rate: account ? account.interest_rate * 100 : 0, // store as % in UI
    compound_frequency: account?.compound_frequency ?? 'monthly',
    notes: account?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (form.balance < 0) { setError('Balance cannot be negative'); return; }
    if (form.interest_rate <= 0) { setError('Interest rate must be greater than 0'); return; }

    setSaving(true);
    setError('');

    const payload: CreateSavingsAccountData = {
      ...form,
      interest_rate: form.interest_rate / 100, // convert % → decimal for API
      bank: form.bank || undefined,
      notes: form.notes || undefined,
    };

    const res = isEdit
      ? await savingsApi.update(account!.id, payload)
      : await savingsApi.create(payload);

    setSaving(false);

    if (!res.success) {
      setError(res.error || 'Failed to save account');
      return;
    }

    if (isEdit) {
      // Merge updated fields into existing account object
      onSuccess({ ...account!, ...payload, interest_rate: payload.interest_rate });
    } else {
      onSuccess(res.data as SavingsAccount);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 24,
        width: 420,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: colors.text, fontSize: 16, fontWeight: 600, margin: 0 }}>
            {isEdit ? 'Edit Account' : 'Add Savings Account'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        {/* Name */}
        <div>
          <label style={{ color: colors.muted, fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>NAME *</label>
          <Input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. DBS Fixed Deposit"
          />
        </div>

        {/* Bank */}
        <div>
          <label style={{ color: colors.muted, fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>BANK</label>
          <Input
            value={form.bank ?? ''}
            onChange={e => setForm(f => ({ ...f, bank: e.target.value }))}
            placeholder="e.g. DBS Bank"
          />
        </div>

        {/* Currency + Balance */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: colors.muted, fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>CURRENCY</label>
            <select
              value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 6,
                backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}`,
                color: colors.text, fontSize: 13,
              }}
            >
              {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 2 }}>
            <label style={{ color: colors.muted, fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>BALANCE *</label>
            <Input
              type="number"
              value={form.balance}
              onChange={e => setForm(f => ({ ...f, balance: Number(e.target.value) }))}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Interest Rate + Frequency */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: colors.muted, fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>RATE % / YEAR *</label>
            <Input
              type="number"
              step="0.01"
              value={form.interest_rate}
              onChange={e => setForm(f => ({ ...f, interest_rate: Number(e.target.value) }))}
              placeholder="3.50"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ color: colors.muted, fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>PAYOUT</label>
            <select
              value={form.compound_frequency}
              onChange={e => setForm(f => ({ ...f, compound_frequency: e.target.value as CreateSavingsAccountData['compound_frequency'] }))}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 6,
                backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}`,
                color: colors.text, fontSize: 13,
              }}
            >
              {FREQUENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={{ color: colors.muted, fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>NOTES</label>
          <Input
            value={form.notes ?? ''}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Optional notes"
          />
        </div>

        {error && <p style={{ color: colors.negative, fontSize: 12, margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Add Account'}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd firewise-web
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/fire/savings-account-dialog.tsx
git commit -m "feat: add SavingsAccountDialog for create/edit"
```

---

## Task 7: Add Interest Record Dialog

**Files:**
- Create: `firewise-web/src/components/fire/savings-interest-dialog.tsx`

- [ ] **Step 1: Create the dialog**

```tsx
// firewise-web/src/components/fire/savings-interest-dialog.tsx
'use client';

import { useState } from 'react';
import { colors, Button, Input } from '@/components/fire/ui';
import { savingsApi, InterestRecord } from '@/lib/fire/api';

interface Props {
  accountId: string;
  onSuccess: (record: InterestRecord) => void;
  onClose: () => void;
}

export function SavingsInterestDialog({ accountId, onSuccess, onClose }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState('');
  const [creditedAt, setCreditedAt] = useState(today);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError('Amount must be greater than 0'); return; }
    if (!creditedAt) { setError('Date is required'); return; }

    setSaving(true);
    setError('');
    const res = await savingsApi.addInterest(accountId, {
      amount: amt,
      credited_at: creditedAt,
      notes: notes || undefined,
    });
    setSaving(false);

    if (!res.success) {
      setError(res.error || 'Failed to add interest record');
      return;
    }
    onSuccess(res.data as InterestRecord);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 24,
        width: 360,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: colors.text, fontSize: 16, fontWeight: 600, margin: 0 }}>Log Interest Received</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        <div>
          <label style={{ color: colors.muted, fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>AMOUNT *</label>
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </div>

        <div>
          <label style={{ color: colors.muted, fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>DATE *</label>
          <Input
            type="date"
            value={creditedAt}
            onChange={e => setCreditedAt(e.target.value)}
          />
        </div>

        <div>
          <label style={{ color: colors.muted, fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>NOTES</label>
          <Input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </div>

        {error && <p style={{ color: colors.negative, fontSize: 12, margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Log Interest'}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/fire/savings-interest-dialog.tsx
git commit -m "feat: add SavingsInterestDialog for logging received interest"
```

---

## Task 8: Savings Main Page

**Files:**
- Create: `firewise-web/src/app/(fire)/fire/savings/page.tsx`

This is the main page. Layout:
- Header row: title "Savings" + summary stats (total balance YTD interest) + "Add Account" button
- Account cards (one per account): bank, name, balance, rate, next payout
- Clicking a card expands an inline detail panel with two tabs: "History" and "Forecast"
- History tab: table of interest records + "Log Interest" button + delete
- Forecast tab: table of next 12 periods

- [ ] **Step 1: Create the page**

```tsx
// firewise-web/src/app/(fire)/fire/savings/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { colors, Button, Loader } from '@/components/fire/ui';
import { savingsApi, SavingsAccount, InterestRecord, ForecastPeriod } from '@/lib/fire/api';
import { useCurrency } from '@/components/fire/currency-context';
import { SavingsAccountDialog } from '@/components/fire/savings-account-dialog';
import { SavingsInterestDialog } from '@/components/fire/savings-interest-dialog';

const FREQ_LABEL: Record<string, string> = {
  monthly: 'Monthly', quarterly: 'Quarterly', semi_annual: 'Semi-Annual', annual: 'Annual',
};

function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
}

interface DetailState {
  records: InterestRecord[];
  forecast: ForecastPeriod[];
  loading: boolean;
  tab: 'history' | 'forecast';
}

export default function SavingsPage() {
  const { fmt: fmtDisplay } = useCurrency();
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountDialog, setAccountDialog] = useState<{ open: boolean; account?: SavingsAccount }>({ open: false });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailMap, setDetailMap] = useState<Record<string, DetailState>>({});
  const [interestDialog, setInterestDialog] = useState<{ open: boolean; accountId: string }>({ open: false, accountId: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    savingsApi.list().then(res => {
      if (res.success && res.data) setAccounts(res.data);
      setLoading(false);
    });
  }, []);

  const loadDetail = useCallback(async (accountId: string) => {
    setDetailMap(m => ({ ...m, [accountId]: { records: [], forecast: [], loading: true, tab: m[accountId]?.tab ?? 'history' } }));
    const res = await savingsApi.listInterest(accountId);
    if (res.success && res.data) {
      setDetailMap(m => ({
        ...m,
        [accountId]: { records: res.data!.records, forecast: res.data!.forecast, loading: false, tab: m[accountId]?.tab ?? 'history' },
      }));
    }
  }, []);

  const handleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!detailMap[id]) loadDetail(id);
  };

  const handleAccountSuccess = (account: SavingsAccount) => {
    setAccounts(prev => {
      const idx = prev.findIndex(a => a.id === account.id);
      return idx >= 0 ? prev.map(a => a.id === account.id ? account : a) : [account, ...prev];
    });
    setAccountDialog({ open: false });
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Delete this savings account? All interest records will also be removed.')) return;
    setDeletingId(id);
    const res = await savingsApi.delete(id);
    setDeletingId(null);
    if (res.success) {
      setAccounts(prev => prev.filter(a => a.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
  };

  const handleInterestSuccess = (accountId: string, record: InterestRecord) => {
    setDetailMap(m => ({
      ...m,
      [accountId]: { ...m[accountId], records: [record, ...(m[accountId]?.records ?? [])] },
    }));
    // Update last_credited_at and next_payout_date on the account card
    setAccounts(prev => prev.map(a => {
      if (a.id !== accountId) return a;
      const isNewer = !a.last_credited_at || record.credited_at > a.last_credited_at;
      return isNewer ? { ...a, last_credited_at: record.credited_at } : a;
    }));
    setInterestDialog({ open: false, accountId: '' });
    // Reload forecast since last_credited_at changed
    loadDetail(accountId);
  };

  const handleDeleteInterest = async (accountId: string, recordId: string) => {
    const res = await savingsApi.deleteInterest(accountId, recordId);
    if (res.success) {
      setDetailMap(m => ({
        ...m,
        [accountId]: { ...m[accountId], records: m[accountId].records.filter(r => r.id !== recordId) },
      }));
      loadDetail(accountId); // reload forecast
    }
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalYtd = accounts.reduce((sum, a) => sum + a.total_interest_ytd, 0);

  if (loading) {
    return (
      <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size="md" variant="bar" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Savings</h1>
          <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
            <span style={{ color: colors.muted, fontSize: 12 }}>
              Total Balance: <span style={{ color: colors.text, fontWeight: 600 }}>{fmtDisplay(totalBalance)}</span>
            </span>
            <span style={{ color: colors.muted, fontSize: 12 }}>
              Interest YTD: <span style={{ color: colors.positive, fontWeight: 600 }}>{fmtDisplay(totalYtd)}</span>
            </span>
          </div>
        </div>
        <Button onClick={() => setAccountDialog({ open: true })} style={{ fontSize: 13, height: 34, padding: '0 16px' }}>
          + Add Account
        </Button>
      </div>

      {/* Account list */}
      {accounts.length === 0 ? (
        <div style={{ textAlign: 'center', color: colors.muted, fontSize: 14, marginTop: 80 }}>
          No savings accounts yet. Add one to get started.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {accounts.map(account => {
            const isExpanded = expandedId === account.id;
            const detail = detailMap[account.id];
            return (
              <div key={account.id} style={{
                backgroundColor: colors.surface,
                border: `1px solid ${isExpanded ? colors.accent : colors.border}`,
                borderRadius: 10,
                overflow: 'hidden',
                transition: 'border-color 0.15s',
              }}>
                {/* Card header */}
                <div
                  onClick={() => handleExpand(account.id)}
                  style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', cursor: 'pointer', gap: 12 }}
                >
                  {/* Bank + name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: colors.text, fontWeight: 600, fontSize: 14 }}>{account.name}</div>
                    {account.bank && <div style={{ color: colors.muted, fontSize: 12 }}>{account.bank}</div>}
                  </div>

                  {/* Balance */}
                  <div style={{ textAlign: 'right', minWidth: 100 }}>
                    <div style={{ color: colors.text, fontWeight: 700, fontSize: 15 }}>{fmt(account.balance, account.currency)}</div>
                    <div style={{ color: colors.muted, fontSize: 11 }}>{account.currency}</div>
                  </div>

                  {/* Rate */}
                  <div style={{ textAlign: 'center', minWidth: 80 }}>
                    <div style={{ color: colors.info, fontWeight: 600, fontSize: 14 }}>{(account.interest_rate * 100).toFixed(2)}%</div>
                    <div style={{ color: colors.muted, fontSize: 11 }}>{FREQ_LABEL[account.compound_frequency]}</div>
                  </div>

                  {/* Next payout */}
                  <div style={{ textAlign: 'right', minWidth: 120 }}>
                    <div style={{ color: colors.positive, fontWeight: 600, fontSize: 13 }}>+{fmt(account.next_payout_amount, account.currency)}</div>
                    <div style={{ color: colors.muted, fontSize: 11 }}>{account.next_payout_date}</div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setAccountDialog({ open: true, account })}
                      style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '4px 8px', color: colors.muted, cursor: 'pointer', fontSize: 11 }}
                    >Edit</button>
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      disabled={deletingId === account.id}
                      style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '4px 8px', color: colors.negative, cursor: 'pointer', fontSize: 11 }}
                    >{deletingId === account.id ? '…' : 'Delete'}</button>
                  </div>

                  {/* Chevron */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth="2"
                    style={{ flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${colors.border}`, padding: '16px' }}>
                    {/* Tab switcher */}
                    <div style={{ display: 'flex', gap: 2, marginBottom: 14, backgroundColor: colors.surfaceLight, borderRadius: 8, padding: 3, border: `1px solid ${colors.border}`, width: 'fit-content' }}>
                      {(['history', 'forecast'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setDetailMap(m => ({ ...m, [account.id]: { ...m[account.id], tab } }))}
                          style={{
                            padding: '4px 14px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                            backgroundColor: detail?.tab === tab ? colors.surface : 'transparent',
                            color: detail?.tab === tab ? colors.text : colors.muted,
                            boxShadow: detail?.tab === tab ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                          }}
                        >
                          {tab === 'history' ? 'History' : 'Forecast'}
                        </button>
                      ))}
                    </div>

                    {detail?.loading ? (
                      <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}><Loader size="sm" variant="dots" /></div>
                    ) : detail?.tab === 'history' ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                          <Button
                            variant="outline"
                            onClick={() => setInterestDialog({ open: true, accountId: account.id })}
                            style={{ fontSize: 12, height: 28, padding: '0 12px' }}
                          >+ Log Interest</Button>
                        </div>
                        {detail.records.length === 0 ? (
                          <p style={{ color: colors.muted, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No interest records yet.</p>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr>
                                {['Date', 'Amount', 'Notes', ''].map(h => (
                                  <th key={h} style={{ textAlign: h === 'Amount' ? 'right' : 'left', color: colors.muted, fontWeight: 500, fontSize: 11, padding: '4px 8px', borderBottom: `1px solid ${colors.border}` }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {detail.records.map(r => (
                                <tr key={r.id}>
                                  <td style={{ padding: '8px', color: colors.text }}>{r.credited_at}</td>
                                  <td style={{ padding: '8px', color: colors.positive, textAlign: 'right', fontWeight: 600 }}>+{fmt(r.amount, account.currency)}</td>
                                  <td style={{ padding: '8px', color: colors.muted }}>{r.notes || '—'}</td>
                                  <td style={{ padding: '8px', textAlign: 'right' }}>
                                    <button
                                      onClick={() => handleDeleteInterest(account.id, r.id)}
                                      style={{ background: 'none', border: 'none', color: colors.negative, cursor: 'pointer', fontSize: 12 }}
                                    >Delete</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 10px' }}>Estimated based on current balance and rate. Amounts shown in {account.currency}.</p>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr>
                              {['Period', 'Expected Date', 'Estimated Amount'].map((h, i) => (
                                <th key={h} style={{ textAlign: i === 2 ? 'right' : 'left', color: colors.muted, fontWeight: 500, fontSize: 11, padding: '4px 8px', borderBottom: `1px solid ${colors.border}` }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(detail?.forecast ?? []).map(f => (
                              <tr key={f.period}>
                                <td style={{ padding: '8px', color: colors.muted }}>#{f.period}</td>
                                <td style={{ padding: '8px', color: colors.text }}>{f.date}</td>
                                <td style={{ padding: '8px', color: colors.positive, textAlign: 'right', fontWeight: 600 }}>~{fmt(f.amount, account.currency)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      {accountDialog.open && (
        <SavingsAccountDialog
          account={accountDialog.account}
          onSuccess={handleAccountSuccess}
          onClose={() => setAccountDialog({ open: false })}
        />
      )}
      {interestDialog.open && (
        <SavingsInterestDialog
          accountId={interestDialog.accountId}
          onSuccess={record => handleInterestSuccess(interestDialog.accountId, record)}
          onClose={() => setInterestDialog({ open: false, accountId: '' })}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd firewise-web
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Manual smoke test**

Navigate to `/fire/savings`:
- Page loads with empty state message
- "Add Account" button opens dialog
- Create an account → card appears with balance, rate, next payout date
- Click card → expands, History tab shows "No interest records yet"
- "Log Interest" → opens dialog, submit → record appears in table
- Switch to Forecast tab → 12 periods shown with dates and amounts
- Edit account → dialog pre-filled → save → card updates
- Delete account → confirmation → card removed

- [ ] **Step 4: Commit**

```bash
git add src/app/\(fire\)/fire/savings/page.tsx
git commit -m "feat: add Savings page with account cards, interest history, and forecast"
```

---

## Self-Review

**Spec coverage check:**
- ✅ `savings_accounts` table — Task 1
- ✅ `interest_records` table — Task 1
- ✅ API endpoints (list/create/update/delete accounts, list/add/delete interest) — Tasks 2–3
- ✅ Frontend types + `savingsApi` — Task 4
- ✅ Sidebar nav entry — Task 5
- ✅ Add/edit account dialog — Task 6
- ✅ Log interest dialog — Task 7
- ✅ Main page with cards + expand + history + forecast — Task 8
- ✅ Multi-currency: each account has its own currency, header uses `fmtDisplay` — Task 8
- ✅ Family support: `belong_id` from `getViewContext` — Task 2
- ✅ Forecast: 12 periods, labeled "Estimated" — Tasks 2 + 8
- ✅ `interest_rate` stored as decimal (0.035), shown as % (3.5%) in UI — Tasks 6 + 8
- ✅ Unit tests for `computeForecast` and `computeNextPayoutDate` — Task 2

**Placeholder scan:** None found.

**Type consistency:**
- `SavingsAccount.compound_frequency`: defined in controller + api.ts + page — consistent
- `ForecastPeriod.{ period, date, amount }`: defined in controller + api.ts + page — consistent
- `savingsApi.listInterest` returns `{ records, forecast }` — matches controller response shape
- `interest_rate` as decimal throughout API layer; only `× 100` / `÷ 100` in dialog UI — consistent
