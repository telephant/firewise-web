# Dividend Three-View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single dividend table in the portfolio detail page with three switchable views — Table, Stats, and Calendar — controlled by a segmented control at the top of the Dividends tab.

**Architecture:** Extract the dividend tab content into a self-contained `DividendViews` component that manages its own sub-view state (`'table' | 'stats' | 'calendar'`), a shared tax toggle (`gross | net`), and lazy-loads the calendar API data only when the Calendar view is activated. The three views live in three dedicated files, keeping `page.tsx` unchanged except for swapping `<DividendTableView>` for `<DividendViews>`.

**Tech Stack:** React, TypeScript, Next.js App Router, Fire UI design system (`colors`, `BarChart`, `ButtonGroup`, `Loader`, `StatCard` from `@/components/fire/ui`), existing `dividendApi` and a new `dividendCalendarApi` added to `src/lib/fire/api.ts`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/lib/fire/api.ts` | Add `DividendCalendarResponse` types + `dividendCalendarApi.get()` |
| Create | `src/components/fire/dividend-views/index.tsx` | Segmented control + shared state (view, taxMode); renders the active sub-view |
| Create | `src/components/fire/dividend-views/dividend-table-view.tsx` | Existing table UI extracted verbatim, receives `dividends`, `currency`, `onAdd` props |
| Create | `src/components/fire/dividend-views/dividend-stats-view.tsx` | Bar chart (12-month trend) + ticker breakdown table + tax toggle output |
| Create | `src/components/fire/dividend-views/dividend-calendar-view.tsx` | Month/year navigation, 7-col day grid, right-side detail panel |
| Modify | `src/app/(fire)/fire/portfolios/[id]/page.tsx` | Replace inline dividend tab JSX with `<DividendViews>` |

---

## Task 1: Add API types and `dividendCalendarApi` to `api.ts`

**Files:**
- Modify: `src/lib/fire/api.ts`

The dividend calendar endpoint is `GET /api/fire/dividend-calendar?year=YYYY&portfolioId=UUID`.
Note: the backend endpoint is at `/fire/dividend-calendar` and currently does NOT scope by portfolioId — it uses the authenticated user context. We call it as `/fire/dividend-calendar?year=YYYY`.

- [ ] **Step 1: Add the types after the existing `Dividend` interface (around line 60)**

Open `src/lib/fire/api.ts`. After the closing `}` of the `Dividend` interface, add:

```typescript
export interface DividendCalendarMonthDividend {
  ticker: string;
  assetId: string;
  amount: number; // GROSS amount in portfolio currency
  originalAmount?: number;
  originalCurrency?: string;
  isForecasted: boolean;
  date?: string; // ISO date string, present for actual dividends
  frequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | null;
  market?: string | null;
}

export interface DividendCalendarMonth {
  month: number; // 0-11
  name: string;  // 'Jan', 'Feb', etc.
  dividends: DividendCalendarMonthDividend[];
  total: number; // GROSS sum for the month
}

