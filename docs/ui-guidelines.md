# FIRE UI Guidelines

## Design System

The FIRE module uses a **Retro Windows 95/98** aesthetic with warm beige tones and 3D beveled effects.

### Theme Colors

```tsx
import { retro } from '@/components/fire/ui';

retro.bg          // Page background (warm beige)
retro.surface     // Card/window background
retro.text        // Primary text (deep navy)
retro.muted       // Secondary text
retro.accent      // Copper/burnt orange (actions)
retro.positive    // Success (forest green)
retro.negative    // Error (deep red)
```

---

## Core Rules

### 1. Loading States

Always use the `<Loader>` component instead of text like "Loading...".

```tsx
import { Loader } from '@/components/fire/ui';

// Full page/section loading
<Loader size="lg" variant="hourglass" text="Loading dashboard..." />

// Card/container loading
<Loader size="md" variant="bar" />

// Inline/small loading
<Loader size="sm" variant="dots" />
```

**Variants:**
- `hourglass` - Page-level loading (classic Windows wait)
- `bar` - Data fetching in cards (Windows file copy style)
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
  <div className="h-full flex items-center justify-center text-xs" style={{ color: retro.muted }}>
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

Use `retro` theme tokens and `retroStyles` presets instead of hardcoded colors.

```tsx
import { retro, retroStyles } from '@/components/fire/ui';

// Raised effect (buttons, cards)
style={retroStyles.raised}

// Sunken effect (inputs, wells)
style={retroStyles.sunken}

// Colors
style={{ color: retro.muted }}
```

---

## Component Imports

All FIRE UI components are exported from a single entry point:

```tsx
import {
  // Theme
  retro,
  retroStyles,

  // Components
  Button,
  Card,
  Input,
  Select,
  Label,
  Loader,
  Dialog,
  Tabs,

  // Icons
  IconDollar,
  IconArrow,
  // ...
} from '@/components/fire/ui';
```
