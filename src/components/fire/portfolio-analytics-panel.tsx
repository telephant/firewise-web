'use client';

import { useState, useEffect } from 'react';
import { colors, Loader } from '@/components/fire/ui';
import { portfolioAnalyticsApi } from '@/lib/fire/api';
import type { PortfolioAnalytics, ScoringProfile } from '@/lib/fire/api';
import { getCachedAnalytics, setCachedAnalytics } from '@/lib/fire/analytics-cache';

interface Props {
  portfolioId: string;
}

const SCORE_COLORS: Record<string, string> = {
  A: colors.positive,
  B: colors.info,
  C: colors.warning,
  D: colors.negative,
};

function fmt(value: number | null, decimals = 2): string {
  if (value === null) return '—';
  return value.toFixed(decimals);
}

function fmtPct(value: number | null): string {
  if (value === null) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function fmtPctSigned(value: number | null): string {
  if (value === null) return '—';
  const p = (value * 100).toFixed(1);
  return value >= 0 ? `+${p}%` : `${p}%`;
}

function SubScore({ label, score }: { label: string; score: number }) {
  const color = score >= 70 ? colors.positive : score >= 55 ? colors.warning : colors.negative;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ color: colors.text, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </span>
      <span style={{ color, fontSize: 11, fontWeight: 600 }}>{score}</span>
    </div>
  );
}

function MetricRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
      <span style={{ color: colors.muted, fontSize: 11 }}>{label}</span>
      <span style={{ color: valueColor ?? colors.text, fontSize: 12, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, backgroundColor: colors.border, margin: '8px 0' }} />;
}

export function PortfolioAnalyticsPanel({ portfolioId }: Props) {
  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ScoringProfile>('moderate');

  useEffect(() => {
    setLoading(true);
    const cached = getCachedAnalytics(portfolioId, profile);
    if (cached) {
      setAnalytics(cached);
      setLoading(false);
      return;
    }
    portfolioAnalyticsApi.get(portfolioId, profile).then(res => {
      if (res.success && res.data) {
        setCachedAnalytics(portfolioId, profile, res.data);
        setAnalytics(res.data);
      }
      setLoading(false);
    });
  }, [portfolioId, profile]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: colors.surface,
      borderRadius: 8,
      border: `1px solid ${colors.border}`,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'auto',
    }}>
      {/* Header: score badge + profile selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
        {loading || !analytics ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader size="sm" variant="dots" />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              backgroundColor: `${SCORE_COLORS[analytics.score.level]}20`,
              border: `1px solid ${SCORE_COLORS[analytics.score.level]}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: SCORE_COLORS[analytics.score.level],
              fontSize: 18, fontWeight: 700,
            }}>
              {analytics.score.level}
            </div>
            <div>
              <div style={{ color: colors.text, fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
                {analytics.score.total}
              </div>
              <div style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>/ 100</div>
            </div>
          </div>
        )}

        {/* Profile selector */}
        <select
          value={profile}
          onChange={e => setProfile(e.target.value as ScoringProfile)}
          style={{
            backgroundColor: colors.surfaceLight,
            color: colors.muted,
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: 11,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="lenient">Lenient</option>
          <option value="moderate">Moderate</option>
          <option value="strict">Strict</option>
        </select>
      </div>

      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader size="md" variant="bar" />
        </div>
      )}

      {!loading && analytics && (
        <>
          {/* Return Quality */}
          <SubScore label="Return Quality" score={analytics.score.return_quality} />
          <MetricRow label="Sharpe Ratio" value={fmt(analytics.metrics.sharpe_ratio)} />
          <MetricRow label="Sortino Ratio" value={fmt(analytics.metrics.sortino_ratio)} />

          <Divider />

          {/* Risk Control */}
          <SubScore label="Risk Control" score={analytics.score.risk_control} />
          <MetricRow label="Annual Volatility" value={fmtPct(analytics.metrics.volatility_annual)} />
          <MetricRow
            label="Max Drawdown"
            value={fmtPctSigned(analytics.metrics.max_drawdown)}
            valueColor={analytics.metrics.max_drawdown !== null && analytics.metrics.max_drawdown < -0.15 ? colors.negative : undefined}
          />

          <Divider />

          {/* Diversification */}
          <SubScore label="Diversification" score={analytics.score.diversification} />
          <MetricRow
            label="Top 3 Concentration"
            value={fmtPct(analytics.metrics.concentration_top3)}
            valueColor={analytics.metrics.concentration_top3 > 0.60 ? colors.warning : undefined}
          />
          <MetricRow label="HHI" value={fmt(analytics.metrics.concentration_hhi)} />
          <MetricRow label="Markets" value={String(analytics.metrics.market_count)} />

          <Divider />

          {/* Win/Loss Quality */}
          <SubScore label="Win/Loss Quality" score={analytics.score.win_loss_quality} />
          <MetricRow
            label="Win Rate"
            value={analytics.metrics.win_rate !== null ? `${(analytics.metrics.win_rate * 100).toFixed(0)}%` : '—'}
          />
          <MetricRow
            label="Avg Win"
            value={analytics.metrics.avg_win_pct !== null ? `+${analytics.metrics.avg_win_pct.toFixed(1)}%` : '—'}
            valueColor={colors.positive}
          />
          <MetricRow
            label="Avg Loss"
            value={analytics.metrics.avg_loss_pct !== null ? `${analytics.metrics.avg_loss_pct.toFixed(1)}%` : '—'}
            valueColor={analytics.metrics.avg_loss_pct !== null ? colors.negative : undefined}
          />

          {/* Flags */}
          {analytics.flags.length > 0 && (
            <>
              <Divider />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {analytics.flags.map((flag, i) => (
                  <div key={i} style={{
                    fontSize: 11,
                    color: flag.type === 'warning' ? colors.warning : colors.muted,
                    display: 'flex', alignItems: 'flex-start', gap: 5,
                  }}>
                    <span style={{ flexShrink: 0 }}>{flag.type === 'warning' ? '⚠' : 'ℹ'}</span>
                    <span>{flag.message}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Data footnote */}
          {analytics.metrics.data_months > 0 && (
            <div style={{ marginTop: 'auto', paddingTop: 10, color: colors.muted, fontSize: 10 }}>
              Based on {analytics.metrics.data_months} months of data
            </div>
          )}
        </>
      )}
    </div>
  );
}
