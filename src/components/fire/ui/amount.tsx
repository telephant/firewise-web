'use client';

import { useMemo } from 'react';
import { usePrivacyOptional } from '@/contexts/fire/privacy-context';
import { colors } from './theme';
import { formatCurrency } from '@/lib/fire/utils';

export type AmountSizePreset = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AmountSize = AmountSizePreset | number;
export type AmountColorPreset = 'default' | 'positive' | 'negative' | 'muted' | 'accent' | 'auto';
export type AmountColor = AmountColorPreset | (string & {});  // Preset or custom color string

export interface AmountProps {
  /** The numeric value to display */
  value: number;
  /** Currency code (e.g., 'USD', 'EUR'). If not provided, no currency symbol shown */
  currency?: string;
  /** Size - preset ('xs'|'sm'|'md'|'lg'|'xl'|'2xl') or number (px) */
  size?: AmountSize;
  /** Color variant. 'auto' will use positive/negative based on value */
  color?: AmountColor;
  /** Show +/- sign prefix */
  showSign?: boolean;
  /** Show currency symbol */
  showCurrency?: boolean;
  /** Number of decimal places (default: 2) */
  decimals?: number;
  /** Use compact notation for large numbers (e.g., 1.2M) */
  compact?: boolean;
  /** Font weight override */
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  /** Additional className */
  className?: string;
  /** Inline style overrides */
  style?: React.CSSProperties;
}

// Size mappings for presets
const SIZE_CLASSES: Record<AmountSizePreset, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
};

const SIZE_PX: Record<AmountSizePreset, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
};

const WEIGHT_CLASSES: Record<string, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

// Get dot config based on font size in px
function getDotConfig(fontSize: number): { baseSize: number; count: number; width: number } {
  if (fontSize <= 12) return { baseSize: 3, count: 5, width: 32 };
  if (fontSize <= 14) return { baseSize: 3.5, count: 6, width: 40 };
  if (fontSize <= 16) return { baseSize: 4, count: 7, width: 48 };
  if (fontSize <= 18) return { baseSize: 4.5, count: 7, width: 56 };
  if (fontSize <= 20) return { baseSize: 5, count: 8, width: 64 };
  if (fontSize <= 24) return { baseSize: 6, count: 9, width: 80 };
  // For larger sizes, scale proportionally
  const baseSize = Math.round(fontSize * 0.25);
  return { baseSize, count: 10, width: Math.round(fontSize * 3.5) };
}

// Seeded random for consistent dot positions
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

// Preset color values
const COLOR_PRESETS: Record<AmountColorPreset, string | null> = {
  default: colors.text,
  positive: colors.positive,
  negative: colors.negative,
  muted: colors.muted,
  accent: colors.accent,
  auto: null, // handled specially
};

// Get color value - supports presets and custom color strings
function getColorValue(color: AmountColor, value: number): string {
  // Check if it's the 'auto' preset
  if (color === 'auto') {
    if (value > 0) return colors.positive;
    if (value < 0) return colors.negative;
    return colors.text;
  }

  // Check if it's a known preset
  if (color in COLOR_PRESETS) {
    return COLOR_PRESETS[color as AmountColorPreset] || colors.text;
  }

  // Otherwise treat as custom color string
  return color;
}

// Currency symbol mapping
function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
    KRW: '₩',
    INR: '₹',
    BTC: '₿',
    ETH: 'Ξ',
  };
  return symbols[currency.toUpperCase()] || currency;
}

