'use client';

import { retro } from '../theme';

export interface RetroBarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  /** Width of each block segment */
  blockWidth?: number;
  /** Gap between blocks */
  gapWidth?: number;
  /** Padding inside the track */
  innerPadding?: number;
  /** Background color for the track */
  trackColor?: string;
}

/**
 * Windows 95 style segmented bar shape for use with Recharts
 *
 * Usage with Recharts:
 * ```tsx
 * <Bar dataKey="value" shape={<RetroBarShape />} />
 * ```
 */
export function RetroBarShape(props: RetroBarShapeProps) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    fill = retro.accent,
    blockWidth = 8,
    gapWidth = 2,
    innerPadding = 2,
    trackColor = retro.bevelMid,
  } = props;

  if (width <= 0) return null;

  const blockUnit = blockWidth + gapWidth;
  const numBlocks = Math.floor(width / blockUnit);
  const blockHeight = height - innerPadding * 2;

  return (
    <g>
      {/* Sunken track background */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={trackColor}
      />
      {/* Inner shadow (top-left) - creates sunken effect */}
      <rect x={x} y={y} width={width} height={1} fill="rgba(0,0,0,0.3)" />
      <rect x={x} y={y} width={1} height={height} fill="rgba(0,0,0,0.3)" />
      {/* Inner highlight (bottom-right) */}
      <rect x={x} y={y + height - 1} width={width} height={1} fill="rgba(255,255,255,0.5)" />
      <rect x={x + width - 1} y={y} width={1} height={height} fill="rgba(255,255,255,0.5)" />

      {/* Segmented blocks */}
      {Array.from({ length: numBlocks }).map((_, i) => {
        const blockX = x + innerPadding + i * blockUnit;
        return (
          <g key={i}>
            {/* Main block */}
            <rect
              x={blockX}
              y={y + innerPadding}
              width={blockWidth}
              height={blockHeight}
              fill={fill}
            />
            {/* Block highlight (top) */}
            <rect
              x={blockX}
              y={y + innerPadding}
              width={blockWidth}
              height={1}
              fill="rgba(255,255,255,0.6)"
            />
            {/* Block highlight (left) */}
            <rect
              x={blockX}
              y={y + innerPadding}
              width={1}
              height={blockHeight}
              fill="rgba(255,255,255,0.4)"
            />
            {/* Block shadow (bottom) */}
            <rect
              x={blockX}
              y={y + innerPadding + blockHeight - 1}
              width={blockWidth}
              height={1}
              fill="rgba(0,0,0,0.3)"
            />
            {/* Block shadow (right) */}
            <rect
              x={blockX + blockWidth - 1}
              y={y + innerPadding}
              width={1}
              height={blockHeight}
              fill="rgba(0,0,0,0.2)"
            />
          </g>
        );
      })}
    </g>
  );
}
