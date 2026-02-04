# Firewise Technical Stack

## Frontend Framework

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety

## Styling

- **Tailwind CSS** - Utility-first CSS framework
- **Dark Mode Theme** - Linear-inspired dark design system (`src/components/fire/ui/theme.ts`)

## Data Fetching

- **SWR** - React hooks for data fetching with caching and revalidation

## Charts

### Recharts

**Package:** `recharts` v3.6.0

**Location:** `src/components/fire/ui/charts/`

Recharts is used for data visualization throughout the FIRE application. We provide reusable chart components that match the dark mode design.

### Reusable Chart Components

#### BarShape

A custom SVG bar shape for use with Recharts `<Bar>` component.

**Location:** `src/components/fire/ui/charts/bar-shape.tsx`

```tsx
import { BarShape } from '@/components/fire/ui';

// Use with Recharts Bar component
<Bar dataKey="value" shape={<BarShape />} />
```

#### BarChart

A complete horizontal bar chart wrapper with dark styling built-in.

**Location:** `src/components/fire/ui/charts/bar-chart.tsx`

```tsx
import { BarChart, colors } from '@/components/fire/ui';

<BarChart
  data={[
    { name: 'Salary', value: 5000, fill: colors.positive },
    { name: 'Freelance', value: 3000, fill: colors.info },
    { name: 'Dividends', value: 1200, fill: colors.accent },
  ]}
  valueFormatter={(v) => formatCurrency(v, { compact: true })}
  rowHeight={36}        // Height per bar
  labelWidth={100}      // Y-axis label width
  valueWidth={70}       // Right margin for values
  barSize={18}          // Bar thickness
  maxLabelLength={12}   // Truncate long labels
  showTooltip={false}   // Optional tooltip
/>
```

#### StackedBarChart

Horizontal stacked bar chart with brush navigation. Groups items by name and shows category breakdown as stacked segments with hover tooltips.

**Location:** `src/components/fire/ui/charts/stacked-bar-chart.tsx`

**Features:**
- Stacked segments within each bar (e.g., individual stocks within "Dividends")
- Brush navigation for many items
- Hover tooltip showing breakdown
- Auto-coloring by category

```tsx
import { StackedBarChart } from '@/components/fire/ui';
import type { StackedBarItem } from '@/components/fire/ui';

const data: StackedBarItem[] = [
  { name: 'Dividends', amount: 500, category: 'AAPL' },
  { name: 'Dividends', amount: 300, category: 'MSFT' },
  { name: 'Dividends', amount: 200, category: 'GOOG' },
  { name: 'Rental', amount: 1500, category: 'Property A' },
  { name: 'Rental', amount: 1200, category: 'Property B' },
  { name: 'Salary', amount: 5000, category: 'salary' },
];

<StackedBarChart
  data={data}
  height={200}
  valueFormatter={(v) => formatCurrency(v)}
  showBrush={true}      // Enable brush navigation
  visibleBars={5}       // Bars visible at once
/>
```

**Result:** Each row shows a stacked bar where segments represent individual items (stocks, properties, etc.) with different colors. Hover reveals the breakdown.

#### PieChart

Donut/pie chart with dark styling and label support.

**Location:** `src/components/fire/ui/charts/pie-chart.tsx`

```tsx
import { PieChart, colors } from '@/components/fire/ui';
import type { PieSegment } from '@/components/fire/ui';

const segments: PieSegment[] = [
  { name: 'Stocks', value: 50000, color: colors.accent },
  { name: 'Bonds', value: 20000, color: colors.info },
  { name: 'Cash', value: 10000, color: colors.positive },
];

<PieChart data={segments} />
```

### Chart Styling Guidelines

1. **Dark Theme** - Charts use `colors.surface` backgrounds with `colors.border` borders
2. **Smooth bars** - Simple rounded rectangles (`rx={3}`)
3. **Theme colors** - Use tokens from `colors` (`colors.info`, `colors.positive`, etc.)
4. **Monospace values** - Use `tabular-nums` class for numerical values
5. **Dark tooltips** - Tooltips use `colors.surface` background with subtle border

### Components Using Charts

| Component | Chart Type | Location |
|-----------|------------|----------|
| TopIncomeSources | StackedBarChart | `src/components/fire/flows/top-income-sources.tsx` |
| MostActiveAssets | BarChart (dual bars) | `src/components/fire/flows/most-active-assets.tsx` |

## Authentication

- **Supabase Auth** - Authentication provider

## Database

- **Supabase** - PostgreSQL database with real-time subscriptions

## Form Handling

- **Custom Form System** - Built-in form components with validation (`src/components/fire/ui/form.tsx`)

## UI Components

Custom dark-mode component library at `src/components/fire/ui/`:

**Core Components:**
- Button, Input, Select, Label
- Card, Dialog, Tabs
- Sidebar navigation
- Loader animations
- Form components with validation

**Charts** (`src/components/fire/ui/charts/`):
- BarShape - Custom bar shape for Recharts
- BarChart - Horizontal bar chart
- StackedBarChart - Stacked horizontal bar chart with brush
- PieChart - Donut/pie chart

**Progress Indicators:**
- ProgressBar - Full-featured progress with label
- SimpleProgressBar - Lightweight progress bar
