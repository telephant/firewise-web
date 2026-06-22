# Firewise Frontend — CLAUDE.md

## 每次对话开始时必读（按顺序）

1. `docs/loop.md` — **首先读这个**，进入 IDLE 状态，开始驱动任务
2. `docs/todo/` — 扫描所有 pending 任务，按 priority 排序
3. `docs/product.md` — 产品功能全貌（执行任务前理解上下文）
4. `docs/architecture.md` — 技术架构和关键约定（找代码入口）

读完后直接进入 loop，不需要等用户发令。

---

# 前端开发规范

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

### Date inputs (CRITICAL)
**NEVER use native `<input type="date">` in fire pages.** Always use the custom `DateInput` component:
```tsx
import { DateInput } from '@/components/fire/ui';
<DateInput
  label="DATE"
  value={form.date}           // 'YYYY-MM-DD' string
  onChange={v => setForm(f => ({ ...f, date: v }))}
/>
```
The `DateInput` component (`src/components/fire/ui/date-input.tsx`) is a custom calendar popover that matches the dark-mode design system.

## Multi-Currency Aggregation (CRITICAL)

**NEVER sum amounts across different currencies without conversion.** Accounts in this app can hold different currencies (USD, SGD, AED, etc.).

- Showing a raw sum across currencies (e.g. total balance on the Savings page) is a known simplification and must be clearly labeled as approximate or avoided.
- For accurate totals, either: (a) require the user to select a display currency and convert, or (b) show per-currency subtotals instead of a single total.
- When building any "total" or "summary" stat for multi-currency data, leave a `// TODO: multi-currency` comment if you are intentionally skipping conversion, so it is visible in review.
