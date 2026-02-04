# FIRE UI Guidelines

## Design System

The FIRE module uses a **Linear-inspired dark mode** aesthetic with a dark neutral background and subtle borders.

### Theme Colors

```tsx
import { colors } from '@/components/fire/ui';

colors.bg          // Page background (#0A0A0B)
colors.surface     // Card background (#141415)
colors.surfaceLight // Elevated surface (#1C1C1E)
colors.text        // Primary text (#EDEDEF)
colors.muted       // Secondary text (#7C7C82)
colors.border      // Borders (rgba(255,255,255,0.08))
colors.accent      // Linear violet (#5E6AD2)
colors.accentLight // Lighter violet (#7C85DE)
colors.positive    // Success green (#4ADE80)
colors.negative    // Error red (#F87171)
colors.info        // Info blue (#60A5FA)
colors.warning     // Warning yellow (#FBBF24)
colors.purple      // Purple accent (#A78BFA)
colors.cyan        // Cyan accent (#67E8F9)
```

---

## Core Rules

### 1. Loading States

Always use the `<Loader>` component instead of text like "Loading...".

```tsx
import { Loader } from '@/components/fire/ui';

// Card/container loading
<Loader size="md" variant="bar" />

// Full page/section loading
<Loader size="lg" variant="bar" text="Loading dashboard..." />

// Inline/small loading
<Loader size="sm" variant="dots" />
```

**Variants:**
- `bar` - Data fetching in cards
- `dots` - Small inline/form loading

### 2. Form Labels

Use context-aware labels that describe the action, not generic "From/To".

```tsx
// Good
"Pay From", "Deposit To", "Spend On", "Buy"

// Bad
"From", "To"
```

### 3. Button Text

Use action-specific text for submit buttons.

```tsx
// Good
"Record Expense", "Record Income", "Save Configuration"

// Bad
"Submit", "Create", "Save"
```

### 4. Cards

Always use the `<Card>` component with a title.

```tsx
import { Card } from '@/components/fire/ui';

<Card title="Monthly Expenses">
  {/* content */}
</Card>
```

**Fixed Height Cards (Dashboard)**

For dashboard cards, use `contentHeight` to prevent layout shifts during loading/empty states:

```tsx
const CARD_HEIGHT = '280px';

// Loading state
<Card title="Assets" contentHeight={CARD_HEIGHT}>
  <div className="h-full flex items-center justify-center">
    <Loader size="md" variant="bar" />
  </div>
</Card>

// Empty state
<Card title="Assets" contentHeight={CARD_HEIGHT}>
  <div className="h-full flex items-center justify-center text-xs" style={{ color: colors.muted }}>
    No data yet.
  </div>
</Card>

// With data (scrollable content + fixed footer)
<Card title="Assets" contentHeight={CARD_HEIGHT}>
  <div className="h-full flex flex-col">
    <div className="flex-1 overflow-y-auto min-h-0">
      {/* Scrollable list items */}
    </div>
    <div className="flex-shrink-0 pt-2">
      {/* Fixed footer (total, link, etc.) */}
    </div>
  </div>
</Card>
```

### 5. Styling

Use `colors` theme tokens for all styling. Inline styles directly — no preset objects.

```tsx
import { colors } from '@/components/fire/ui';

// Card-like surface
style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px' }}

// Inset/elevated surface
style={{ backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}`, borderRadius: '6px' }}

// Text colors
style={{ color: colors.muted }}
style={{ color: colors.text }}
style={{ color: colors.positive }}
```

### 6. Form Inputs

Always use the shared `Input`, `Select`, and `CurrencyCombobox` components from the UI library. Never use raw HTML `<input>` or `<select>` elements.

```tsx
import { Input, Select } from '@/components/fire/ui';

<Input label="Search" placeholder="Search assets..." value={q} onChange={...} />
<Select label="Type" value={type} onChange={...} options={options} />
```

---

## Component Imports

All FIRE UI components are exported from a single entry point:

```tsx
import {
  // Theme
  colors,
  typography,

  // Components
  Button,
  Card,
  Input,
  Select,
  Label,
  Loader,
  Dialog,
  Tabs,

  // Charts
  BarChart,
  StackedBarChart,
  PieChart,

  // Icons (Lucide re-exports)
  IconPlus,
  IconArrow,
  // ...
} from '@/components/fire/ui';
```