// Animated floating dots component - organic dissolving cluster effect
function FloatingDots({
  fontSize,
  colorValue
}: {
  fontSize: number;
  colorValue: string;
}) {
  const config = getDotConfig(fontSize);
  const height = config.baseSize * 3.5;

  // Generate dot configurations with seeded randomness for consistency
  const dots = useMemo(() => {
    return Array.from({ length: config.count }).map((_, i) => {
      const seed = i * 7 + 3;
      // Position dots in a cloud-like cluster with slight randomness
      const baseX = (i / (config.count - 1)) * (config.width - config.baseSize);
      const xJitter = (seededRandom(seed + 10) - 0.5) * config.baseSize * 0.8;
      const x = baseX + xJitter;
      // Vertical offset creates organic wave pattern
      const yOffset = Math.sin(i * 0.9 + seededRandom(seed) * 2) * (height * 0.25);
      // Size variation (0.5x to 1.3x base size)
      const sizeMultiplier = 0.5 + seededRandom(seed) * 0.8;
      const size = config.baseSize * sizeMultiplier;
      // Animation parameters - varied for organic feel
      const duration = 1.8 + seededRandom(seed + 1) * 1.4;
      const delay = seededRandom(seed + 2) * 1.2;
      // Animation variant (0-5 for different keyframes)
      const variant = i % 6;

      return { x, yOffset, size, duration, delay, variant };
    });
  }, [config.count, config.width, config.baseSize, height]);

  return (
    <>
      <span
        className="inline-block relative align-middle"
        style={{
          width: config.width,
          height: height,
          marginLeft: 2,
        }}
      >
        {dots.map((dot, i) => (
          <span
            key={i}
            className={`privacy-dot privacy-dot-${dot.variant} absolute rounded-full`}
            style={{
              width: dot.size,
              height: dot.size,
              left: dot.x,
              top: `calc(50% + ${dot.yOffset}px)`,
              backgroundColor: colorValue,
              animationDuration: `${dot.duration}s`,
              animationDelay: `${dot.delay}s`,
            }}
          />
        ))}
      </span>
      <style jsx>{`
        .privacy-dot {
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          transform: translateY(-50%);
        }
        .privacy-dot-0 {
          animation-name: float-drift-0;
        }
        .privacy-dot-1 {
          animation-name: float-drift-1;
        }
        .privacy-dot-2 {
          animation-name: float-drift-2;
        }
        .privacy-dot-3 {
          animation-name: float-drift-3;
        }
        .privacy-dot-4 {
          animation-name: float-drift-4;
        }
        .privacy-dot-5 {
          animation-name: float-drift-5;
        }
        @keyframes float-drift-0 {
          0%, 100% { opacity: 0.35; transform: translateY(-50%) scale(0.85); }
          50% { opacity: 0.95; transform: translate(2px, calc(-50% - 3px)) scale(1.15); }
        }
        @keyframes float-drift-1 {
          0%, 100% { opacity: 0.4; transform: translateY(-50%) scale(0.9); }
          45% { opacity: 0.85; transform: translate(-2px, calc(-50% + 2px)) scale(1.1); }
        }
        @keyframes float-drift-2 {
          0%, 100% { opacity: 0.3; transform: translateY(-50%) scale(0.95); }
          55% { opacity: 0.9; transform: translate(1px, calc(-50% + 3px)) scale(1.2); }
        }
        @keyframes float-drift-3 {
          0%, 100% { opacity: 0.45; transform: translateY(-50%) scale(0.8); }
          40% { opacity: 0.8; transform: translate(-1px, calc(-50% - 2px)) scale(1.05); }
        }
        @keyframes float-drift-4 {
          0%, 100% { opacity: 0.35; transform: translateY(-50%) scale(1); }
          60% { opacity: 0.95; transform: translate(3px, calc(-50% + 1px)) scale(1.1); }
        }
        @keyframes float-drift-5 {
          0%, 100% { opacity: 0.4; transform: translateY(-50%) scale(0.9); }
          35% { opacity: 0.85; transform: translate(-3px, calc(-50% - 1px)) scale(1.15); }
        }
      `}</style>
    </>
  );
}

export function Amount({
  value,
  currency,
  size = 'md',
  color = 'default',
  showSign = false,
  showCurrency = true,
  decimals = 2,
  compact = false,
  weight,
  className = '',
  style,
}: AmountProps) {
  const privacyContext = usePrivacyOptional();
  const isPrivacyMode = privacyContext?.isPrivacyMode ?? false;

  const colorValue = getColorValue(color, value);

  // Determine if size is preset or numeric
  const isPreset = typeof size === 'string';
  const fontSizePx = isPreset ? SIZE_PX[size as AmountSizePreset] : size;
  const sizeClass = isPreset ? SIZE_CLASSES[size as AmountSizePreset] : '';

  // Determine font weight
  const defaultWeight = fontSizePx >= 18 ? 'semibold' : 'medium';
  const weightClass = WEIGHT_CLASSES[weight || defaultWeight];

  // Format the value using formatCurrency for consistency
  const formattedAmount = useMemo(() => {
    const absValue = Math.abs(value);
    if (currency && showCurrency) {
      // Use formatCurrency for full currency formatting
      return formatCurrency(absValue, { currency, compact, decimals });
    }
    // No currency - just format the number
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      notation: compact ? 'compact' : 'standard',
      compactDisplay: 'short',
    });
    return formatter.format(absValue);
  }, [value, currency, showCurrency, decimals, compact]);

  const sign = useMemo(() => {
    if (!showSign) return '';
    if (value > 0) return '+';
    if (value < 0) return '-';
    return '';
  }, [value, showSign]);

  // For privacy mode, we need just the currency symbol
  const currencySymbol = currency && showCurrency ? getCurrencySymbol(currency) : '';

  // Build style object
  const computedStyle: React.CSSProperties = {
    color: colorValue,
    ...(!isPreset && { fontSize: fontSizePx }),
    ...style,
  };

  return (
    <span
      className={`${sizeClass} ${weightClass} ${className}`.trim()}
      style={computedStyle}
    >
      {sign}
      {isPrivacyMode ? (
        <>
          {currencySymbol}
          <FloatingDots fontSize={fontSizePx} colorValue={colorValue} />
        </>
      ) : (
        formattedAmount
      )}
    </span>
  );
}

// Convenience component for displaying balance (always shows currency)
export function Balance(props: Omit<AmountProps, 'showCurrency'>) {
  return <Amount {...props} showCurrency={true} />;
}

// Convenience component for displaying change (shows sign, auto color)
export function Change(props: Omit<AmountProps, 'showSign' | 'color'>) {
  return <Amount {...props} showSign={true} color="auto" />;
}
