'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { portfolioApi, portfolioStatsApi } from '@/lib/fire/api';
import type { Portfolio, PortfolioStats } from '@/lib/fire/api';
import { colors, Button, Loader } from '@/components/fire/ui';
import { CreatePortfolioDialog } from '@/components/fire/create-portfolio-dialog';
import { EditPortfolioDialog } from '@/components/fire/edit-portfolio-dialog';
import { useCurrency } from '@/components/fire/currency-context';

function ColoredCell({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: colors.muted }}>—</span>;
  const color = value >= 0 ? colors.positive : colors.negative;
  return <span style={{ color }}>{value}</span>;
}

export default function PortfoliosPage() {
  const router = useRouter();
  const { fmt } = useCurrency();

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsMap, setStatsMap] = useState<Record<string, PortfolioStats>>({});
  const [statsLoading, setStatsLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editPortfolio, setEditPortfolio] = useState<Portfolio | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
              if (res.success && res.data) map[list[i].id] = res.data;
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

  async function handleDelete(p: Portfolio) {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setDeletingId(p.id);
    await portfolioApi.delete(p.id);
    setPortfolios(prev => prev.filter(x => x.id !== p.id));
    setDeletingId(null);
  }

  function getReturnPct(portfolioId: string): number | null {
    const stats = statsMap[portfolioId];
    if (!stats || !stats.total_cost || stats.total_cost === 0) return null;
    return ((stats.unrealized_pl + stats.realized_pl + stats.dividend_ytd) / stats.total_cost) * 100;
  }

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

  return (
    <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Portfolios</h1>
        <Button onClick={() => setCreateOpen(true)} size="sm">+ New Portfolio</Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <Loader size="md" variant="bar" />
        </div>
      ) : portfolios.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 80, color: colors.muted }}>
          <p style={{ marginBottom: 16, fontSize: 14 }}>No portfolios yet.</p>
          <Button onClick={() => setCreateOpen(true)}>Create your first portfolio</Button>
        </div>
      ) : (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Net Value</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total Cost</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Unrealized P&amp;L</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Realized P&amp;L</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>YTD Dividends</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Return %</th>
                <th style={{ ...thStyle, width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {portfolios.map(p => {
                const stats = statsMap[p.id];
                const returnPct = getReturnPct(p.id);
                return (
                  <tr
                    key={p.id}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = colors.surfaceLight; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''; }}
                  >
                    <td style={{ ...tdStyle, fontWeight: 600 }} onClick={() => router.push(`/fire/portfolios/${p.id}`)}>{p.name}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }} onClick={() => router.push(`/fire/portfolios/${p.id}`)}>
                      {statsLoading ? <Loader size="sm" variant="dots" /> : !stats ? <span style={{ color: colors.muted }}>—</span> : fmt(stats.total_value)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }} onClick={() => router.push(`/fire/portfolios/${p.id}`)}>
                      {statsLoading ? <Loader size="sm" variant="dots" /> : !stats ? <span style={{ color: colors.muted }}>—</span> : fmt(stats.total_cost)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }} onClick={() => router.push(`/fire/portfolios/${p.id}`)}>
                      {statsLoading ? <Loader size="sm" variant="dots" /> : !stats ? <span style={{ color: colors.muted }}>—</span>
                        : <span style={{ color: stats.unrealized_pl >= 0 ? colors.positive : colors.negative }}>{fmt(stats.unrealized_pl)}</span>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }} onClick={() => router.push(`/fire/portfolios/${p.id}`)}>
                      {statsLoading ? <Loader size="sm" variant="dots" /> : !stats ? <span style={{ color: colors.muted }}>—</span>
                        : <span style={{ color: stats.realized_pl >= 0 ? colors.positive : colors.negative }}>{fmt(stats.realized_pl)}</span>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }} onClick={() => router.push(`/fire/portfolios/${p.id}`)}>
                      {statsLoading ? <Loader size="sm" variant="dots" /> : !stats ? <span style={{ color: colors.muted }}>—</span>
                        : <span style={{ color: colors.positive }}>{fmt(stats.dividend_ytd)}</span>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }} onClick={() => router.push(`/fire/portfolios/${p.id}`)}>
                      {statsLoading ? <Loader size="sm" variant="dots" /> : returnPct === null ? <span style={{ color: colors.muted }}>—</span>
                        : <span style={{ color: returnPct >= 0 ? colors.positive : colors.negative }}>{returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%</span>}
                    </td>
                    <td style={{ ...tdStyle, width: 100 }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button variant="ghost" size="sm" onClick={() => setEditPortfolio(p)}>Edit</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === p.id}
                          onClick={() => handleDelete(p)}
                          style={{ color: colors.negative }}
                        >
                          {deletingId === p.id ? '...' : 'Delete'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CreatePortfolioDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={p => { setPortfolios(prev => [...prev, p]); setCreateOpen(false); }}
      />

      {editPortfolio && (
        <EditPortfolioDialog
          open={!!editPortfolio}
          onOpenChange={open => { if (!open) setEditPortfolio(null); }}
          portfolio={editPortfolio}
          onSuccess={updated => {
            setPortfolios(prev => prev.map(p => p.id === updated.id ? updated : p));
            setEditPortfolio(null);
          }}
        />
      )}
    </div>
  );
}
