'use client';

import { ReactNode } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  LabelList,
  Tooltip,
} from 'recharts';
import { retro } from '../theme';
import { RetroBarShape } from './retro-bar-shape';

export interface RetroBarChartData {
  name: string;
  value: number;
  fill?: string;
  [key: string]: unknown;
}

export interface RetroBarChartProps {
  data: RetroBarChartData[];
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
 * Retro-styled horizontal bar chart with Windows 95 aesthetic
 *
 * Usage:
 * ```tsx
 * <RetroBarChart
 *   data={[
 *     { name: 'Salary', value: 5000, fill: retro.positive },
 *     { name: 'Freelance', value: 3000, fill: retro.info },
 *   ]}
 *   valueFormatter={(v) => formatCurrency(v)}
 * />
 * ```
 */
export function RetroBarChart({
  data,
  rowHeight = 36,
  labelWidth = 100,
  valueWidth = 70,
  barSize = 18,
  barGap = 8,
  defaultColor = retro.accent,
  valueFormatter = (v) => v.toLocaleString(),
  showTooltip = false,
  animationDuration = 400,
  maxLabelLength = 12,
}: RetroBarChartProps) {
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
      <BarChart
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
            fill: retro.text,
            fontSize: 11,
            fontFamily: 'inherit',
          }}
          width={labelWidth}
        />
        {showTooltip && (
          <Tooltip
            contentStyle={{
              backgroundColor: retro.surface,
              border: `2px solid ${retro.border}`,
              boxShadow: `2px 2px 0 ${retro.border}`,
              fontFamily: 'inherit',
              fontSize: 11,
            }}
            formatter={(value) =>
              typeof value === 'number' ? [valueFormatter(value), 'Value'] : [String(value), 'Value']
            }
          />
        )}
        <Bar
          dataKey="value"
          shape={<RetroBarShape />}
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
              fill: retro.text,
              fontSize: 10,
              fontWeight: 'bold',
              fontFamily: 'monospace',
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
