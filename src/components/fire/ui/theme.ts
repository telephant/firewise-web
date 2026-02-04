// Linear-inspired dark UI theme
// Clean, minimal aesthetic with emoji category icons

export const colors = {
  // Core colors
  bg: '#0A0A0B',
  surface: '#141415',
  surfaceLight: '#1C1C1E',
  text: '#EDEDEF',
  muted: '#7C7C82',
  border: 'rgba(255,255,255,0.08)',

  // Accent - Linear violet
  accent: '#5E6AD2',
  accentLight: '#7C85DE',

  // Semantic
  positive: '#4ADE80',
  negative: '#F87171',
  info: '#60A5FA',
  warning: '#FBBF24',

  // Additional accents
  purple: '#A78BFA',
  cyan: '#67E8F9',
} as const;

// Typography scale
export const typography = {
  label: 'text-xs uppercase tracking-wide font-medium',
  labelMuted: 'text-xs tracking-wide',
  valueXl: 'text-3xl font-bold',
  valueLg: 'text-xl font-bold',
  valueMd: 'text-lg font-medium',
  valueSm: 'text-sm font-medium',
  body: 'text-sm',
  bodyMuted: 'text-xs',
} as const;

export type ColorTokens = typeof colors;
