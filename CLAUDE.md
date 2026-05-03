# Firewise Frontend — Development Rules

## Module Separation (CRITICAL)

This project has TWO completely separate modules with different stacks:

| Module | Routes | Layout | Sidebar | Style |
|--------|--------|--------|---------|-------|
| **Ledger** | `/dashboard/*` | `src/app/(dashboard)/layout.tsx` | `AppSidebar` (shadcn, light) | Default Tailwind |
| **Portfolio (Fire)** | `/fire/*` | `src/app/(fire)/layout.tsx` | `PortfolioSidebar` (custom dark) | Fire UI (`#0A0A0B` dark) |

**NEVER mix components between modules:**
- `/fire/*` pages MUST use `@/components/fire/ui` components (Card, Button, Input, Select, Loader, colors, etc.)
- `/fire/*` pages MUST NOT use shadcn `@/components/ui` components (those are for ledger only)
- `/dashboard/*` pages MUST NOT use `@/components/fire/ui` components

## Fire UI Design System

The fire module uses a **Linear-inspired dark mode** aesthetic.

### Import pattern
```tsx
import { colors, Card, Button, Input, Select, Loader, StatCard, DateInput, CurrencyCombobox } from '@/components/fire/ui';
```

### Theme colors
```ts
colors.bg           // '#0A0A0B' — page background
colors.surface      // '#141415' — card/panel background
colors.surfaceLight // '#1C1C1E' — elevated surface, hover state
colors.text         // '#EDEDEF' — primary text
colors.muted        // '#7C7C82' — secondary/label text
colors.border       // 'rgba(255,255,255,0.08)' — borders
colors.accent       // '#5E6AD2' — Linear violet (CTAs, active states)
colors.positive     // '#4ADE80' — gains, success (neon green)
colors.negative     // '#F87171' — losses, errors (neon red)
colors.info         // '#60A5FA' — informational (neon blue)
colors.warning      // '#FBBF24' — warnings (neon yellow)
colors.purple       // '#A78BFA' — purple accent
colors.cyan         // '#67E8F9' — cyan accent
```

### Neon color palette (charts, highlights)
The design uses vivid neon accents on a near-black background — similar to a Bloomberg terminal aesthetic. Numbers are color-coded:
- Positive values → `colors.positive` (#4ADE80 neon green)
- Negative values → `colors.negative` (#F87171 neon red)
- Neutral/info → `colors.info` (#60A5FA neon blue)

### Layout pattern for fire pages
```tsx
// Page wrapper
<div style={{ padding: '24px', backgroundColor: colors.bg, minHeight: '100vh' }}>
  {/* Header */}
  <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <h1 style={{ color: colors.text, fontSize: 24, fontWeight: 700 }}>Title</h1>
    <Button>Action</Button>
  </div>
  {/* Content */}
</div>
```

### Loading states
Always use `<Loader>` from fire/ui, never "Loading..." text or shadcn Skeleton:
```tsx
import { Loader } from '@/components/fire/ui';
<Loader size="md" variant="bar" />   // data fetching in cards
<Loader size="sm" variant="dots" />  // inline/form loading
```

### Cards
```tsx
import { Card } from '@/components/fire/ui';
<Card title="Holdings">content</Card>
<Card title="Stats" contentHeight="280px">content</Card>
```

### Stat cards
```tsx
import { StatCard } from '@/components/fire/ui';
<StatCard label="Total Value" value="$12,345" valueColor="positive" />
<StatCard label="Unrealized P&L" value="-$234" valueColor="negative" trend={{ value: '-2.3%', direction: 'down' }} />
```
