'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  portfolioApi,
  portfolioStatsApi,
} from '@/lib/fire/api';
import type { Portfolio, PortfolioStats } from '@/lib/fire/api';
import {
  colors,
  Button,
  Loader,
  StatCard,
} from '@/components/fire/ui';
import { useCurrency } from '@/components/fire/currency-context';

// ── constants ──────────────────────────────────────────────────────────────

const SLICE_COLORS = [
  '#5E6AD2',
  '#4ADE80',
  '#60A5FA',
  '#FBBF24',
  '#F87171',
  '#A78BFA',
  '#67E8F9',
  '#FB923C',
];

// ── SVG donut chart ────────────────────────────────────────────────────────

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

function DonutChart({ slices }: { slices: DonutSlice[] }) {
  const cx = 90, cy = 90, R = 72, r = 48;
  const total = slices.reduce((s, sl) => s + sl.value, 0);

  if (total === 0) return null;

  const paths: React.ReactNode[] = [];

  if (slices.length === 1) {
    // Full circle via two half-arcs with tiny gap
    const sl = slices[0];
    const gapDeg = 1;
    const halfAngle = 180 - gapDeg / 2;

    const outerStart1 = polarToXY(cx, cy, R, -halfAngle);
    const outerEnd1 = polarToXY(cx, cy, R, halfAngle);
    const innerStart1 = polarToXY(cx, cy, r, halfAngle);
    const innerEnd1 = polarToXY(cx, cy, r, -halfAngle);

    const outerStart2 = polarToXY(cx, cy, R, halfAngle + gapDeg);
    const outerEnd2 = polarToXY(cx, cy, R, 360 - gapDeg / 2);
    const innerStart2 = polarToXY(cx, cy, r, 360 - gapDeg / 2);
    const innerEnd2 = polarToXY(cx, cy, r, halfAngle + gapDeg);

    paths.push(
      <path
        key="half1"
        fill={sl.color}
        d={`M ${outerStart1.x} ${outerStart1.y} A ${R} ${R} 0 1 1 ${outerEnd1.x} ${outerEnd1.y} L ${innerStart1.x} ${innerStart1.y} A ${r} ${r} 0 1 0 ${innerEnd1.x} ${innerEnd1.y} Z`}
      />,
      <path
        key="half2"
        fill={sl.color}
        d={`M ${outerStart2.x} ${outerStart2.y} A ${R} ${R} 0 0 1 ${outerEnd2.x} ${outerEnd2.y} L ${innerStart2.x} ${innerStart2.y} A ${r} ${r} 0 0 0 ${innerEnd2.x} ${innerEnd2.y} Z`}
      />
    );
  } else {
    let startAngle = 0;
    slices.forEach((sl, i) => {
      const pct = sl.value / total;
      const sweep = pct * 360;
      const endAngle = startAngle + sweep;

      const outerStart = polarToXY(cx, cy, R, startAngle);
      const outerEnd = polarToXY(cx, cy, R, endAngle);
      const innerEnd = polarToXY(cx, cy, r, endAngle);
      const innerStart = polarToXY(cx, cy, r, startAngle);
      const largeArc = sweep > 180 ? 1 : 0;

      paths.push(
        <path
          key={i}
          fill={sl.color}
          d={`M ${outerStart.x} ${outerStart.y} A ${R} ${R} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${r} ${r} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y} Z`}
          style={{ opacity: 0.92 }}
        />
      );
      startAngle = endAngle;
    });
  }

  return (
    <svg viewBox="0 0 180 180" width={180} height={180} style={{ flexShrink: 0 }}>
      {paths}
    </svg>
  );
}

// ── component ──────────────────────────────────────────────────────────────

