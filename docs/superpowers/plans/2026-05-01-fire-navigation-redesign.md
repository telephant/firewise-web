# Fire Module Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure fire module navigation — add Portfolios page, redesign Dashboard with aggregate stats + donut chart, add breadcrumbs throughout.

**Architecture:** Move portfolio list from /fire to /fire/portfolios; rebuild /fire as aggregate dashboard with SVG donut chart and stat cards; add lightweight Breadcrumb component used across detail pages.

**Tech Stack:** Next.js 15, TypeScript, Fire UI (inline styles, colors object), SVG for charts, existing portfolioApi/portfolioStatsApi/exchangeRateApi

---

## File Map

| Action | Path |
|--------|------|
| MODIFY | `src/components/fire/portfolio-sidebar.tsx` |
| CREATE | `src/app/(fire)/fire/portfolios/page.tsx` |
| MODIFY | `src/app/(fire)/fire/page.tsx` |
| CREATE | `src/components/fire/breadcrumb.tsx` |
| MODIFY | `src/app/(fire)/fire/portfolios/[id]/page.tsx` |
| MODIFY | `src/app/(fire)/fire/dca/page.tsx` |
| MODIFY | `src/app/(fire)/fire/family/page.tsx` |

---

## Task 1: Add Portfolios Nav Item to Sidebar

**File:** `src/components/fire/portfolio-sidebar.tsx`

### Steps

- [ ] Open `src/components/fire/portfolio-sidebar.tsx`
- [ ] Insert the Portfolios nav item into the `navItems` array after the Dashboard entry (after line 37 `},`) and before the Family entry

**Exact edit — replace the navItems array (lines 26–59):**

```typescript
const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/fire',
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    label: 'Portfolios',
    href: '/fire/portfolios',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
  },
  {
    label: 'Family',
    href: '/fire/family',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'DCA',
    href: '/fire/dca',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
];
```

**Why the `isActive` logic already works:** The existing render loop uses `pathname.startsWith(item.href)` for non-exact items, so `/fire/portfolios/[id]` will automatically highlight the Portfolios nav item with no further changes.

- [ ] TypeScript compile check:
```bash
cd /Users/telephant/projects/firewise/firewise-web && npx tsc --noEmit 2>&1 | head -20
```
- [ ] Git commit:
```bash
cd /Users/telephant/projects/firewise/firewise-web && git add src/components/fire/portfolio-sidebar.tsx && git commit -m "feat: add Portfolios nav item to fire sidebar"
```

---

## Task 2: Move Portfolio List to `/fire/portfolios/page.tsx`

**File:** `src/app/(fire)/fire/portfolios/page.tsx`

Create this new file with the full contents of the current `/fire/page.tsx`, but rename the component from `FireDashboard` to `PortfoliosPage`.

### Steps

- [ ] Create `src/app/(fire)/fire/portfolios/page.tsx` with the following complete content:

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  portfolioApi,
  portfolioStatsApi,
  exchangeRateApi,
} from '@/lib/fire/api';
import type { Portfolio, PortfolioStats } from '@/lib/fire/api';
import {
  colors,
  Button,
  Loader,
  CurrencyCombobox,
  ButtonGroup,
} from '@/components/fire/ui';
import { CreatePortfolioDialog } from '@/components/fire/create-portfolio-dialog';

// ── helpers ────────────────────────────────────────────────────────────────

function convert(
  value: number,
  fromCurrency: string,
  rates: Record<string, number>
): { value: number; approximate: boolean } {
  if (!rates[fromCurrency] || rates[fromCurrency] === 0) {
    return { value, approximate: true };
  }
  return { value: value / rates[fromCurrency], approximate: false };
}

