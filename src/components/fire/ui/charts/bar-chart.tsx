'use client';

import { ReactNode } from 'react';
import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  LabelList,
  Tooltip,
} from 'recharts';
import { colors } from '../theme';
import { BarShape } from './bar-shape';

export interface BarChartData {
  name: string;
  value: number;
  fill?: string;
  [key: string]: unknown;
}

export interface BarChartProps {
  data: BarChartData[];
  /** Height per bar row in pixels */
  rowHeight?: number;
  /** Width for Y-axis labels */
  labelWidth?: number;
  /** Width reserved for value labels on right */
  valueWidth?: number;
  /** Bar thickness */
  barSize?: number;
  /** Gap between bars */
  barGap?: number;
  /** Default bar color if not specified in data */
  defaultColor?: string;
  /** Format function for value labels */
  valueFormatter?: (value: number) => string;
  /** Show tooltip on hover */
  showTooltip?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Custom Y-axis tick renderer */
  renderYAxisTick?: (props: unknown) => ReactNode;
  /** Maximum characters for Y-axis labels before truncation */
  maxLabelLength?: number;
}

/**
 * Horizontal bar chart with clean dark mode styling
 */
export function BarChart({
  data,
  rowHeight = 36,
  labelWidth = 100,
  valueWidth = 70,
  barSize = 18,
  barGap = 8,
  defaultColor = colors.accent,
  valueFormatter = (v) => v.toLocaleString(),
  showTooltip = false,
  animationDuration = 400,
  maxLabelLength = 12,
}: BarChartProps) {
  // Process data for display
  const chartData = data.map((item) => ({
    ...item,
    displayName:
      item.name.length > maxLabelLength
        ? item.name.substring(0, maxLabelLength) + '...'
        : item.name,
    fill: item.fill || defaultColor,
  }));

  const chartHeight = chartData.length * rowHeight + 8;

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <RBarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: valueWidth, left: 4, bottom: 4 }}
        barCategoryGap={barGap}
      >
        <XAxis type="number" hide domain={[0, 'dataMax']} />
        <YAxis
          type="category"
          dataKey="displayName"
          axisLine={false}
          tickLine={false}
          tick={{
            fill: colors.muted,
            fontSize: 11,
            fontFamily: 'inherit',
          }}
          width={labelWidth}
        />
        {showTooltip && (
          <Tooltip
            contentStyle={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              fontFamily: 'inherit',
              fontSize: 11,
              color: colors.text,
            }}
            formatter={(value) =>
              typeof value === 'number' ? [valueFormatter(value), 'Value'] : [String(value), 'Value']
            }
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
        )}
        <Bar
          dataKey="value"
          shape={<BarShape />}
          barSize={barSize}
          isAnimationActive={true}
          animationDuration={animationDuration}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            offset={6}
            formatter={(value: unknown) =>
              typeof value === 'number' ? valueFormatter(value) : String(value)
            }
            style={{
              fill: colors.text,
              fontSize: 10,
              fontWeight: 500,
              fontFamily: 'monospace',
            }}
          />
        </Bar>
      </RBarChart>
    </ResponsiveContainer>
  );
}