export default function FireDashboard() {
  const router = useRouter();
  const { fmt } = useCurrency();

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsMap, setStatsMap] = useState<Record<string, PortfolioStats>>({});
  const [statsLoading, setStatsLoading] = useState(false);

  // Load portfolios on mount
  useEffect(() => {
    portfolioApi.list().then(r => {
      if (r.success && r.data) {
        const list = r.data;
        setPortfolios(list);
        setLoading(false);

        if (list.length > 0) {
          setStatsLoading(true);
          Promise.all(list.map(p => portfolioStatsApi.getStats(p.id))).then(results => {
            const map: Record<string, PortfolioStats> = {};
            results.forEach((res, i) => {
              if (res.success && res.data) {
                map[list[i].id] = res.data;
              }
            });
            setStatsMap(map);
            setStatsLoading(false);
          }).catch(() => setStatsLoading(false));
        }
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, []);

  // ── aggregate stat calculation ──────────────────────────────────────────

  const aggregated = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    let unrealizedPl = 0;
    let dividendYtd = 0;

    portfolios.forEach(p => {
      const stats = statsMap[p.id];
      if (!stats) return;
      totalValue += stats.total_value;
      totalCost += stats.total_cost;
      unrealizedPl += stats.unrealized_pl;
      dividendYtd += stats.dividend_ytd;
    });

    return { totalValue, totalCost, unrealizedPl, dividendYtd };
  }, [portfolios, statsMap]);

  // ── donut slices ────────────────────────────────────────────────────────

  const donutSlices: DonutSlice[] = useMemo(() => {
    return portfolios.map((p, i) => {
      const stats = statsMap[p.id];
      return {
        name: p.name,
        value: stats?.total_value ?? 0,
        color: SLICE_COLORS[i % SLICE_COLORS.length],
      };
    });
  }, [portfolios, statsMap]);

  const donutTotal = donutSlices.reduce((s, sl) => s + sl.value, 0);

  // ── table styles ────────────────────────────────────────────────────────

  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    textAlign: 'left',
    color: colors.muted,
    fontWeight: 500,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: `1px solid ${colors.border}`,
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 14px',
    color: colors.text,
    fontSize: 13,
    borderBottom: `1px solid ${colors.border}`,
  };

  // ── per-portfolio table helpers ─────────────────────────────────────────

  function getReturnPct(p: Portfolio): number | null {
    const stats = statsMap[p.id];
    if (!stats || !stats.total_cost || stats.total_cost === 0) return null;
    const totalReturn = stats.unrealized_pl + stats.realized_pl + stats.dividend_ytd;
    return (totalReturn / stats.total_cost) * 100;
  }

  // ── aggregate stat card display ─────────────────────────────────────────

  const statsReady = !statsLoading && portfolios.every(p => statsMap[p.id]);

  // ── render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: colors.bg }}>
        <Loader size="md" variant="bar" />
      </div>
    );
  }

  if (portfolios.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: colors.bg, gap: 16 }}>
        <p style={{ color: colors.muted, fontSize: 14, margin: 0 }}>No portfolios yet.</p>
        <Button onClick={() => router.push('/fire/portfolios')}>Go to Portfolios</Button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        <StatCard
          label="Total Value"
          value={statsReady ? fmt(aggregated.totalValue) : '—'}
        />
        <StatCard
          label="Total Cost"
          value={statsReady ? fmt(aggregated.totalCost) : '—'}
        />
        <StatCard
          label="Unrealized P&L"
          value={statsReady ? fmt(aggregated.unrealizedPl) : '—'}
          valueColor={statsReady ? (aggregated.unrealizedPl >= 0 ? 'positive' : 'negative') : undefined}
        />
        <StatCard
          label="YTD Dividends"
          value={statsReady ? fmt(aggregated.dividendYtd) : '—'}
          valueColor={statsReady ? 'positive' : undefined}
        />
      </div>

      {/* Portfolio Allocation */}
      <p style={{ fontSize: 11, fontWeight: 600, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
        Portfolio Allocation
      </p>
      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          padding: '20px 24px',
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 32,
        }}
      >
        {statsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '20px 0' }}>
            <Loader size="md" variant="bar" />
          </div>
        ) : (
          <>
            <DonutChart slices={donutSlices.filter(s => s.value > 0)} />
            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              {portfolios.map((p, i) => {
                const sliceColor = SLICE_COLORS[i % SLICE_COLORS.length];
                const sliceValue = donutSlices[i]?.value ?? 0;
                const pct = donutTotal > 0 ? (sliceValue / donutTotal) * 100 : 0;

                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: sliceColor, flexShrink: 0 }} />
                    <span style={{ color: colors.text, fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </span>
                    <span style={{ color: colors.muted, fontSize: 12, marginRight: 8 }}>
                      {pct.toFixed(1)}%
                    </span>
                    <span style={{ color: colors.text, fontSize: 13, whiteSpace: 'nowrap' }}>
                      {fmt(sliceValue)}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Portfolios table */}
      <p style={{ fontSize: 11, fontWeight: 600, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
        Portfolios
      </p>
      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Value</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Unrealized P&amp;L</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Return %</th>
              <th style={{ ...thStyle, textAlign: 'right', width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {portfolios.map(p => {
              const stats = statsLoading ? null : statsMap[p.id];
              const retPct = statsLoading ? null : getReturnPct(p);

              return (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/fire/portfolios/${p.id}`)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLTableRowElement).style.backgroundColor = colors.surfaceLight;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '';
                  }}
                >
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{p.name}</td>

                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {!stats ? (
                      <span style={{ color: colors.muted }}>—</span>
                    ) : (
                      <span style={{ color: colors.text }}>{fmt(stats.total_value)}</span>
                    )}
                  </td>

                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {!stats ? (
                      <span style={{ color: colors.muted }}>—</span>
                    ) : (
                      <span style={{ color: stats.unrealized_pl >= 0 ? colors.positive : colors.negative }}>
                        {fmt(stats.unrealized_pl)}
                      </span>
                    )}
                  </td>

                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {retPct === null ? (
                      <span style={{ color: colors.muted }}>—</span>
                    ) : (
                      <span style={{ color: retPct >= 0 ? colors.positive : colors.negative }}>
                        {retPct >= 0 ? '+' : ''}{retPct.toFixed(2)}%
                      </span>
                    )}
                  </td>

                  <td style={{ ...tdStyle, textAlign: 'right', width: 40 }}>
                    <span style={{ color: colors.muted, fontSize: 16 }}>→</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
