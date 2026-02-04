'use client';

import { PieChart as RPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { colors } from '../theme';

export interface PieSegment {
  name: string;
  value: number;
  color: string;
  [key: string]: unknown;
}

export interface PieChartProps {
  /** Outer ring data (categories) */
  outerData: PieSegment[];
  /** Inner ring data (individual items) */
  innerData?: PieSegment[];
  /** Chart size in pixels */
  size?: number;
  /** Show legend below chart */
  showLegend?: boolean;
  /** Format function for values */
  valueFormatter?: (value: number) => string;
  /** Format function for percentages */
  percentFormatter?: (percent: number) => string;
  /** Inner radius of outer ring (0-1) */
  outerInnerRadius?: number;
  /** Outer radius of outer ring (0-1) */
  outerOuterRadius?: number;
  /** Inner radius of inner ring (0-1) */
  innerInnerRadius?: number;
  /** Outer radius of inner ring (0-1) */
  innerOuterRadius?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: PieSegment & { percent?: number };
  }>;
  valueFormatter: (value: number) => string;
  percentFormatter: (percent: number) => string;
  total: number;
}

function CustomTooltip({
  active,
  payload,
  valueFormatter,
  percentFormatter,
  total,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  const percent = total > 0 ? (data.value / total) * 100 : 0;

  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        padding: '8px 12px',
        fontSize: 11,
      }}
    >
      <div style={{ fontWeight: 500, color: colors.text, marginBottom: 4 }}>
        {data.name}
      </div>
      <div style={{ color: colors.muted }}>
        <span style={{ fontFamily: 'monospace', color: colors.text }}>
          {valueFormatter(data.value)}
        </span>
        <span style={{ marginLeft: 8, color: data.payload.color }}>
          {percentFormatter(percent)}
        </span>
      </div>
    </div>
  );
}

/**
 * Two-layer pie/donut chart with clean dark mode styling
 */
export function PieChart({
  outerData,
  innerData,
  size = 200,
  showLegend = true,
  valueFormatter = (v) => v.toLocaleString(),
  percentFormatter = (p) => `${p.toFixed(1)}%`,
  outerInnerRadius = 0.55,
  outerOuterRadius = 0.85,
  innerInnerRadius = 0.25,
  innerOuterRadius = 0.50,
}: PieChartProps) {
  const total = outerData.reduce((sum, d) => sum + d.value, 0);

  // Filter out zero values
  const filteredOuter = outerData.filter((d) => d.value > 0);
  const filteredInner = innerData?.filter((d) => d.value > 0) || [];

  return (
    <div>
      <ResponsiveContainer width="100%" height={size}>
        <RPieChart>
          {/* Inner ring - individual items */}
          {filteredInner.length > 0 && (
            <Pie
              data={filteredInner}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={`${innerInnerRadius * 100}%`}
              outerRadius={`${innerOuterRadius * 100}%`}
              paddingAngle={1}
              isAnimationActive={true}
              animationDuration={400}
            >
              {filteredInner.map((entry, index) => (
                <Cell
                  key={`inner-${index}`}
                  fill={entry.color}
                  stroke={colors.bg}
                  strokeWidth={1}
                />
              ))}
            </Pie>
          )}

          {/* Outer ring - categories */}
          <Pie
            data={filteredOuter}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={`${outerInnerRadius * 100}%`}
            outerRadius={`${outerOuterRadius * 100}%`}
            paddingAngle={2}
            isAnimationActive={true}
            animationDuration={400}
          >
            {filteredOuter.map((entry, index) => (
              <Cell
                key={`outer-${index}`}
                fill={entry.color}
                stroke={colors.bg}
                strokeWidth={2}
              />
            ))}
          </Pie>

          <Tooltip
            content={
              <CustomTooltip
                valueFormatter={valueFormatter}
                percentFormatter={percentFormatter}
                total={total}
              />
            }
          />
        </RPieChart>
      </ResponsiveContainer>

      {/* Legend */}
      {showLegend && (
        <div
          className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2"
          style={{ fontSize: 10 }}
        >
          {filteredOuter.map((item, index) => {
            const percent = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <div key={index} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
                <span style={{ color: colors.muted }}>{item.name}</span>
                <span
                  style={{ color: colors.text, fontFamily: 'monospace' }}
                >
                  {percentFormatter(percent)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
