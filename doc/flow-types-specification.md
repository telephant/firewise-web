# Flow Types Specification

## Overview

Each flow type displays different fields and calculations in the Flows table. This document specifies what to show for each category.

---

## Flow Categories Summary

| Group | Categories |
|-------|------------|
| **Money In** | salary, bonus, freelance, rental, gift, dividend, interest |
| **Money Out** | expense, invest, pay_debt |
| **Move Money** | transfer, deposit, sell, reinvest |
| **Add Debt** | add_mortgage, add_loan |
| **Other** | other |

---

## Table Display Fields

### Standard Columns (All Flows)

| Column | Description |
|--------|-------------|
| Date | Flow date |
| Category | Icon + label |
| From → To | Source and destination |
| Amount | Signed amount |
| Actions | Edit / Delete menu |

### Additional Display (Per Flow Type)

Shown as secondary line or badge in the row.

---

## Money In Flows

### 1. Salary

```
┌─────────────────────────────────────────────────────────────────┐
│ Jan 15    │ 💰 Salary  │ Employer → Chase Bank     │   +$8,000 │
│           │            │ Recurring: Monthly                    │
└─────────────────────────────────────────────────────────────────┘
```

| Field | Source | Display |
|-------|--------|---------|
| From | `metadata.source_name` or "Employer" | External source name |
| To | `to_asset.name` | Destination bank account |
| Amount | `amount` | Green, positive |
| Recurring | `recurring_frequency` | Badge if not "none" |

**Calculations:** None

---

### 2. Bonus

```
┌─────────────────────────────────────────────────────────────────┐
│ Dec 20    │ 🎉 Bonus   │ Work → Chase Bank         │   +$5,000 │
└─────────────────────────────────────────────────────────────────┘
```

| Field | Source | Display |
|-------|--------|---------|
| From | `metadata.source_name` or "Work" | External source name |
| To | `to_asset.name` | Destination bank account |
| Amount | `amount` | Green, positive |

**Calculations:** None

---

### 3. Freelance

```
┌─────────────────────────────────────────────────────────────────┐
│ Jan 10    │ 💼 Freelance │ Client ABC → Chase Bank │   +$2,500 │
└─────────────────────────────────────────────────────────────────┘
```

| Field | Source | Display |
|-------|--------|---------|
| From | `metadata.source_name` or "Client" | Client name |
| To | `to_asset.name` | Destination bank account |
| Amount | `amount` | Green, positive |

**Calculations:** None

---

### 4. Rental

```
┌─────────────────────────────────────────────────────────────────┐
│ Jan 01    │ 🏠 Rental  │ 123 Main St → Chase Bank  │   +$2,000 │
│           │            │ Recurring: Monthly                    │
└─────────────────────────────────────────────────────────────────┘
```

| Field | Source | Display |
|-------|--------|---------|
| From | `from_asset.name` | Property name (real_estate asset) |
| To | `to_asset.name` | Destination bank account |
| Amount | `amount` | Green, positive |
| Recurring | `recurring_frequency` | Badge if not "none" |

**Calculations:** None (yield calculated on Assets page)

---

### 5. Gift

```
┌─────────────────────────────────────────────────────────────────┐
│ Dec 25    │ 🎁 Gift    │ Parents → Chase Bank      │     +$500 │
└─────────────────────────────────────────────────────────────────┘
```

| Field | Source | Display |
|-------|--------|---------|
| From | `metadata.source_name` or "Family" | Gift source |
| To | `to_asset.name` | Destination bank account |
| Amount | `amount` | Green, positive |

**Calculations:** None

---

### 6. Dividend

```
┌─────────────────────────────────────────────────────────────────┐
│ Jan 05    │ 💸 Dividend │ AAPL (50 shares) → Fidelity │   +$150 │
│           │             │ Gross: $150  Tax: $22  Net: $128     │
│           │             │ Yield: 0.8%  │  Total P/L: +$2,340   │
└─────────────────────────────────────────────────────────────────┘
```

