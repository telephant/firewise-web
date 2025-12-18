// Centralized design tokens and constants

// Card styling
export const CARD_STYLES = {
  base: 'rounded-2xl border-0 shadow-sm bg-card/80 backdrop-blur-sm',
  interactive: 'rounded-2xl border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 bg-card/80 backdrop-blur-sm',
} as const;

// Dialog sizes
export const DIALOG_SIZES = {
  sm: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
} as const;

// Icon sizes (for icon wrapper containers)
export const ICON_WRAPPER_SIZES = {
  sm: 'p-2 rounded-lg',
  md: 'p-2.5 rounded-xl',
  lg: 'p-3 rounded-xl',
} as const;

// Common padding
export const PADDING = {
  card: 'p-3',
  dialog: 'p-4',
} as const;

// Form field required indicator
export const REQUIRED_INDICATOR = 'text-destructive';
