'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  Brush,
} from 'recharts';
import { retro } from '../theme';

export interface StackedBarItem {
  /** The source name (e.g., "AAPL", "Property A", "Acme Corp") */
  name: string;
  amount: number;
  /** The category this belongs to (e.g., "dividend", "rental", "salary") */
  category: string;
}

export interface RetroStackedBarChartProps {
  data: StackedBarItem[];
  /** Height of the chart */
  height?: number;
  /** Format function for values */
  valueFormatter?: (value: number) => string;
  /** Show brush for navigation */
  showBrush?: boolean;
  /** Number of visible bars when brush is enabled */
  visibleBars?: number;
}

// Predefined colors for segments - using retro theme palette
const SEGMENT_COLORS = [
  retro.positive,   // Forest green
  retro.info,       // Nintendo blue
  retro.accent,     // Copper/burnt orange
  retro.warning,    // Gold
  retro.purple,     // Muted purple
  retro.cyan,       // Muted cyan
  retro.negative,   // Deep red
  retro.accentLight, // Light copper
  '#6b8e50',        // Olive green
  '#7a6b8a',        // Dusty purple
];

// Get color for segment index
function getSegmentColor(index: number): string {
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length];
}

// Category display names
const CATEGORY_LABELS: Record<string, string> = {
  dividend: 'Dividend',
  interest: 'Interest',
  rental: 'Rental',
  salary: 'Salary',
  bonus: 'Bonus',
  freelance: 'Freelance',
  gift: 'Gift',
  other: 'Other',
};

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category.toLowerCase()] || category;
}

interface ChartDataItem {
  category: string;
  total: number;
  items: { name: string; amount: number; color: string }[];
}

// Custom vertical bar with stacked segments
const StackedBar = (props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: ChartDataItem;
  index?: number;
}) => {
  const { x = 0, y = 0, width = 0, height = 0, payload, index = 0 } = props;

  if (width <= 0 || height <= 0 || !payload) return null;

  const { items, total } = payload;
  const innerPadding = 2;
  const segWidth = width - innerPadding * 2;

  // Build stacked segments from bottom to top
  let currentY = y + height - innerPadding;
  const availableHeight = height - innerPadding * 2;

  return (
    <g>
      {/* Sunken track background */}
      <rect x={x} y={y} width={width} height={height} fill={retro.bevelMid} />
      {/* Inner shadow */}
      <rect x={x} y={y} width={width} height={1} fill="rgba(0,0,0,0.3)" />
      <rect x={x} y={y} width={1} height={height} fill="rgba(0,0,0,0.3)" />
      <rect x={x} y={y + height - 1} width={width} height={1} fill="rgba(255,255,255,0.5)" />
      <rect x={x + width - 1} y={y} width={1} height={height} fill="rgba(255,255,255,0.5)" />

      {/* Stacked segments (bottom to top) */}
      {items.map((item, i) => {
        const segmentHeight = total > 0 ? (item.amount / total) * availableHeight : 0;
        // Skip segments that are too small to render
        if (segmentHeight < 2) return null;

        currentY -= segmentHeight;
        const segY = currentY;
        const fillHeight = Math.max(1, segmentHeight - 1);

        return (
          <g key={i}>
            {/* Segment fill - solid color */}
            <rect
              x={x + innerPadding}
              y={segY}
              width={segWidth}
              height={fillHeight}
              fill={item.color}
            />
            {/* Segment highlight (left) */}
            <rect
              x={x + innerPadding}
              y={segY}
              width={1}
              height={fillHeight}
              fill="rgba(255,255,255,0.4)"
            />
            {/* Segment shadow (right) */}
            <rect
              x={x + innerPadding + segWidth - 1}
              y={segY}
              width={1}
              height={fillHeight}
              fill="rgba(0,0,0,0.25)"
            />
            {/* Segment highlight (top) */}
            <rect
              x={x + innerPadding}
              y={segY}
              width={segWidth}
              height={1}
              fill="rgba(255,255,255,0.3)"
            />
            {/* Segment shadow (bottom) - only if segment is tall enough */}
            {fillHeight > 2 && (
              <rect
                x={x + innerPadding}
                y={segY + fillHeight - 1}
                width={segWidth}
                height={1}
                fill="rgba(0,0,0,0.15)"
              />
            )}
          </g>
        );
      })}
    </g>
  );
};

