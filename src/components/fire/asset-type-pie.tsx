'use client';

import { PieChart, colors } from '@/components/fire/ui';
import type { PieSegment } from '@/components/fire/ui';
import type { Holding } from '@/lib/fire/api';
import { useCurrency } from '@/components/fire/currency-context';

const SUBTYPE_COLORS: Record<string, string> = {
  etf:       colors.accent,
  stock:     colors.positive,
  commodity: colors.warning,
  crypto:    colors.purple,
  fund:      colors.cyan,
  other:     colors.muted,
  unknown:   colors.muted,
};

const SUBTYPE_LABELS: Record<string, string> = {
  etf: 'ETF', stock: 'Stock', commodity: 'Commodity',
  crypto: 'Crypto', fund: 'Fund', other: 'Other', unknown: 'Unknown',
};

interface Props {
  holdings: Holding[];
}

export function AssetTypePie({ holdings }: Props) {
  const { fmt } = useCurrency();

  const byType = holdings.reduce<Record<string, number>>((acc, h) => {
    const key = h.asset_subtype ?? 'unknown';
    const val = h.value_usd ?? (h.value ?? 0);
    acc[key] = (acc[key] ?? 0) + val;
    return acc;
  }, {});

  const total = Object.values(byType).reduce((s, v) => s + v, 0);

  const segments: PieSegment[] = Object.entries(byType)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({
      name: SUBTYPE_LABELS[key] ?? key,
      value,
      color: SUBTYPE_COLORS[key] ?? colors.muted,
    }));

  if (segments.length === 0) return null;

  return (
    <div style={{
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 8,
      padding: '14px 16px',
    }}>
      <p style={{
        color: colors.muted, fontSize: 11, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12,
      }}>
        Asset Type
      </p>

      <PieChart
        outerData={segments}
        size={180}
        showLegend={false}
        valueFormatter={(v) => fmt(v)}
      />

      {/* Legend with value + % */}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {segments.map((seg) => {
          const pct = total > 0 ? (seg.value / total) * 100 : 0;
          return (
            <div key={seg.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: seg.color, flexShrink: 0 }} />
              <span style={{ flex: 1, color: colors.muted, fontSize: 12 }}>{seg.name}</span>
              <span style={{ color: colors.text, fontSize: 12, fontWeight: 500, fontFamily: 'monospace' }}>
                {fmt(seg.value)}
              </span>
              <span style={{ color: seg.color, fontSize: 11, minWidth: 42, textAlign: 'right' }}>
                {pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
        {/* Total row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: `1px solid ${colors.border}`, paddingTop: 6, marginTop: 2 }}>
          <div style={{ width: 8, flexShrink: 0 }} />
          <span style={{ flex: 1, color: colors.muted, fontSize: 12, fontWeight: 600 }}>Total</span>
          <span style={{ color: colors.text, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
            {fmt(total)}
          </span>
          <span style={{ minWidth: 42 }} />
        </div>
      </div>
    </div>
  );
}