| Field | Source | Display |
|-------|--------|---------|
| From | `from_asset.name` + `from_asset.ticker` | Stock/ETF name with ticker |
| Shares | `from_asset.metadata.shares` | Number of shares held |
| To | `to_asset.name` | Cash account receiving dividend |
| Gross Amount | `amount` | Gross dividend amount |
| Tax | Calculated from `user_tax_settings` | Tax withheld |
| Net Amount | `amount - tax` | Net after tax |
| Yield | `(dividend / share_price) * 100` | Dividend yield % |
| Total P/L | `from_asset.total_realized_pl` | Cumulative P/L on this stock |

**Calculations:**
```typescript
tax = amount * user_tax_settings.dividend_tax_rate
net = amount - tax
yield = (amount / (shares * current_price)) * 100
```

---

### 7. Interest

```
┌─────────────────────────────────────────────────────────────────┐
│ Jan 31    │ 💵 Interest │ High-Yield Savings        │     +$45 │
│           │             │ APY: 4.5%                           │
└─────────────────────────────────────────────────────────────────┘
```

| Field | Source | Display |
|-------|--------|---------|
| From/To | `from_asset.name` | Same asset (deposit) |
| Amount | `amount` | Green, positive |
| APY | `from_asset.metadata.apy` | Annual percentage yield |

**Calculations:**
```typescript
// Interest adds to same asset balance
// APY is informational from asset metadata
```

---

## Money Out Flows

### 8. Expense

```
┌─────────────────────────────────────────────────────────────────┐
│ Jan 12    │ 💳 Expense │ Chase Bank → Amazon        │    -$156 │
│           │            │ Category: Shopping                    │
│           │            │ 📎 Linked: Personal Ledger (3 items)  │
└─────────────────────────────────────────────────────────────────┘
```

| Field | Source | Display |
|-------|--------|---------|
| From | `from_asset.name` | Source bank/cash account |
| To | `description` or "External" | Expense destination |
| Amount | `amount` | Red, negative |
| Category | `flow_expense_category.name` | Expense category |
| Linked Ledger | `metadata.linked_ledger` | If linked to expense tracker |

**Calculations:** None

---

### 9. Invest

```
┌─────────────────────────────────────────────────────────────────┐
│ Jan 08    │ 📈 Invest  │ Chase Bank → VTI           │  -$2,000 │
│           │            │ Bought: 12.5 shares @ $160.00         │
│           │            │ Total Holdings: 150.5 shares          │
└─────────────────────────────────────────────────────────────────┘
```

| Field | Source | Display |
|-------|--------|---------|
| From | `from_asset.name` | Source cash account |
| To | `to_asset.name` + `to_asset.ticker` | Investment asset |
| Amount | `amount` | Red (money leaving cash) |
| Shares | `metadata.shares` | Number of shares bought |
| Price | `metadata.price_per_share` | Price per share |
| Total Holdings | `to_asset.balance` | Current total shares owned |

**Calculations:**
```typescript
shares = amount / price_per_share
// or
price_per_share = amount / shares
```

---

### 10. Pay Debt

```
┌─────────────────────────────────────────────────────────────────┐
│ Jan 01    │ 🏦 Pay Debt │ Chase Bank → Home Mortgage │  -$2,100 │
│           │             │ Principal: $1,800  Interest: $300    │
│           │             │ Remaining: $285,000 (94.5%)          │
└─────────────────────────────────────────────────────────────────┘
```

| Field | Source | Display |
|-------|--------|---------|
| From | `from_asset.name` | Source cash account |
| To | `debt.name` | Debt being paid |
| Amount | `amount` | Red, negative |
| Principal | `metadata.principal_portion` | Principal portion of payment |
| Interest | `metadata.interest_portion` | Interest portion of payment |
| Remaining | `debt.current_balance` | Remaining balance |
| Progress | `(1 - current_balance/principal) * 100` | Payoff percentage |

**Calculations:**
```typescript
// If user provides split:
principal_portion = metadata.principal_portion
interest_portion = metadata.interest_portion

// Progress toward payoff:
payoff_percentage = ((principal - current_balance) / principal) * 100
```