export interface DividendCalendarResponse {
  year: number;
  months: DividendCalendarMonth[];
  annualTotal: number;
  currency: string;
  taxRates: { us: number; sg: number };
}
```

- [ ] **Step 2: Add `dividendCalendarApi` after `dividendApi`**

After the closing `};` of `dividendApi`, add:

```typescript
export const dividendCalendarApi = {
  get: (year: number) =>
    fetchApi<DividendCalendarResponse>(`/fire/dividend-calendar?year=${year}`),
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/telephant/projects/firewise/firewise-web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/fire/api.ts
git commit -m "feat: add DividendCalendarResponse types and dividendCalendarApi"
```

---

## Task 2: Create `DividendTableView` (extract existing table)

**Files:**
- Create: `src/components/fire/dividend-views/dividend-table-view.tsx`

This is a pure extraction of the existing dividend table from `page.tsx` lines 332–380 (the content inside `<TabsContent value="dividends">`). It receives all data as props — no fetching.

- [ ] **Step 1: Create the file**

Create `src/components/fire/dividend-views/dividend-table-view.tsx`:

```tsx
'use client';

import { colors, Button } from '@/components/fire/ui';
import type { Dividend } from '@/lib/fire/api';

interface Props {
  dividends: Dividend[];
  currency: string;
  taxMode: 'gross' | 'net';
  onAdd: () => void;
}

function fmt(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function DividendTableView({ dividends, currency, taxMode, onAdd }: Props) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button variant="outline" onClick={onAdd}>Add Dividend</Button>
      </div>
      {dividends.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '48px 0', color: colors.muted, fontSize: 14 }}>
          No dividends recorded yet.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                {['Ticker', 'Ex Date', 'Pay Date', 'Amount/Share', 'Total Amount', 'Tax Rate', 'Source'].map(h => (
                  <th key={h} style={{ paddingBottom: 8, paddingRight: 16, textAlign: 'left', color: colors.muted, fontWeight: 500, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dividends.map((d) => {
                const netAmount = d.total_amount * (1 - d.tax_rate);
                const displayAmount = taxMode === 'net' ? netAmount : d.total_amount;
                return (
                  <tr key={d.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: '12px 16px 12px 0', fontWeight: 600, color: colors.text }}>{d.ticker}</td>
                    <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{d.ex_date}</td>
                    <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{d.pay_date || '—'}</td>
                    <td style={{ padding: '12px 16px 12px 0', color: colors.positive }}>{fmt(d.amount_per_share, d.currency)}</td>
                    <td style={{ padding: '12px 16px 12px 0', color: colors.positive }}>{fmt(displayAmount, d.currency)}</td>
                    <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{(d.tax_rate * 100).toFixed(0)}%</td>
                    <td style={{ padding: '12px 16px 12px 0' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 500,
                        backgroundColor: d.source === 'auto' ? 'rgba(94,106,210,0.15)' : 'rgba(255,255,255,0.06)',
                        color: d.source === 'auto' ? colors.accent : colors.muted,
                        border: `1px solid ${d.source === 'auto' ? 'rgba(94,106,210,0.3)' : colors.border}`,
                      }}>
                        {d.source}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/fire/dividend-views/dividend-table-view.tsx
git commit -m "feat: extract DividendTableView component"
```

---

## Task 3: Create `DividendStatsView`

**Files:**
- Create: `src/components/fire/dividend-views/dividend-stats-view.tsx`

Stats view: bar chart of monthly totals (past 12 months based on `dividends` array), then per-ticker breakdown with amount + percentage bar. The `taxMode` prop from the parent (shared with table view) controls whether amounts shown are gross or net.

- [ ] **Step 1: Create the file**

Create `src/components/fire/dividend-views/dividend-stats-view.tsx`:

```tsx
'use client';

import { useMemo } from 'react';
import { colors, BarChart } from '@/components/fire/ui';
import type { BarChartData } from '@/components/fire/ui';
import type { Dividend } from '@/lib/fire/api';

interface Props {
  dividends: Dividend[];
  currency: string;
  taxMode: 'gross' | 'net';
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtFull(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function DividendStatsView({ dividends, currency, taxMode }: Props) {
  const effectiveAmount = (d: Dividend) =>
    taxMode === 'net' ? d.total_amount * (1 - d.tax_rate) : d.total_amount;

  // Build last-12-months bar chart data
  const barData = useMemo<BarChartData[]>(() => {
    const now = new Date();
    const months: BarChartData[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const total = dividends
        .filter(div => {
          const dd = new Date(div.ex_date);
          return dd.getFullYear() === y && dd.getMonth() === m;
        })
        .reduce((sum, div) => sum + effectiveAmount(div), 0);
      months.push({
        name: `${MONTH_NAMES[m]} ${String(y).slice(2)}`,
        value: total,
        fill: i === 0 ? colors.accent : colors.positive,
      });
    }
    return months;
  }, [dividends, taxMode]);

  // Per-ticker breakdown
  const tickerTotals = useMemo(() => {
    const map = new Map<string, number>();
    dividends.forEach(d => {
      map.set(d.ticker, (map.get(d.ticker) ?? 0) + effectiveAmount(d));
    });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1]);
  }, [dividends, taxMode]);

  const grandTotal = tickerTotals.reduce((s, [, v]) => s + v, 0);

  return (
    <div>
      {/* Monthly trend */}
      <p style={{ color: colors.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
        Monthly Trend (last 12 months)
      </p>
      {dividends.length === 0 ? (
        <p style={{ color: colors.muted, fontSize: 13, marginBottom: 24 }}>No dividend data yet.</p>
      ) : (
        <div style={{ marginBottom: 28 }}>
          <BarChart
            data={barData}
            labelWidth={52}
            valueWidth={80}
            rowHeight={28}
            barSize={11}
            valueFormatter={(v) => fmt(v, currency)}
            showTooltip
          />
        </div>
      )}

      {/* Per-ticker breakdown */}
      {tickerTotals.length > 0 && (
        <>
          <p style={{ color: colors.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            By Ticker
          </p>
          <div>
            {tickerTotals.map(([ticker, amount]) => {
              const pct = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
              const count = dividends.filter(d => d.ticker === ticker).length;
              return (
                <div key={ticker} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: colors.text, fontSize: 13, fontWeight: 600, minWidth: 80 }}>{ticker}</span>
                      <span style={{ color: colors.muted, fontSize: 11 }}>{count}×</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: colors.muted, fontSize: 11 }}>{pct.toFixed(1)}%</span>
                      <span style={{ color: colors.positive, fontSize: 13, fontWeight: 500, minWidth: 90, textAlign: 'right' }}>
                        {fmtFull(amount, currency)}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 3, backgroundColor: colors.surfaceLight, borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: colors.positive, borderRadius: 2, transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              );
            })}
            {/* Grand total */}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: colors.muted, fontSize: 12, fontWeight: 600 }}>Total</span>
              <span style={{ color: colors.positive, fontSize: 14, fontWeight: 700 }}>{fmtFull(grandTotal, currency)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/fire/dividend-views/dividend-stats-view.tsx
git commit -m "feat: add DividendStatsView with monthly trend and ticker breakdown"
```

---

## Task 4: Create `DividendCalendarView`

**Files:**
- Create: `src/components/fire/dividend-views/dividend-calendar-view.tsx`

Calendar view: year/month navigation, 7-column day grid (Mon–Sun), colored dots on days with ex-date dividends, click-to-open right side detail panel. Uses calendar data from `DividendCalendarResponse` (loaded by parent). Also shows actual dividends from the `dividends` prop for the current month/year.

Key design decisions:
- Grid: standard ISO week (Mon=col 0, Sun=col 6). First cell offset = `(dayOfWeek + 6) % 7` where `dayOfWeek = new Date(year, month, 1).getDay()`.
- Ex-date dots: `colors.accent` (violet). Pay-date dots: `colors.info` (blue). Forecasted: `colors.warning` (yellow, dashed border on the day cell).
- Right panel: 240px wide, `position: absolute`, right-side slide-in using CSS transition on `right` value.
- The panel shows all actual `dividends` whose `ex_date` matches the clicked date.

- [ ] **Step 1: Create the file**

Create `src/components/fire/dividend-views/dividend-calendar-view.tsx`:

```tsx
'use client';

import { useState, useMemo } from 'react';
import { colors, Loader } from '@/components/fire/ui';
import type { Dividend, DividendCalendarResponse, DividendCalendarMonthDividend } from '@/lib/fire/api';

interface Props {
  dividends: Dividend[];       // actual dividends from DB (already loaded)
  calendarData: DividendCalendarResponse | null;
  calendarLoading: boolean;
  currency: string;
  taxMode: 'gross' | 'net';
  year: number;
  month: number; // 0-11
  onYearChange: (y: number) => void;
  onMonthChange: (m: number) => void;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function fmtFull(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function DividendCalendarView({
  dividends,
  calendarData,
  calendarLoading,
  currency,
  taxMode,
  year,
  month,
  onYearChange,
  onMonthChange,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // 'YYYY-MM-DD'

  // Build a map: date string -> list of MonthDividend (forecasted) + Dividend (actual)
  const calendarDividendsByDate = useMemo(() => {
    if (!calendarData) return new Map<string, DividendCalendarMonthDividend[]>();
    const map = new Map<string, DividendCalendarMonthDividend[]>();
    const monthData = calendarData.months[month];
    if (!monthData) return map;
    monthData.dividends.forEach(d => {
      if (!d.date) return; // forecasted with no specific date — skip in daily view
      if (!map.has(d.date)) map.set(d.date, []);
      map.get(d.date)!.push(d);
    });
    return map;
  }, [calendarData, month]);

  // Actual dividends (from DB) for the selected month
  const actualByDate = useMemo(() => {
    const map = new Map<string, Dividend[]>();
    dividends.forEach(d => {
      const dd = new Date(d.ex_date);
      if (dd.getFullYear() === year && dd.getMonth() === month) {
        if (!map.has(d.ex_date)) map.set(d.ex_date, []);
        map.get(d.ex_date)!.push(d);
      }
    });
    return map;
  }, [dividends, year, month]);

  // All dates that have any activity (ex_date from actual, date from calendarData)
  const activeDates = useMemo(() => {
    const set = new Set<string>();
    actualByDate.forEach((_, date) => set.add(date));
    calendarDividendsByDate.forEach((_, date) => set.add(date));
    return set;
  }, [actualByDate, calendarDividendsByDate]);

  // Detail panel data
  const panelActual: Dividend[] = selectedDate ? (actualByDate.get(selectedDate) ?? []) : [];
  const panelCalendar: DividendCalendarMonthDividend[] = selectedDate ? (calendarDividendsByDate.get(selectedDate) ?? []) : [];
  const panelOpen = selectedDate !== null;

  // Build calendar grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const startOffset = (firstDow + 6) % 7; // Mon=0 offset

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  function toDateStr(day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return (
    <div style={{ display: 'flex', position: 'relative', gap: 0 }}>
      {/* Main calendar area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => {
                if (month === 0) { onYearChange(year - 1); onMonthChange(11); }
                else onMonthChange(month - 1);
              }}
              style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '4px 10px', color: colors.muted, cursor: 'pointer', fontSize: 14 }}
            >‹</button>
            <span style={{ color: colors.text, fontWeight: 600, fontSize: 14, minWidth: 120, textAlign: 'center' }}>
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              onClick={() => {
                if (month === 11) { onYearChange(year + 1); onMonthChange(0); }
                else onMonthChange(month + 1);
              }}
              style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '4px 10px', color: colors.muted, cursor: 'pointer', fontSize: 14 }}
            >›</button>
          </div>
          {/* Year nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => onYearChange(year - 1)}
              style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '4px 8px', color: colors.muted, cursor: 'pointer', fontSize: 12 }}
            >‹ {year - 1}</button>
            <button
              onClick={() => onYearChange(year + 1)}
              style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '4px 8px', color: colors.muted, cursor: 'pointer', fontSize: 12 }}
            >{year + 1} ›</button>
          </div>
        </div>

        {calendarLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Loader size="sm" variant="dots" />
          </div>
        ) : (
          <>
            {/* Day header row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
              {DAY_NAMES.map(d => (
                <div key={d} style={{ textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: 600, padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {cells.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} />;
                const dateStr = toDateStr(day);
                const hasActual = actualByDate.has(dateStr);
                const hasCalendar = calendarDividendsByDate.has(dateStr);
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === new Date().toISOString().slice(0, 10);

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    style={{
                      borderRadius: 6,
                      padding: '6px 4px 4px',
                      minHeight: 52,
                      cursor: activeDates.has(dateStr) ? 'pointer' : 'default',
                      backgroundColor: isSelected
                        ? `${colors.accent}20`
                        : 'transparent',
                      border: isSelected
                        ? `1px solid ${colors.accent}50`
                        : `1px solid ${isToday ? colors.border : 'transparent'}`,
                      transition: 'background 0.12s',
                    }}
                  >
                    <div style={{
                      fontSize: 12,
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? colors.accent : (activeDates.has(dateStr) ? colors.text : colors.muted),
                      textAlign: 'center',
                      marginBottom: 4,
                    }}>
                      {day}
                    </div>
                    {/* Dots */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                      {hasActual && (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: colors.accent }} title="Ex-date" />
                      )}
                      {hasCalendar && !hasActual && (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: colors.warning, opacity: 0.7 }} title="Forecasted" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colors.accent }} />
                <span style={{ color: colors.muted, fontSize: 11 }}>Actual (ex-date)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colors.warning, opacity: 0.7 }} />
                <span style={{ color: colors.muted, fontSize: 11 }}>Forecasted</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right detail panel */}
      <div
        style={{
          width: panelOpen ? 240 : 0,
          overflow: 'hidden',
          transition: 'width 0.2s ease',
          flexShrink: 0,
        }}
      >
        <div style={{
          width: 240,
          borderLeft: `1px solid ${colors.border}`,
          paddingLeft: 16,
          paddingTop: 4,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ color: colors.text, fontSize: 13, fontWeight: 600 }}>
              {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
            </span>
            <button
              onClick={() => setSelectedDate(null)}
              style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1 }}
            >×</button>
          </div>

          {panelActual.length === 0 && panelCalendar.length === 0 ? (
            <p style={{ color: colors.muted, fontSize: 12 }}>No dividends on this date.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {panelActual.map(d => {
                const amount = taxMode === 'net' ? d.total_amount * (1 - d.tax_rate) : d.total_amount;
                return (
                  <div key={d.id} style={{ padding: '10px 12px', backgroundColor: colors.surfaceLight, borderRadius: 6, border: `1px solid ${colors.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: colors.text, fontWeight: 600, fontSize: 13 }}>{d.ticker}</span>
                      <span style={{ color: colors.positive, fontSize: 13, fontWeight: 600 }}>{fmtFull(amount, d.currency)}</span>
                    </div>
                    <div style={{ color: colors.muted, fontSize: 11 }}>
                      {d.shares_at_exdate.toFixed(4)} shares · {(d.tax_rate * 100).toFixed(0)}% tax
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 3, fontWeight: 500,
                        backgroundColor: d.source === 'auto' ? 'rgba(94,106,210,0.15)' : 'rgba(255,255,255,0.06)',
                        color: d.source === 'auto' ? colors.accent : colors.muted,
                        border: `1px solid ${d.source === 'auto' ? 'rgba(94,106,210,0.3)' : colors.border}`,
                      }}>{d.source}</span>
                    </div>
                  </div>
                );
              })}
              {panelCalendar.map((d, i) => (
                <div key={`fc-${i}`} style={{ padding: '10px 12px', backgroundColor: colors.surfaceLight, borderRadius: 6, border: `1px dashed ${colors.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: colors.text, fontWeight: 600, fontSize: 13 }}>{d.ticker}</span>
                    <span style={{ color: colors.warning, fontSize: 13, fontWeight: 600 }}>{fmtFull(d.amount, currency)}</span>
                  </div>
                  <div style={{ color: colors.muted, fontSize: 11 }}>
                    Forecasted{d.frequency ? ` · ${d.frequency}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/fire/dividend-views/dividend-calendar-view.tsx
git commit -m "feat: add DividendCalendarView with grid, dots, and detail panel"
```

---

## Task 5: Create `DividendViews` container (segmented control + shared state)

**Files:**
- Create: `src/components/fire/dividend-views/index.tsx`

This is the orchestrator: holds `view`, `taxMode`, `calendarYear`, `calendarMonth`, `calendarData`, `calendarLoading` state. Renders the segmented control (3 pills: Table / Stats / Calendar) + tax toggle, then the active sub-view. Lazy-loads calendar data when the Calendar view is first activated.

- [ ] **Step 1: Create the file**

Create `src/components/fire/dividend-views/index.tsx`:

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { colors } from '@/components/fire/ui';
import { dividendCalendarApi } from '@/lib/fire/api';
import type { Dividend, DividendCalendarResponse } from '@/lib/fire/api';
import { DividendTableView } from './dividend-table-view';
import { DividendStatsView } from './dividend-stats-view';
import { DividendCalendarView } from './dividend-calendar-view';

type DividendSubView = 'table' | 'stats' | 'calendar';
type TaxMode = 'gross' | 'net';

interface Props {
  dividends: Dividend[];
  currency: string;
  onAddDividend: () => void;
}

const SUB_VIEWS: { id: DividendSubView; label: string }[] = [
  { id: 'table', label: 'Table' },
  { id: 'stats', label: 'Stats' },
  { id: 'calendar', label: 'Calendar' },
];

export function DividendViews({ dividends, currency, onAddDividend }: Props) {
  const [view, setView] = useState<DividendSubView>('table');
  const [taxMode, setTaxMode] = useState<TaxMode>('gross');

  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const [calendarData, setCalendarData] = useState<DividendCalendarResponse | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const loadedYears = useRef<Set<number>>(new Set());

  // Load calendar data lazily when Calendar view is activated, or year changes
  useEffect(() => {
    if (view !== 'calendar') return;
    if (loadedYears.current.has(calendarYear)) return;
    setCalendarLoading(true);
    dividendCalendarApi.get(calendarYear).then(res => {
      if (res.success && res.data) {
        setCalendarData(res.data);
        loadedYears.current.add(calendarYear);
      }
      setCalendarLoading(false);
    });
  }, [view, calendarYear]);

  return (
    <div>
      {/* Segmented control + Tax toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        {/* Segmented control */}
        <div style={{
          display: 'inline-flex',
          backgroundColor: colors.surfaceLight,
          borderRadius: 8,
          padding: 3,
          border: `1px solid ${colors.border}`,
          gap: 2,
        }}>
          {SUB_VIEWS.map(sv => (
            <button
              key={sv.id}
              onClick={() => setView(sv.id)}
              style={{
                padding: '5px 14px',
                borderRadius: 6,
                border: 'none',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                backgroundColor: view === sv.id ? colors.surface : 'transparent',
                color: view === sv.id ? colors.text : colors.muted,
                boxShadow: view === sv.id ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              {sv.label}
            </button>
          ))}
        </div>

        {/* Tax toggle */}
        <div style={{
          display: 'inline-flex',
          backgroundColor: colors.surfaceLight,
          borderRadius: 8,
          padding: 3,
          border: `1px solid ${colors.border}`,
          gap: 2,
        }}>
          {(['gross', 'net'] as TaxMode[]).map(tm => (
            <button
              key={tm}
              onClick={() => setTaxMode(tm)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                backgroundColor: taxMode === tm ? colors.surface : 'transparent',
                color: taxMode === tm ? colors.text : colors.muted,
                boxShadow: taxMode === tm ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {tm}
            </button>
          ))}
        </div>
      </div>

      {/* Active view */}
      {view === 'table' && (
        <DividendTableView
          dividends={dividends}
          currency={currency}
          taxMode={taxMode}
          onAdd={onAddDividend}
        />
      )}
      {view === 'stats' && (
        <DividendStatsView
          dividends={dividends}
          currency={currency}
          taxMode={taxMode}
        />
      )}
      {view === 'calendar' && (
        <DividendCalendarView
          dividends={dividends}
          calendarData={calendarData}
          calendarLoading={calendarLoading}
          currency={currency}
          taxMode={taxMode}
          year={calendarYear}
          month={calendarMonth}
          onYearChange={(y) => { setCalendarYear(y); loadedYears.current.delete(y); }}
          onMonthChange={setCalendarMonth}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/fire/dividend-views/index.tsx
git commit -m "feat: add DividendViews container with segmented control and tax toggle"
```

---

## Task 6: Wire `DividendViews` into `page.tsx`

**Files:**
- Modify: `src/app/(fire)/fire/portfolios/[id]/page.tsx`

Replace the inline dividend tab content (lines 332–380) with `<DividendViews>`. The `dividendDialogOpen` state and `AddDividendDialog` remain unchanged — just pass `onAddDividend={() => setDividendDialogOpen(true)}`.

- [ ] **Step 1: Add the import**

In `src/app/(fire)/fire/portfolios/[id]/page.tsx`, add after the last import line:

```typescript
import { DividendViews } from '@/components/fire/dividend-views';
```

- [ ] **Step 2: Replace the Dividends TabsContent**

Find the block:

```tsx
        {/* Dividends Tab */}
        <TabsContent value="dividends" style={{ flex: 1, overflow: 'auto', marginTop: 16 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <Button variant="outline" onClick={() => setDividendDialogOpen(true)}>Add Dividend</Button>
            </div>
            {dividends.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '48px 0', color: colors.muted, fontSize: 14 }}>No dividends recorded yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                      {['Ticker', 'Ex Date', 'Pay Date', 'Amount/Share', 'Total Amount', 'Tax Rate', 'Source'].map(h => (
                        <th key={h} style={{ paddingBottom: 8, paddingRight: 16, textAlign: 'left', color: colors.muted, fontWeight: 500, fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dividends.map((d) => (
                      <tr key={d.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <td style={{ padding: '12px 16px 12px 0', fontWeight: 600, color: colors.text }}>{d.ticker}</td>
                        <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{d.ex_date}</td>
                        <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{d.pay_date || '—'}</td>
                        <td style={{ padding: '12px 16px 12px 0', color: colors.positive }}>{fmt(d.amount_per_share, d.currency)}</td>
                        <td style={{ padding: '12px 16px 12px 0', color: colors.positive }}>{fmt(d.total_amount, d.currency)}</td>
                        <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{(d.tax_rate * 100).toFixed(0)}%</td>
                        <td style={{ padding: '12px 16px 12px 0' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 500,
                            backgroundColor: d.source === 'auto' ? 'rgba(94,106,210,0.15)' : 'rgba(255,255,255,0.06)',
                            color: d.source === 'auto' ? colors.accent : colors.muted,
                            border: `1px solid ${d.source === 'auto' ? 'rgba(94,106,210,0.3)' : colors.border}`,
                          }}>
                            {d.source}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
```

Replace with:

```tsx
        {/* Dividends Tab */}
        <TabsContent value="dividends" style={{ flex: 1, overflow: 'auto', marginTop: 16 }}>
          <DividendViews
            dividends={dividends}
            currency={currency}
            onAddDividend={() => setDividendDialogOpen(true)}
          />
        </TabsContent>
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(fire)/fire/portfolios/[id]/page.tsx
git commit -m "feat: wire DividendViews into portfolio detail page"
```
