'use client';

import { useMemo } from 'react';
import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  Brush,
} from 'recharts';
import { colors } from '../theme';

export interface StackedBarItem {
  /** The source name (e.g., "AAPL", "Property A", "Acme Corp") */
  name: string;
  amount: number;
  /** The category this belongs to (e.g., "dividend", "rental", "salary") */
  category: string;
}

export interface StackedBarChartProps {
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

// Vibrant segment colors for dark backgrounds
const SEGMENT_COLORS = [
  '#4ADE80',  // Green
  '#60A5FA',  // Blue
  '#A78BFA',  // Purple
  '#FBBF24',  // Amber
  '#F87171',  // Red
  '#67E8F9',  // Cyan
  '#FB923C',  // Orange
  '#E879F9',  // Pink
  '#34D399',  // Emerald
  '#818CF8',  // Indigo
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

// Flat stacked bar with rounded top
const StackedBar = (props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: ChartDataItem;
  index?: number;
}) => {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;

  if (width <= 0 || height <= 0 || !payload) return null;

  const { items, total } = payload;

  // Build stacked segments from bottom to top
  let currentY = y + height;
  const availableHeight = height;

  return (
    <g>
      {items.map((item, i) => {
        const segmentHeight = total > 0 ? (item.amount / total) * availableHeight : 0;
        if (segmentHeight < 1) return null;

        currentY -= segmentHeight;
        const segY = currentY;
        const isTop = i === items.length - 1 || currentY <= y + 1;

        return (
          <rect
            key={i}
            x={x}
            y={segY}
            width={width}
            height={segmentHeight}
            fill={item.color}
            rx={isTop ? 3 : 0}
            ry={isTop ? 3 : 0}
          />
        );
      })}
    </g>
  );
};

// Custom tooltip
const ChartTooltip = ({
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
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        padding: '8px 12px',
        fontSize: 11,
        maxWidth: 250,
      }}
    >
      <div style={{ fontWeight: 500, marginBottom: 6, color: colors.text }}>
        {getCategoryLabel(data.category)}
      </div>
      <div style={{ color: colors.muted, marginBottom: 4 }}>
        Total: <span style={{ color: colors.text, fontWeight: 500 }}>{valueFormatter(data.total)}</span>
      </div>
      {data.items.length > 0 && (
        <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 4, marginTop: 4 }}>
          {data.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-4" style={{ marginTop: 2 }}>
              <div className="flex items-center gap-1.5">
                <div
                  className="rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    backgroundColor: item.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: colors.muted, fontSize: 10 }}>{item.name}</span>
              </div>
              <span style={{ color: colors.text, fontFamily: 'monospace', fontSize: 10 }}>
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
 * Vertical stacked bar chart with clean dark mode styling
 *
 * X-axis: Categories (dividend, rental, salary, etc.)
 * Y-axis: Amount
 * Stacked segments: Individual sources within each category
 */
export function StackedBarChart({
  data,
  height = 200,
  valueFormatter = (v) => v.toLocaleString(),
  showBrush = true,
  visibleBars = 6,
}: StackedBarChartProps) {
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
        <RBarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 10, bottom: needsBrush ? 40 : 20 }}
          barCategoryGap="20%"
        >
          <XAxis
            dataKey="category"
            axisLine={{ stroke: colors.border }}
            tickLine={false}
            tickFormatter={(value) => getCategoryLabel(value)}
            tick={{
              fill: colors.muted,
              fontSize: 10,
              fontFamily: 'inherit',
            }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => valueFormatter(value)}
            tick={{
              fill: colors.muted,
              fontSize: 9,
              fontFamily: 'monospace',
            }}
            width={50}
          />
          <Tooltip
            content={<ChartTooltip valueFormatter={valueFormatter} />}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Bar
            dataKey="total"
            shape={<StackedBar />}
            isAnimationActive={true}
            animationDuration={400}
            barSize={32}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors.accent} />
            ))}
          </Bar>
          {needsBrush && (
            <Brush
              dataKey="category"
              height={20}
              stroke={colors.border}
              fill={colors.surfaceLight}
              startIndex={0}
              endIndex={Math.min(visibleBars - 1, barCount - 1)}
              travellerWidth={8}
              tickFormatter={(value) => getCategoryLabel(value)}
              y={height - 30}
            />
          )}
        </RBarChart>
      </ResponsiveContainer>

      {/* Legend - show source names */}
      {legendItems.length > 1 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
          {legendItems.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: item.color,
                }}
              />
              <span style={{ color: colors.muted }}>{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