---

## Move Money Flows

### 11. Transfer

```
┌─────────────────────────────────────────────────────────────────┐
│ Jan 03    │ 🔄 Transfer │ Chase Bank → Savings Acct │   $5,000 │
└─────────────────────────────────────────────────────────────────┘
```

| Field | Source | Display |
|-------|--------|---------|
| From | `from_asset.name` | Source asset |
| To | `to_asset.name` | Destination asset |
| Amount | `amount` | Neutral color (no +/-) |

**Calculations:** None (money moves between own assets)

---

### 12. Deposit

```
┌─────────────────────────────────────────────────────────────────┐
│ Jan 02    │ 🏧 Deposit │ Chase Bank → CD 12-Month   │  $10,000 │
│           │            │ APY: 5.0%  Matures: Jan 2027          │
└─────────────────────────────────────────────────────────────────┘
```

| Field | Source | Display |
|-------|--------|---------|
| From | `from_asset.name` | Source cash account |
| To | `to_asset.name` | Deposit account (CD, term deposit) |
| Amount | `amount` | Neutral color |
| APY | `to_asset.metadata.apy` | Annual percentage yield |
| Maturity | `to_asset.metadata.maturity_date` | When deposit matures |

**Calculations:** None

---

### 13. Sell

```
┌─────────────────────────────────────────────────────────────────┐
│ Jan 20    │ 📉 Sell    │ AAPL → Fidelity Cash       │  +$5,000 │
│           │            │ Sold: 25 shares @ $200.00             │
│           │            │ Cost Basis: $3,750  P/L: +$1,250 (33%)│
│           │            │ Remaining: 25 shares                  │
└─────────────────────────────────────────────────────────────────┘
```

| Field | Source | Display |
|-------|--------|---------|
| From | `from_asset.name` + `from_asset.ticker` | Stock/ETF being sold |
| To | `to_asset.name` | Cash account receiving proceeds |
| Amount | `amount` | Green (money coming in) |
| Shares Sold | `metadata.shares` | Number of shares sold |
| Price | `metadata.price_per_share` | Sell price per share |
| Cost Basis | `metadata.cost_basis` | Original cost of shares |
| P/L | `amount - cost_basis` | Realized profit/loss |
| P/L % | `((amount - cost_basis) / cost_basis) * 100` | P/L percentage |
| Remaining | `from_asset.balance` | Shares still held |

**Calculations:**
```typescript
cost_basis = metadata.cost_basis || (shares * avg_cost_per_share)
realized_pl = amount - cost_basis
realized_pl_pct = (realized_pl / cost_basis) * 100
```

---

### 14. Reinvest (DRIP)

```
┌─────────────────────────────────────────────────────────────────┐
│ Jan 05    │ 🔁 Reinvest │ VTI Dividend → VTI        │      $85 │
│           │             │ Bought: 0.5 shares @ $170.00         │
│           │             │ Total Holdings: 151.0 shares         │
└─────────────────────────────────────────────────────────────────┘
```

| Field | Source | Display |
|-------|--------|---------|
| From | `from_asset.name` | Stock paying dividend |
| To | `to_asset.name` | Same stock (DRIP) |
| Amount | `amount` | Dividend amount reinvested |
| Shares | `metadata.shares` | Fractional shares bought |
| Price | Calculated | Price per share |
| Total Holdings | `to_asset.balance` | New total shares |

**Calculations:**
```typescript
shares_bought = amount / price_per_share
// DRIP: from and to are same asset
```

---

## Add Debt Flows

### 15. Add Mortgage

```
┌─────────────────────────────────────────────────────────────────┐
│ Jan 01    │ 🏠 Mortgage │ Bank → Chase Bank        │ +$300,000 │
│           │             │ New Debt: Home Mortgage              │
│           │             │ Rate: 6.5%  Term: 30 years           │
│           │             │ Monthly: $1,896                      │
└─────────────────────────────────────────────────────────────────┘
```

