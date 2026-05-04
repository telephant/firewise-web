'use client';

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
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface ChartRow {
  month: string;
  dividends: number;
  interest: number;
  total: number;
}

function buildChartData(
  dividendsByMonth: Record<number, number>,
  interestByMonth: Record<number, number>,
): ChartRow[] {
  return MONTH_LABELS.map((label, i) => {
    const m = i + 1;
    const dividends = dividendsByMonth[m] ?? 0;
    const interest = interestByMonth[m] ?? 0;
    return { month: label, dividends, interest, total: dividends + interest };
  });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  fmt: (v: number) => string;
}

function CustomTooltip({ active, payload, label, fmt }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const dividends = payload.find(p => p.name === 'dividends')?.value ?? 0;
  const interest = payload.find(p => p.name === 'interest')?.value ?? 0;
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

export function PassiveIncomeChart({ dividendsByMonth, interestByMonth, fmt }: PassiveIncomeChartProps) {
  const data = buildChartData(dividendsByMonth, interestByMonth);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradDividends" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors.accent} stopOpacity={0.3} />
            <stop offset="95%" stopColor={colors.accent} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradInterest" x1="0" y1="0" x2="0" y2="1">
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
        <Area
          type="monotone"
          dataKey="dividends"
          stackId="passive"
          stroke={colors.accent}
          strokeWidth={2}
          fill="url(#gradDividends)"
          dot={false}
          activeDot={{ r: 4, fill: colors.accent }}
        />
        <Area
          type="monotone"
          dataKey="interest"
          stackId="passive"
          stroke={colors.cyan}
          strokeWidth={2}
          fill="url(#gradInterest)"
          dot={false}
          activeDot={{ r: 4, fill: colors.cyan }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