function fmtNumber(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ColoredCell({
  value,
  prefix = '',
  dash = false,
}: {
  value?: number | null;
  prefix?: string;
  dash?: boolean;
}) {
  if (dash || value === undefined || value === null) {
    return <span style={{ color: colors.muted }}>—</span>;
  }
  const color = value >= 0 ? colors.positive : colors.negative;
  return (
    <span style={{ color }}>
      {prefix}{fmtNumber(value)}
    </span>
  );
}

// ── component ──────────────────────────────────────────────────────────────

export default function PortfoliosPage() {
  const router = useRouter();

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsMap, setStatsMap] = useState<Record<string, PortfolioStats>>({});
  const [statsLoading, setStatsLoading] = useState(false);
  const [baseCurrency, setBaseCurrencyState] = useState('USD');
  const [convertMode, setConvertMode] = useState(false);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [createOpen, setCreateOpen] = useState(false);

  // Persist baseCurrency to localStorage
  const setBaseCurrency = useCallback((val: string) => {
    setBaseCurrencyState(val);
    localStorage.setItem('fire_base_currency', val);
  }, []);

  // Load portfolios on mount
  useEffect(() => {
    const saved = localStorage.getItem('fire_base_currency');
    if (saved) setBaseCurrencyState(saved);

    portfolioApi.list().then(r => {
      if (r.success && r.data) {
        const list = r.data;
        setPortfolios(list);
        setLoading(false);

        // Parallel-load stats
        if (list.length > 0) {
          setStatsLoading(true);
          Promise.all(list.map(p => portfolioStatsApi.getStats(p.id))).then(results => {
            const map: Record<string, PortfolioStats> = {};
            results.forEach((res, i) => {
              if (res.success && res.data) {
                map[list[i].id] = res.data;
              }
            });
            setStatsMap(map);
            setStatsLoading(false);
          });
        }
      } else {
        setLoading(false);
      }
    });
  }, []);

  // Load exchange rates when portfolios or baseCurrency changes
  useEffect(() => {
    if (portfolios.length === 0) return;
    const uniqueCurrencies = [...new Set(portfolios.map(p => p.currency))];
    exchangeRateApi.get(baseCurrency, uniqueCurrencies).then(r => {
      if (r.success && r.data) {
        setRates(r.data.rates);
      }
    });
  }, [portfolios, baseCurrency]);

  // ── table cell value helpers ────────────────────────────────────────────

  function getCellValue(
    portfolioId: string,
    portfolioCurrency: string,
    field: keyof Pick<PortfolioStats, 'total_value' | 'total_cost' | 'unrealized_pl' | 'realized_pl' | 'dividend_ytd'>
  ): { display: string | null; raw: number | null; approximate: boolean } {
    if (statsLoading) return { display: null, raw: null, approximate: false };
    const stats = statsMap[portfolioId];
    if (!stats) return { display: null, raw: null, approximate: false };

    const rawVal = stats[field];

    if (convertMode) {
      const { value: converted, approximate } = convert(rawVal, portfolioCurrency, rates);
      return { display: `${approximate ? '~' : ''}${fmtNumber(converted)}`, raw: converted, approximate };
    }
    return { display: fmtNumber(rawVal), raw: rawVal, approximate: false };
  }

  function getReturnPct(portfolioId: string, portfolioCurrency: string): number | null {
    if (statsLoading) return null;
    const stats = statsMap[portfolioId];
    if (!stats || !stats.total_cost || stats.total_cost === 0) return null;
    const totalReturn = stats.unrealized_pl + stats.realized_pl + stats.dividend_ytd;
    return (totalReturn / stats.total_cost) * 100;
  }

  // ── table styles ────────────────────────────────────────────────────────

  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    textAlign: 'left',
    color: colors.muted,
    fontWeight: 500,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: `1px solid ${colors.border}`,
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 14px',
    color: colors.text,
    fontSize: 13,
    borderBottom: `1px solid ${colors.border}`,
  };

  const currencyLabel = convertMode ? ` (${baseCurrency})` : '';

  // ── render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Portfolios</h1>
        <Button onClick={() => setCreateOpen(true)} size="sm">+ New Portfolio</Button>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 200 }}>
          <CurrencyCombobox value={baseCurrency} onChange={setBaseCurrency} />
        </div>
        <ButtonGroup
          options={[
            { id: 'original', label: 'Original' },
            { id: 'convert', label: 'Convert' },
          ]}
          value={convertMode ? 'convert' : 'original'}
          onChange={(v) => setConvertMode(v === 'convert')}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <Loader size="md" variant="bar" />
        </div>
      ) : portfolios.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 80, color: colors.muted }}>
          <p style={{ marginBottom: 16, fontSize: 14 }}>No portfolios yet.</p>
          <Button onClick={() => setCreateOpen(true)}>Create your first portfolio</Button>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Currency</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Net Value{currencyLabel}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total Cost{currencyLabel}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Unrealized P&amp;L{currencyLabel}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Realized P&amp;L{currencyLabel}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>YTD Dividends{currencyLabel}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Return %</th>
              </tr>
            </thead>
            <tbody>
              {portfolios.map(p => {
                const currency = p.currency;
                const netVal = getCellValue(p.id, currency, 'total_value');
                const totalCost = getCellValue(p.id, currency, 'total_cost');
                const unrealized = getCellValue(p.id, currency, 'unrealized_pl');
                const realized = getCellValue(p.id, currency, 'realized_pl');
                const ytdDiv = getCellValue(p.id, currency, 'dividend_ytd');
                const returnPct = getReturnPct(p.id, currency);

                return (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/fire/portfolios/${p.id}`)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor = colors.surfaceLight;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '';
                    }}
                  >
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{p.name}</td>
                    <td style={{ ...tdStyle, color: colors.muted }}>{currency}</td>

                    {/* Net Value */}
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {statsLoading || netVal.display === null ? (
                        <span style={{ color: colors.muted }}>—</span>
                      ) : (
                        <span style={{ color: colors.text }}>
                          {netVal.approximate ? '~' : ''}{netVal.display}
                        </span>
                      )}
                    </td>

                    {/* Total Cost */}
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {statsLoading || totalCost.display === null ? (
                        <span style={{ color: colors.muted }}>—</span>
                      ) : (
                        <span style={{ color: colors.text }}>
                          {totalCost.approximate ? '~' : ''}{totalCost.display}
                        </span>
                      )}
                    </td>

                    {/* Unrealized P&L */}
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {statsLoading || unrealized.raw === null ? (
                        <span style={{ color: colors.muted }}>—</span>
                      ) : (
                        <span style={{ color: unrealized.raw >= 0 ? colors.positive : colors.negative }}>
                          {unrealized.approximate ? '~' : ''}{unrealized.display}
                        </span>
                      )}
                    </td>

                    {/* Realized P&L */}
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {statsLoading || realized.raw === null ? (
                        <span style={{ color: colors.muted }}>—</span>
                      ) : (
                        <span style={{ color: realized.raw >= 0 ? colors.positive : colors.negative }}>
                          {realized.approximate ? '~' : ''}{realized.display}
                        </span>
                      )}
                    </td>

                    {/* YTD Dividends */}
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {statsLoading || ytdDiv.raw === null ? (
                        <span style={{ color: colors.muted }}>—</span>
                      ) : (
                        <span style={{ color: ytdDiv.raw >= 0 ? colors.positive : colors.negative }}>
                          {ytdDiv.approximate ? '~' : ''}{ytdDiv.display}
                        </span>
                      )}
                    </td>

                    {/* Return % */}
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {statsLoading || returnPct === null ? (
                        <span style={{ color: colors.muted }}>—</span>
                      ) : (
                        <span style={{ color: returnPct >= 0 ? colors.positive : colors.negative }}>
                          {returnPct >= 0 ? '+' : ''}{fmtNumber(returnPct)}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CreatePortfolioDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={p => {
          setPortfolios(prev => [...prev, p]);
          setCreateOpen(false);
        }}
      />
    </div>
  );
}
```

- [ ] TypeScript compile check:
```bash
cd /Users/telephant/projects/firewise/firewise-web && npx tsc --noEmit 2>&1 | head -20
```
- [ ] Git commit:
```bash
cd /Users/telephant/projects/firewise/firewise-web && git add src/app/\(fire\)/fire/portfolios/page.tsx && git commit -m "feat: create /fire/portfolios page with portfolio list"
```

---

## Task 3: Create Breadcrumb Component

**File:** `src/components/fire/breadcrumb.tsx`

### Steps

- [ ] Create `src/components/fire/breadcrumb.tsx` with the following content:

```tsx
'use client';

import Link from 'next/link';
import { colors } from '@/components/fire/ui';

interface BreadcrumbItem {
  label: string;
  href?: string; // if undefined, it's the current (non-clickable) page
}

interface Props {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && (
            <span style={{ color: colors.muted, fontSize: 12, opacity: 0.5 }}>/</span>
          )}
          {item.href ? (
            <Link
              href={item.href}
              style={{
                color: colors.muted,
                fontSize: 12,
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.color = colors.text;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.color = colors.muted;
              }}
            >
              {item.label}
            </Link>
          ) : (
            <span style={{ color: colors.muted, fontSize: 12 }}>{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
```

- [ ] TypeScript compile check:
```bash
cd /Users/telephant/projects/firewise/firewise-web && npx tsc --noEmit 2>&1 | head -20
```
- [ ] Git commit:
```bash
cd /Users/telephant/projects/firewise/firewise-web && git add src/components/fire/breadcrumb.tsx && git commit -m "feat: add Breadcrumb component to fire module"
```

---

## Task 4: Add Breadcrumbs to Detail, DCA, and Family Pages

### 4a — Portfolio detail page

**File:** `src/app/(fire)/fire/portfolios/[id]/page.tsx`

- [ ] Add import at the top of the file (after the existing imports):
```tsx
import { Breadcrumb } from '@/components/fire/breadcrumb';
```

- [ ] In the `return (` block, find the existing header section:
```tsx
  return (
    <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: 0 }}>{portfolio?.name || 'Portfolio'}</h1>
```

- [ ] Replace it with:
```tsx
  return (
    <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Breadcrumb items={[{ label: 'Portfolios', href: '/fire/portfolios' }, { label: portfolio?.name || '...' }]} />
          <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: 0 }}>{portfolio?.name || 'Portfolio'}</h1>
```

### 4b — DCA page

**File:** `src/app/(fire)/fire/dca/page.tsx`

- [ ] Add import at the top of the file (after the existing imports):
```tsx
import { Breadcrumb } from '@/components/fire/breadcrumb';
```

- [ ] Find the header `<div>` in the return block:
```tsx
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: 0 }}>DCA Plans</h1>
```

- [ ] Replace it with:
```tsx
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <Breadcrumb items={[{ label: 'DCA' }]} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: 0 }}>DCA Plans</h1>
```

### 4c — Family page

**File:** `src/app/(fire)/fire/family/page.tsx`

- [ ] Add import at the top of the file (after the existing imports):
```tsx
import { Breadcrumb } from '@/components/fire/breadcrumb';
```

- [ ] Find the h1 in the return block:
```tsx
        <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: '0 0 24px' }}>Family</h1>
```

- [ ] Replace it with:
```tsx
        <Breadcrumb items={[{ label: 'Family' }]} />
        <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: '0 0 24px' }}>Family</h1>
```

- [ ] TypeScript compile check:
```bash
cd /Users/telephant/projects/firewise/firewise-web && npx tsc --noEmit 2>&1 | head -20
```
- [ ] Git commit:
```bash
cd /Users/telephant/projects/firewise/firewise-web && git add src/app/\(fire\)/fire/portfolios/\[id\]/page.tsx src/app/\(fire\)/fire/dca/page.tsx src/app/\(fire\)/fire/family/page.tsx && git commit -m "feat: add breadcrumbs to portfolio detail, DCA, and family pages"
```

---

## Task 5: Create New Dashboard at `/fire/page.tsx`

**File:** `src/app/(fire)/fire/page.tsx`

Replace the entire file with the new aggregate dashboard. This is the most complex task — it fetches stats from all portfolios, converts to a base currency, computes aggregate totals, and renders an SVG donut chart.

### SVG Donut Chart Math

The chart is drawn as a set of SVG `<path>` arc segments arranged in a circle.

- **Center:** `cx=100, cy=100` (within a 200×200 viewBox)
- **Outer radius:** `R=80`, **Inner radius:** `r=52` (creates the donut hole, thickness = 28px)
- Each segment sweeps an angle proportional to its portfolio's share of total net worth
- Arc direction: clockwise, starting from the top (12 o'clock = -90°)

**Arc path algorithm per segment:**

```
startAngle = currentAngle (in degrees, starts at -90)
endAngle   = startAngle + (slice.value / total) * 360

// Convert to radians
startRad = startAngle * (Math.PI / 180)
endRad   = endAngle   * (Math.PI / 180)

// Outer arc points
x1 = cx + R * cos(startRad)   // outer arc start
y1 = cy + R * sin(startRad)
x2 = cx + R * cos(endRad)     // outer arc end
y2 = cy + R * sin(endRad)

// Inner arc points
x3 = cx + r * cos(endRad)     // inner arc start (going back CCW)
y3 = cy + r * sin(endRad)
x4 = cx + r * cos(startRad)   // inner arc end
y4 = cy + r * sin(startRad)

// largeArcFlag = 1 if sweep > 180°, else 0
largeArcFlag = (endAngle - startAngle) > 180 ? 1 : 0

d = `M ${x1} ${y1}
     A ${R} ${R} 0 ${largeArcFlag} 1 ${x2} ${y2}
     L ${x3} ${y3}
     A ${r} ${r} 0 ${largeArcFlag} 0 ${x4} ${y4}
     Z`
```

**Note on single-portfolio case:** If there is only one portfolio (100% of total), draw a full donut ring with two half-arcs to avoid SVG degenerate arc edge-cases:
- First half: 0° → 180°
- Second half: 180° → 360°
Both get the same fill color.

### Steps

- [ ] Replace `src/app/(fire)/fire/page.tsx` entirely with the following content:

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  portfolioApi,
  portfolioStatsApi,
  exchangeRateApi,
} from '@/lib/fire/api';
import type { Portfolio, PortfolioStats } from '@/lib/fire/api';
import {
  colors,
  Loader,
  StatCard,
  CurrencyCombobox,
} from '@/components/fire/ui';

// ── constants ──────────────────────────────────────────────────────────────

const PALETTE = [
  '#5E6AD2', // accent violet
  '#4ADE80', // neon green
  '#F87171', // neon red
  '#60A5FA', // neon blue
  '#FBBF24', // neon yellow
  '#A78BFA', // purple
  '#67E8F9', // cyan
  '#FB923C', // orange
];

// ── helpers ────────────────────────────────────────────────────────────────

function fmtNumber(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function convertToBase(
  value: number,
  fromCurrency: string,
  rates: Record<string, number>
): number {
  if (!rates[fromCurrency] || rates[fromCurrency] === 0) return value;
  return value / rates[fromCurrency];
}

// ── SVG Donut Chart ────────────────────────────────────────────────────────

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

function buildArcPath(
  cx: number,
  cy: number,
  R: number,
  r: number,
  startAngleDeg: number,
  endAngleDeg: number
): string {
  const toRad = (deg: number) => deg * (Math.PI / 180);

  const startRad = toRad(startAngleDeg);
  const endRad = toRad(endAngleDeg);

  const x1 = cx + R * Math.cos(startRad);
  const y1 = cy + R * Math.sin(startRad);
  const x2 = cx + R * Math.cos(endRad);
  const y2 = cy + R * Math.sin(endRad);

  const x3 = cx + r * Math.cos(endRad);
  const y3 = cy + r * Math.sin(endRad);
  const x4 = cx + r * Math.cos(startRad);
  const y4 = cy + r * Math.sin(startRad);

  const largeArc = endAngleDeg - startAngleDeg > 180 ? 1 : 0;

  return [
    `M ${x1.toFixed(4)} ${y1.toFixed(4)}`,
    `A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(4)} ${y2.toFixed(4)}`,
    `L ${x3.toFixed(4)} ${y3.toFixed(4)}`,
    `A ${r} ${r} 0 ${largeArc} 0 ${x4.toFixed(4)} ${y4.toFixed(4)}`,
    'Z',
  ].join(' ');
}

function DonutChart({ slices }: { slices: DonutSlice[] }) {
  const cx = 100;
  const cy = 100;
  const R = 80;
  const r = 52;

  const total = slices.reduce((sum, s) => sum + s.value, 0);

  if (total === 0 || slices.length === 0) {
    return (
      <svg viewBox="0 0 200 200" width="200" height="200">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={colors.border} strokeWidth={R - r} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill={colors.muted} fontSize="11">
          No data
        </text>
      </svg>
    );
  }

  // Single-portfolio: draw two half-arcs to avoid degenerate arc
  if (slices.length === 1) {
    const col = slices[0].color;
    return (
      <svg viewBox="0 0 200 200" width="200" height="200">
        <path d={buildArcPath(cx, cy, R, r, -90, 90)} fill={col} />
        <path d={buildArcPath(cx, cy, R, r, 90, 270)} fill={col} />
      </svg>
    );
  }

  let currentAngle = -90; // start at top (12 o'clock)
  const paths: React.ReactNode[] = [];

  slices.forEach((slice, i) => {
    const sweep = (slice.value / total) * 360;
    if (sweep < 0.01) return; // skip negligible slices
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;

    paths.push(
      <path
        key={i}
        d={buildArcPath(cx, cy, R, r, startAngle, endAngle)}
        fill={slice.color}
      />
    );

    currentAngle = endAngle;
  });

  return (
    <svg viewBox="0 0 200 200" width="200" height="200">
      {paths}
    </svg>
  );
}

// ── component ──────────────────────────────────────────────────────────────

export default function FireDashboard() {
  const router = useRouter();

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, PortfolioStats>>({});
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [baseCurrency, setBaseCurrencyState] = useState('USD');
  const [rates, setRates] = useState<Record<string, number>>({});

  const setBaseCurrency = useCallback((val: string) => {
    setBaseCurrencyState(val);
    localStorage.setItem('fire_base_currency', val);
  }, []);

  // Load portfolios and their stats on mount
  useEffect(() => {
    const saved = localStorage.getItem('fire_base_currency');
    if (saved) setBaseCurrencyState(saved);

    portfolioApi.list().then(r => {
      if (r.success && r.data) {
        const list = r.data;
        setPortfolios(list);
        setLoading(false);

        if (list.length > 0) {
          setStatsLoading(true);
          Promise.all(list.map(p => portfolioStatsApi.getStats(p.id))).then(results => {
            const map: Record<string, PortfolioStats> = {};
            results.forEach((res, i) => {
              if (res.success && res.data) {
                map[list[i].id] = res.data;
              }
            });
            setStatsMap(map);
            setStatsLoading(false);
          });
        }
      } else {
        setLoading(false);
      }
    });
  }, []);

  // Load exchange rates whenever portfolios or base currency changes
  useEffect(() => {
    if (portfolios.length === 0) return;
    const uniqueCurrencies = [...new Set(portfolios.map(p => p.currency))];
    exchangeRateApi.get(baseCurrency, uniqueCurrencies).then(r => {
      if (r.success && r.data) {
        setRates(r.data.rates);
      }
    });
  }, [portfolios, baseCurrency]);

  // ── aggregate computations ──────────────────────────────────────────────

  const hasStats = !statsLoading && Object.keys(statsMap).length > 0;

  let totalNetWorth = 0;
  let totalCost = 0;
  let totalUnrealizedPL = 0;
  let totalRealizedPL = 0;
  let totalDividendYTD = 0;

  portfolios.forEach(p => {
    const stats = statsMap[p.id];
    if (!stats) return;
    totalNetWorth    += convertToBase(stats.total_value,   p.currency, rates);
    totalCost        += convertToBase(stats.total_cost,    p.currency, rates);
    totalUnrealizedPL += convertToBase(stats.unrealized_pl, p.currency, rates);
    totalRealizedPL  += convertToBase(stats.realized_pl,   p.currency, rates);
    totalDividendYTD += convertToBase(stats.dividend_ytd,  p.currency, rates);
  });

  const unrealizedPct = totalCost > 0
    ? (totalUnrealizedPL / totalCost) * 100
    : 0;

  // Build donut slices — one per portfolio, value = converted net worth
  const donutSlices: DonutSlice[] = portfolios
    .filter(p => statsMap[p.id])
    .map((p, i) => ({
      label: p.name,
      value: convertToBase(statsMap[p.id].total_value, p.currency, rates),
      color: PALETTE[i % PALETTE.length],
    }))
    .filter(s => s.value > 0);

  // ── table styles ────────────────────────────────────────────────────────

  const thStyle: React.CSSProperties = {
    padding: '8px 12px',
    textAlign: 'left',
    color: colors.muted,
    fontWeight: 500,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: `1px solid ${colors.border}`,
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    color: colors.text,
    fontSize: 12,
    borderBottom: `1px solid ${colors.border}`,
  };

  // ── render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Loader size="md" variant="bar" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Dashboard</h1>
            <p style={{ color: colors.muted, fontSize: 13, margin: '4px 0 0' }}>Total across all portfolios</p>
          </div>
          <div style={{ width: 180 }}>
            <CurrencyCombobox value={baseCurrency} onChange={setBaseCurrency} />
          </div>
        </div>
      </div>

      {portfolios.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 80, color: colors.muted }}>
          <p style={{ marginBottom: 16, fontSize: 14 }}>No portfolios yet.</p>
          <a
            href="/fire/portfolios"
            style={{ color: colors.accent, fontSize: 13, textDecoration: 'none' }}
          >
            Go to Portfolios to create one →
          </a>
        </div>
      ) : (
        <>
          {/* ── Stat cards ──────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <StatCard
              label="Net Worth"
              value={statsLoading ? '—' : `${baseCurrency} ${fmtNumber(totalNetWorth)}`}
              valueColor="text"
            />
            <StatCard
              label="Total Cost"
              value={statsLoading ? '—' : `${baseCurrency} ${fmtNumber(totalCost)}`}
              valueColor="text"
            />
            <StatCard
              label="Unrealized P&L"
              value={statsLoading ? '—' : `${totalUnrealizedPL >= 0 ? '+' : ''}${baseCurrency} ${fmtNumber(totalUnrealizedPL)}`}
              valueColor={statsLoading ? 'text' : totalUnrealizedPL >= 0 ? 'positive' : 'negative'}
              trend={
                hasStats && totalCost > 0
                  ? {
                      value: `${unrealizedPct >= 0 ? '+' : ''}${unrealizedPct.toFixed(2)}%`,
                      direction: unrealizedPct >= 0 ? 'up' : 'down',
                    }
                  : undefined
              }
            />
            <StatCard
              label="Realized P&L"
              value={statsLoading ? '—' : `${totalRealizedPL >= 0 ? '+' : ''}${baseCurrency} ${fmtNumber(totalRealizedPL)}`}
              valueColor={statsLoading ? 'text' : totalRealizedPL >= 0 ? 'positive' : 'negative'}
            />
          </div>

          {/* ── Charts row ──────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

            {/* Asset Distribution donut */}
            <div style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: 20,
            }}>
              <p style={{ color: colors.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px' }}>
                Asset Distribution
              </p>
              {statsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40, paddingBottom: 40 }}>
                  <Loader size="sm" variant="dots" />
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  {/* Chart */}
                  <div style={{ flexShrink: 0 }}>
                    <DonutChart slices={donutSlices} />
                  </div>
                  {/* Legend */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                    {donutSlices.map((slice, i) => {
                      const total = donutSlices.reduce((sum, s) => sum + s.value, 0);
                      const pct = total > 0 ? ((slice.value / total) * 100).toFixed(1) : '0.0';
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <div style={{
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            backgroundColor: slice.color,
                            flexShrink: 0,
                          }} />
                          <span style={{
                            color: colors.text,
                            fontSize: 12,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {slice.label}
                          </span>
                          <span style={{ color: colors.muted, fontSize: 11, marginLeft: 'auto', flexShrink: 0 }}>
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* YTD Dividends */}
            <div style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: 20,
            }}>
              <p style={{ color: colors.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px' }}>
                YTD Dividends
              </p>
              {statsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40, paddingBottom: 40 }}>
                  <Loader size="sm" variant="dots" />
                </div>
              ) : (
                <>
                  {/* Big total */}
                  <div style={{ marginBottom: 20 }}>
                    <span style={{
                      color: totalDividendYTD >= 0 ? colors.positive : colors.negative,
                      fontSize: 28,
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {baseCurrency} {fmtNumber(totalDividendYTD)}
                    </span>
                  </div>
                  {/* Per-portfolio breakdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {portfolios.map((p, i) => {
                      const stats = statsMap[p.id];
                      if (!stats) return null;
                      const converted = convertToBase(stats.dividend_ytd, p.currency, rates);
                      return (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 8,
                              height: 8,
                              borderRadius: 2,
                              backgroundColor: PALETTE[i % PALETTE.length],
                              flexShrink: 0,
                            }} />
                            <span style={{ color: colors.muted, fontSize: 12 }}>{p.name}</span>
                          </div>
                          <span style={{ color: converted >= 0 ? colors.positive : colors.negative, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                            {baseCurrency} {fmtNumber(converted)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Portfolio summary table ──────────────────────────────────── */}
          <div style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}` }}>
              <p style={{ color: colors.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                Portfolio Summary
              </p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Portfolio</th>
                  <th style={thStyle}>Currency</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Net Worth ({baseCurrency})</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Unrealized P&amp;L ({baseCurrency})</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Realized P&amp;L ({baseCurrency})</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>YTD Div ({baseCurrency})</th>
                </tr>
              </thead>
              <tbody>
                {portfolios.map(p => {
                  const stats = statsMap[p.id];
                  const netWorth    = stats ? convertToBase(stats.total_value,   p.currency, rates) : null;
                  const unrealized  = stats ? convertToBase(stats.unrealized_pl, p.currency, rates) : null;
                  const realized    = stats ? convertToBase(stats.realized_pl,   p.currency, rates) : null;
                  const ytdDiv      = stats ? convertToBase(stats.dividend_ytd,  p.currency, rates) : null;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/fire/portfolios/${p.id}`)}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = colors.surfaceLight;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '';
                      }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{p.name}</td>
                      <td style={{ ...tdStyle, color: colors.muted }}>{p.currency}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: colors.text }}>
                        {statsLoading || netWorth === null ? <span style={{ color: colors.muted }}>—</span> : fmtNumber(netWorth)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {statsLoading || unrealized === null ? (
                          <span style={{ color: colors.muted }}>—</span>
                        ) : (
                          <span style={{ color: unrealized >= 0 ? colors.positive : colors.negative }}>
                            {unrealized >= 0 ? '+' : ''}{fmtNumber(unrealized)}
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {statsLoading || realized === null ? (
                          <span style={{ color: colors.muted }}>—</span>
                        ) : (
                          <span style={{ color: realized >= 0 ? colors.positive : colors.negative }}>
                            {realized >= 0 ? '+' : ''}{fmtNumber(realized)}
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {statsLoading || ytdDiv === null ? (
                          <span style={{ color: colors.muted }}>—</span>
                        ) : (
                          <span style={{ color: ytdDiv >= 0 ? colors.positive : colors.negative }}>
                            {ytdDiv >= 0 ? '+' : ''}{fmtNumber(ytdDiv)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] TypeScript compile check:
```bash
cd /Users/telephant/projects/firewise/firewise-web && npx tsc --noEmit 2>&1 | head -20
```
- [ ] Git commit:
```bash
cd /Users/telephant/projects/firewise/firewise-web && git add src/app/\(fire\)/fire/page.tsx && git commit -m "feat: redesign /fire as aggregate dashboard with donut chart and stat cards"
```

---

## Final Verification

After all tasks are complete, perform a final compile and smoke-test checklist:

- [ ] Full TypeScript compile passes with no errors:
```bash
cd /Users/telephant/projects/firewise/firewise-web && npx tsc --noEmit 2>&1
```
- [ ] Sidebar shows: Dashboard → Portfolios → Family → DCA (in that order)
- [ ] `/fire` shows Dashboard with 4 stat cards, donut chart, YTD dividends panel, and compact portfolio table
- [ ] `/fire/portfolios` shows the full portfolio list (same as old `/fire`)
- [ ] `/fire/portfolios/[id]` shows breadcrumb `Portfolios / {name}` above the h1
- [ ] `/fire/dca` shows breadcrumb `DCA` above the h1
- [ ] `/fire/family` shows breadcrumb `Family` above the h1
- [ ] Clicking Portfolios nav item highlights correctly; navigating to a portfolio detail also keeps Portfolios highlighted
- [ ] Dashboard nav item (`/fire`, exact match) is only highlighted on the dashboard, not on sub-pages
