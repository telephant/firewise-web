# Firewise Technical Stack

## Frontend Framework

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety

## Styling

- **Tailwind CSS** - Utility-first CSS framework
- **Retro Theme** - Custom Windows 95/98 inspired design system (`src/components/fire/ui/theme.ts`)

## Data Fetching

- **SWR** - React hooks for data fetching with caching and revalidation

## Charts

### Recharts

**Package:** `recharts` v3.6.0

**Location:** `src/components/fire/ui/charts/`

Recharts is used for data visualization throughout the FIRE application. We provide reusable retro-styled chart components that match the Windows 95/98 aesthetic.

### Reusable Chart Components

#### RetroBarShape

A custom SVG bar shape with Windows 95 segmented block style.

**Location:** `src/components/fire/ui/charts/retro-bar-shape.tsx`

**Features:**
- Segmented blocks (8px wide) with 2px gaps
- Sunken track background
- 3D beveled blocks with highlights and shadows

```tsx
import { RetroBarShape } from '@/components/fire/ui';

// Use with Recharts Bar component
<Bar dataKey="value" shape={<RetroBarShape />} />

// Customizable props
<RetroBarShape
  blockWidth={8}      // Width of each segment
  gapWidth={2}        // Gap between segments
  innerPadding={2}    // Padding inside track
  trackColor={retro.bevelMid}
/>
```

#### RetroBarChart

A complete horizontal bar chart wrapper with retro styling built-in.

**Location:** `src/components/fire/ui/charts/retro-bar-chart.tsx`

```tsx
import { RetroBarChart, retro } from '@/components/fire/ui';

<RetroBarChart
  data={[
    { name: 'Salary', value: 5000, fill: retro.positive },
    { name: 'Freelance', value: 3000, fill: retro.info },
    { name: 'Dividends', value: 1200, fill: retro.accent },
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

#### RetroStackedBarChart

Horizontal stacked bar chart with brush navigation. Groups items by name and shows category breakdown as stacked segments with hover tooltips.

**Location:** `src/components/fire/ui/charts/retro-stacked-bar-chart.tsx`

**Features:**
- Stacked segments within each bar (e.g., individual stocks within "Dividends")
- Brush navigation for many items
- Hover tooltip showing breakdown
- Auto-coloring by category

```tsx
import { RetroStackedBarChart } from '@/components/fire/ui';
import type { StackedBarItem } from '@/components/fire/ui';

const data: StackedBarItem[] = [
  { name: 'Dividends', amount: 500, category: 'AAPL' },
  { name: 'Dividends', amount: 300, category: 'MSFT' },
  { name: 'Dividends', amount: 200, category: 'GOOG' },
  { name: 'Rental', amount: 1500, category: 'Property A' },
  { name: 'Rental', amount: 1200, category: 'Property B' },
  { name: 'Salary', amount: 5000, category: 'salary' },
];

<RetroStackedBarChart
  data={data}
  height={200}
  valueFormatter={(v) => formatCurrency(v)}
  showBrush={true}      // Enable brush navigation
  visibleBars={5}       // Bars visible at once
/>
```

**Result:** Each row shows a stacked bar where segments represent individual items (stocks, properties, etc.) with different colors. Hover reveals the breakdown.

### Retro Chart Styling Guidelines

1. **Segmented Blocks** - Windows 95 progress bar style with individual raised blocks
2. **Sunken Track** - Background has inverted bevel (dark top-left, light bottom-right)
3. **3D Beveled Blocks** - Each block has highlight on top/left, shadow on bottom/right
4. **Retro Colors** - Use colors from `retro` theme (`retro.info`, `retro.positive`, etc.)
5. **Monospace Values** - Use monospace font for numerical values
6. **Sunken Containers** - Wrap charts in panels with `inset` box-shadows

### Components Using Charts

| Component | Chart Type | Location |
|-----------|------------|----------|
| TopIncomeSources | RetroStackedBarChart | `src/components/fire/flows/top-income-sources.tsx` |
| MostActiveAssets | RetroBarChart (dual bars) | `src/components/fire/flows/most-active-assets.tsx` |

## Authentication

- **Supabase Auth** - Authentication provider

## Database

- **Supabase** - PostgreSQL database with real-time subscriptions

## Form Handling

- **Custom Form System** - Built-in form components with validation (`src/components/fire/ui/form.tsx`)

## UI Components

Custom retro-styled component library at `src/components/fire/ui/`:

**Core Components:**
- Button, Input, Select, Label
- Card, Dialog, Tabs
- Sidebar navigation
- Loader animations
- Form components with validation

**Charts** (`src/components/fire/ui/charts/`):
- RetroBarShape - Windows 95 segmented bar shape
- RetroBarChart - Complete horizontal bar chart

**Progress Indicators:**
- ProgressBar - Full-featured progress with label
- SimpleProgressBar - Lightweight progress bar
