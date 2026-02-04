'use client';

import { colors } from '../theme';

export interface BarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  /** @deprecated No longer used - kept for API compatibility */
  blockWidth?: number;
  /** @deprecated No longer used - kept for API compatibility */
  gapWidth?: number;
  /** @deprecated No longer used - kept for API compatibility */
  innerPadding?: number;
  /** @deprecated No longer used - kept for API compatibility */
  trackColor?: string;
}

/**
 * Clean rounded bar shape for use with Recharts
 *
 * Usage with Recharts:
 * ```tsx
 * <Bar dataKey="value" shape={<BarShape />} />
 * ```
 */
export function BarShape(props: BarShapeProps) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    fill = colors.accent,
  } = props;

  if (width <= 0 || height <= 0) return null;

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      rx={3}
      ry={3}
    />
  );
}