| Field | Source | Display |
|-------|--------|---------|
| From | `metadata.source_name` or "Bank" | Lender |
| To | `to_asset.name` | Cash account receiving funds |
| Amount | `amount` | Green (money received) |
| Debt Created | `debt.name` | Name of new debt |
| Interest Rate | `debt.interest_rate` | Annual rate |
| Term | `debt.term_months` | Loan term in months/years |
| Monthly Payment | `debt.monthly_payment` | Monthly payment amount |

**Calculations:**
```typescript
// Monthly payment (if not provided):
monthly_payment = principal * (rate/12) / (1 - (1 + rate/12)^(-term_months))
```

---

### 16. Add Loan

```
┌─────────────────────────────────────────────────────────────────┐
│ Mar 15    │ 💳 Loan    │ Credit Union → Chase Bank  │  +$15,000 │
│           │            │ New Debt: Auto Loan                   │
│           │            │ Rate: 4.9%  Term: 5 years             │
│           │            │ Monthly: $283                         │
└─────────────────────────────────────────────────────────────────┘
```

Same structure as Mortgage.

---

## Other Flow

### 17. Other

```
┌─────────────────────────────────────────────────────────────────┐
│ Jan 10    │ ❓ Other   │ Insurance Co. → Chase Bank │   +$1,200 │
│           │            │ Note: Insurance reimbursement         │
└─────────────────────────────────────────────────────────────────┘
```

| Field | Source | Display |
|-------|--------|---------|
| From | `from_asset.name` or `metadata.source_name` | Source (asset or external) |
| To | `to_asset.name` or external | Destination |
| Amount | `amount` | Signed based on direction |
| Note | `description` | User's note explaining the flow |

**Calculations:** None

---

## Display Priority

For each flow type, display information in this priority:

1. **Primary Line:** Date, Category, From → To, Amount
2. **Secondary Line (if applicable):**
   - Shares/Price info (invest, sell, reinvest)
   - P/L info (sell, dividend)
   - Debt details (pay_debt, add_mortgage, add_loan)
   - Tax info (dividend)
3. **Tertiary Line (if applicable):**
   - Remaining balance/shares
   - Linked ledger info
   - Notes

---

## Color Coding

| Flow Direction | Color | Examples |
|----------------|-------|----------|
| Money In | Green (+) | salary, bonus, dividend, gift, sell proceeds |
| Money Out | Red (-) | expense, invest, pay_debt |
| Transfer | Neutral | transfer, deposit, reinvest |
| P/L Positive | Green | Realized gains |
| P/L Negative | Red | Realized losses |

---

## Implementation Notes

### Metadata Structure by Flow Type

```typescript
interface FlowMetadata {
  // Income flows
  source_name?: string;           // External source name

  // Investment flows
  shares?: number;                // Shares bought/sold
  price_per_share?: number;       // Price per share
  cost_basis?: number;            // For sell: original cost
  realized_pl?: number;           // For sell: profit/loss

  // Pay Debt flows
  principal_portion?: number;     // Principal part of payment
  interest_portion?: number;      // Interest part of payment

  // Dividend flows (tax from user_tax_settings)

  // Expense flows
  linked_ledger?: {
    ledger_id: string;
    ledger_name: string;
    transaction_count: number;
  };

  // Debt flows
  debt_details?: {
    interest_rate: number;
    term_months: number;
    monthly_payment: number;
  };
}
```

### Display Component Mapping

| Flow Category | Display Component |
|---------------|-------------------|
| salary, bonus, freelance, gift | `IncomeFlowRow` |
| rental | `RentalFlowRow` |
| dividend | `DividendFlowRow` |
| interest | `InterestFlowRow` |
| expense | `ExpenseFlowRow` |
| invest | `InvestFlowRow` |
| sell | `SellFlowRow` |
| reinvest | `ReinvestFlowRow` |
| transfer, deposit | `TransferFlowRow` |
| pay_debt | `PayDebtFlowRow` |
| add_mortgage, add_loan | `AddDebtFlowRow` |
| other | `OtherFlowRow` |