// Custom tooltip
const CustomTooltip = ({
  active,
  payload,
  valueFormatter,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataItem }>;
  valueFormatter: (value: number) => string;
}) => {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload;

  return (
    <div
      style={{
        backgroundColor: retro.surface,
        border: `2px solid ${retro.border}`,
        boxShadow: `2px 2px 0 ${retro.border}`,
        padding: '8px 12px',
        fontSize: 11,
        maxWidth: 250,
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 6, color: retro.text }}>
        {getCategoryLabel(data.category)}
      </div>
      <div style={{ color: retro.muted, marginBottom: 4 }}>
        Total: <span style={{ color: retro.text, fontWeight: 'bold' }}>{valueFormatter(data.total)}</span>
      </div>
      {data.items.length > 0 && (
        <div style={{ borderTop: `1px solid ${retro.border}`, paddingTop: 4, marginTop: 4 }}>
          {data.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-4" style={{ marginTop: 2 }}>
              <div className="flex items-center gap-1">
                <div
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: item.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: retro.muted, fontSize: 10 }}>{item.name}</span>
              </div>
              <span style={{ color: retro.text, fontFamily: 'monospace', fontSize: 10 }}>
                {valueFormatter(item.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Retro-styled vertical stacked bar chart
 *
 * X-axis: Categories (dividend, rental, salary, etc.)
 * Y-axis: Amount
 * Stacked segments: Individual sources within each category
 *
 * Example:
 * - Dividend bar: [AAPL][MSFT][GOOG] stacked vertically
 * - Rental bar: [Property A][Property B] stacked
 * - Salary bar: [Acme Corp] single segment
 */
export function RetroStackedBarChart({
  data,
  height = 200,
  valueFormatter = (v) => v.toLocaleString(),
  showBrush = true,
  visibleBars = 6,
}: RetroStackedBarChartProps) {
  // Group data by category
  const chartData: ChartDataItem[] = useMemo(() => {
    const grouped = new Map<string, StackedBarItem[]>();

    data.forEach((item) => {
      const cat = item.category.toLowerCase();
      const existing = grouped.get(cat) || [];
      existing.push(item);
      grouped.set(cat, existing);
    });

    return Array.from(grouped.entries())
      .map(([category, items]) => ({
        category,
        total: items.reduce((sum, item) => sum + item.amount, 0),
        items: items
          .sort((a, b) => b.amount - a.amount)
          .map((item, index) => ({
            name: item.name,
            amount: item.amount,
            color: getSegmentColor(index),
          })),
      }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  const barCount = chartData.length;
  const needsBrush = showBrush && barCount > visibleBars;

  // Collect all unique sources for legend
  const legendItems = useMemo(() => {
    const allItems: { name: string; color: string }[] = [];
    chartData.forEach((cat) => {
      cat.items.forEach((item) => {
        if (!allItems.some((i) => i.name === item.name)) {
          allItems.push({ name: item.name, color: item.color });
        }
      });
    });
    return allItems.slice(0, 10); // Limit legend items
  }, [chartData]);

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 10, bottom: needsBrush ? 40 : 20 }}
          barCategoryGap="20%"
        >
          <XAxis
            dataKey="category"
            axisLine={{ stroke: retro.border }}
            tickLine={{ stroke: retro.border }}
            tickFormatter={(value) => getCategoryLabel(value)}
            tick={{
              fill: retro.text,
              fontSize: 10,
              fontFamily: 'inherit',
            }}
          />
          <YAxis
            axisLine={{ stroke: retro.border }}
            tickLine={{ stroke: retro.border }}
            tickFormatter={(value) => valueFormatter(value)}
            tick={{
              fill: retro.muted,
              fontSize: 9,
              fontFamily: 'monospace',
            }}
            width={50}
          />
          <Tooltip
            content={<CustomTooltip valueFormatter={valueFormatter} />}
            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
          />
          <Bar
            dataKey="total"
            shape={<StackedBar />}
            isAnimationActive={true}
            animationDuration={400}
            barSize={32}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={retro.accent} />
            ))}
          </Bar>
          {needsBrush && (
            <Brush
              dataKey="category"
              height={20}
              stroke={retro.border}
              fill={retro.surfaceLight}
              startIndex={0}
              endIndex={Math.min(visibleBars - 1, barCount - 1)}
              travellerWidth={8}
              tickFormatter={(value) => getCategoryLabel(value)}
              y={height - 30}
            />
          )}
        </BarChart>
      </ResponsiveContainer>

      {/* Legend - show source names */}
      {legendItems.length > 1 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
          {legendItems.map((item, i) => (
            <div key={i} className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5"
                style={{
                  backgroundColor: item.color,
                  border: `1px solid ${retro.border}`,
                }}
              />
              <span style={{ color: retro.muted }}>{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
