// Retro UI Theme - Windows 95/98 + Subtle Game-inspired design system
// Warm, nostalgic, 3D beveled aesthetic with muted game colors

export const retro = {
  // Core colors - warm beige base (classic desktop)
  bg: '#c8b8a0',              // Warmer beige page background
  surface: '#e8dcc8',         // Card/window background (parchment)
  surfaceLight: '#f5f0e5',    // Input/highlight background
  text: '#1a1a2e',            // Deep navy text (game-inspired)
  muted: '#5a5a6a',           // Muted purple-gray
  border: '#1a1a2e',          // Border color (matching text)

  // 3D effect colors
  bevelLight: '#f5f0e5',      // Light bevel (top-left highlight)
  bevelDark: '#1a1a2e',       // Dark bevel (bottom-right shadow)
  bevelMid: '#b5a590',        // Mid-tone for inset shadows

  // Accent colors - game cartridge gold/orange
  accent: '#c86428',          // Copper/burnt orange (NES cartridge)
  accentLight: '#e89050',     // Light copper

  // Semantic colors - subtle, muted game palette
  positive: '#2a7848',        // Forest green (game power-up)
  negative: '#a03030',        // Deep red (damage indicator)
  info: '#385898',            // Nintendo blue (muted)
  warning: '#b08020',         // Gold coin/treasure

  // Optional: additional game-inspired accents (subtle)
  purple: '#604878',          // Muted purple (magic/special)
  cyan: '#408090',            // Muted cyan (water/ice)

  // Two-tone background (from ui-example4.png)
  bgWheat: '#f5e6d3',         // Warm wheat/cream (left)
  bgBlue: '#b8d4d8',          // Soft teal/light blue (right)
} as const;

// Typography scale
export const typography = {
  // Labels
  label: 'text-xs uppercase tracking-wide font-medium',
  labelMuted: 'text-xs tracking-wide',

  // Values
  valueXl: 'text-3xl font-bold',
  valueLg: 'text-xl font-bold',
  valueMd: 'text-lg font-medium',
  valueSm: 'text-sm font-medium',

  // Body
  body: 'text-sm',
  bodyMuted: 'text-xs',
} as const;

// Retro 3D effect styles
export const retroStyles = {
  // Raised/convex effect (buttons, cards)
  raised: {
    backgroundColor: retro.surface,
    border: `2px solid ${retro.border}`,
    boxShadow: `3px 3px 0 ${retro.bevelDark}`,
  },

  // Sunken/concave effect (inputs, wells)
  sunken: {
    backgroundColor: retro.surfaceLight,
    border: `2px solid ${retro.border}`,
    boxShadow: `inset 2px 2px 0 ${retro.bevelMid}, inset -2px -2px 0 #fff`,
  },

  // Title bar style (no border - uses card's border)
  titleBar: {
    backgroundColor: retro.bevelMid,
  },

  // Window button (minimize, maximize, close)
  windowButton: {
    border: `1.5px solid ${retro.border}`,
    backgroundColor: retro.surface,
    boxShadow: `1px 1px 0 ${retro.bevelDark}`,
  },
} as const;

export type RetroTheme = typeof retro;
