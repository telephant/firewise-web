'use client';

import { useMemo, useId } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { colors } from '@/components/fire/ui';

export interface PassiveIncomeChartProps {
  dividendsByMonth: Record<number, number>; // month 1-12 → USD amount
  interestByMonth: Record<number, number>;  // month 1-12 → USD amount
  fmt: (usdAmount: number) => string;
  forecastFromMonth?: number; // month 1-12: months >= this are forecast (dashed)
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface ChartRow {
  month: string;
  dividends: number | undefined;
  dividendsForecast: number | undefined;
  interest: number | undefined;
  interestForecast: number | undefined;
  total: number;
}

function buildChartData(
  dividendsByMonth: Record<number, number>,
  interestByMonth: Record<number, number>,
  forecastFromMonth: number | undefined,
): ChartRow[] {
  return MONTH_LABELS.map((label, i) => {
    const m = i + 1;
    const rawDividends = dividendsByMonth[m] ?? 0;
    const rawInterest = interestByMonth[m] ?? 0;

    let dividends: number | undefined;
    let dividendsForecast: number | undefined;
    let interest: number | undefined;
    let interestForecast: number | undefined;

    if (forecastFromMonth === undefined || m < forecastFromMonth) {
      dividends = rawDividends;
      interest = rawInterest;
    } else if (m === forecastFromMonth) {
      // boundary month — include in both so the lines connect visually
      dividends = rawDividends;
      dividendsForecast = rawDividends;
      interest = rawInterest;
      interestForecast = rawInterest;
    } else {
      dividendsForecast = rawDividends;
      interestForecast = rawInterest;
    }

    return { month: label, dividends, dividendsForecast, interest, interestForecast, total: rawDividends + rawInterest };
  });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
  fmt: (v: number) => string;
}

function CustomTooltip({ active, payload, label, fmt }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const dividends =
    (payload.find(p => p.name === 'dividends')?.value ?? 0) +
    (payload.find(p => p.name === 'dividendsForecast')?.value ?? 0);
  const interest =
    (payload.find(p => p.name === 'interest')?.value ?? 0) +
    (payload.find(p => p.name === 'interestForecast')?.value ?? 0);
  const total = dividends + interest;
  return (
    <div style={{
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    }}>
      <p style={{ color: colors.muted, marginBottom: 6, fontWeight: 600 }}>{label}</p>
      <p style={{ color: colors.accent }}>Dividends: {fmt(dividends)}</p>
      <p style={{ color: colors.cyan }}>Interest: {fmt(interest)}</p>
      <p style={{ color: colors.text, marginTop: 4, borderTop: `1px solid ${colors.border}`, paddingTop: 4 }}>
        Total: {fmt(total)}
      </p>
    </div>
  );
}

export function PassiveIncomeChart({ dividendsByMonth, interestByMonth, fmt, forecastFromMonth }: PassiveIncomeChartProps) {
  const uid = useId();
  const gradDivId = `gradDiv-${uid}`;
  const gradIntId = `gradInt-${uid}`;

  const data = useMemo(
    () => buildChartData(dividendsByMonth, interestByMonth, forecastFromMonth),
    [dividendsByMonth, interestByMonth, forecastFromMonth],
  );

  const hasInterest = useMemo(
    () => Object.values(interestByMonth).some(v => v > 0),
    [interestByMonth],
  );

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradDivId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors.accent} stopOpacity={0.3} />
            <stop offset="95%" stopColor={colors.accent} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id={gradIntId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors.cyan} stopOpacity={0.3} />
            <stop offset="95%" stopColor={colors.cyan} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: colors.muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: colors.muted, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => fmt(v)}
          width={60}
        />
        <Tooltip content={<CustomTooltip fmt={fmt} />} />

        {/* Dividends — solid (historical) */}
        <Area
          type="monotone"
          dataKey="dividends"
          stroke={colors.accent}
          strokeWidth={2}
          fill={`url(#${gradDivId})`}
          dot={false}
          activeDot={{ r: 4, fill: colors.accent }}
          connectNulls={false}
        />
        {/* Dividends — dashed (forecast) */}
        <Area
          type="monotone"
          dataKey="dividendsForecast"
          stroke={colors.accent}
          strokeWidth={2}
          strokeDasharray="5 4"
          fill="none"
          dot={false}
          activeDot={{ r: 4, fill: colors.accent }}
          connectNulls={false}
        />

        {hasInterest && (
          <>
            {/* Interest — solid (historical) */}
            <Area
              type="monotone"
              dataKey="interest"
              stroke={colors.cyan}
              strokeWidth={2}
              fill={`url(#${gradIntId})`}
              dot={false}
              activeDot={{ r: 4, fill: colors.cyan }}
              connectNulls={false}
            />
            {/* Interest — dashed (forecast) */}
            <Area
              type="monotone"
              dataKey="interestForecast"
              stroke={colors.cyan}
              strokeWidth={2}
              strokeDasharray="5 4"
              fill="none"
              dot={false}
              activeDot={{ r: 4, fill: colors.cyan }}
              connectNulls={false}
            />
          </>
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
