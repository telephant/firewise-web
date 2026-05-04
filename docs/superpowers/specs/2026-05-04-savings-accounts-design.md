# Savings Accounts Feature — Design Spec

## Goal

A lightweight module for tracking fixed-deposit / savings accounts with manual interest recording and automated interest forecasting.

## Background & Use Case

The user manages multiple fixed-deposit accounts across banks, each with different interest rates and payout frequencies (monthly, quarterly, etc.). Previously managed in the legacy assets system — too heavy. The new module should be simple: record accounts, log actual interest received, and forecast upcoming payouts.

Interest income is kept **separate from dividends** intentionally. Future aggregation (passive income dashboard) will happen at the dashboard layer.

---

## Architecture

### Backend (firewise-api)

#### New Database Tables

**`savings_accounts`**
```sql
CREATE TABLE savings_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  belong_id   UUID NOT NULL,  -- user_id or family_id (same pattern as portfolios)
  name        TEXT NOT NULL,
  bank        TEXT,
  currency    TEXT NOT NULL DEFAULT 'USD',
  balance     NUMERIC(18,2) NOT NULL DEFAULT 0,
  interest_rate NUMERIC(8,4) NOT NULL,  -- annual rate as decimal e.g. 0.035 = 3.5%
  compound_frequency TEXT NOT NULL DEFAULT 'monthly',  -- monthly | quarterly | semi_annual | annual
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**`interest_records`**
```sql
CREATE TABLE interest_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID NOT NULL REFERENCES savings_accounts(id) ON DELETE CASCADE,
  amount      NUMERIC(18,2) NOT NULL,
  credited_at DATE NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### API Endpoints

```
GET    /fire/savings                          → list accounts (with last_credited_at, next_payout)
POST   /fire/savings                          → create account
PUT    /fire/savings/:id                      → update account
DELETE /fire/savings/:id                      → delete account

GET    /fire/savings/:id/interest             → list interest records (paginated)
POST   /fire/savings/:id/interest             → add interest record
DELETE /fire/savings/:id/interest/:recordId   → delete interest record
```

#### Forecast Logic (server-side)

Payout per period = `balance × interest_rate / periods_per_year`

Where `periods_per_year`:
- monthly → 12
- quarterly → 4
- semi_annual → 2
- annual → 1

Next payout date is computed from `last credited_at` + one period. If no records exist, computed from `created_at`.

The list endpoint enriches each account with:
- `last_credited_at` — most recent interest record date
- `next_payout_date` — computed next expected date
- `next_payout_amount` — computed payout amount for that period
- `total_interest_ytd` — sum of interest records this calendar year

---

### Frontend (firewise-web)

#### Navigation

Add **Savings** to `PortfolioSidebar` below Portfolios:
```
Portfolios
Savings      ← new
Family
DCA
```

Route: `/fire/savings`

#### Pages / Components

**`/fire/savings` — Main Page**

Layout: two-panel or single-column list

Top section: summary stats row
- Total balance across all accounts (converted to user's display currency)
- Total interest YTD
- Next payout (soonest upcoming, date + amount)

Account cards (one per savings account):
- Bank name + account name
- Balance + currency + interest rate (e.g. "3.50% / month")
- Next payout: date + estimated amount (in native currency)
- Click → opens detail drawer/panel

**Account Detail (drawer or inline expand)**

Two sections:

1. **Interest History** — table of past records
   - Columns: Date | Amount | Notes | Delete
   - "Add Interest" button → inline form (date, amount, notes)

2. **Forecast** — next 12 periods
   - Table: Period | Expected Date | Estimated Amount
   - Amounts shown in account's native currency
   - Clearly labeled "Estimated" / forecasted

**Add / Edit Account Dialog**
Fields:
- Name (required)
- Bank
- Currency (dropdown)
- Balance (required)
- Interest Rate % (required, stored as decimal)
- Compound Frequency (monthly / quarterly / semi-annual / annual)
- Notes

---

## Data Flow

```
User creates savings account
  → POST /fire/savings
  → stored in savings_accounts

User manually records interest received
  → POST /fire/savings/:id/interest
  → stored in interest_records

Frontend fetches account list
  → GET /fire/savings
  → backend enriches with next_payout_date, next_payout_amount, total_interest_ytd
  → frontend renders cards + forecast table
```

---

## Design Constraints

- **No automatic balance updates** when interest is recorded — user manages balance manually
- **No compound interest calculation** for forecast — simple `balance × rate / periods` per period (user updates balance when they renew)
- **Multi-currency** — each account has its own currency; summary stats convert to user's display currency via existing exchange rate infrastructure
- **Family support** — uses same `belong_id` pattern as portfolios (works for personal and family views)
- **Fire UI only** — all components use `@/components/fire/ui`, no shadcn

---

## Out of Scope

- Automatic interest accrual or compound interest modeling
- Integration with dividend calendar
- Notifications / reminders for upcoming payouts
- Import from bank statements
