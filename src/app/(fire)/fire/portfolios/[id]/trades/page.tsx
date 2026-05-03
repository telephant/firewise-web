'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { tradeApi, portfolioApi } from '@/lib/fire/api';
import type { Trade, Portfolio } from '@/lib/fire/api';
import { colors, Button, Loader } from '@/components/fire/ui';
import { RecordTradeDialog } from '@/components/fire/record-trade-dialog';
import Link from 'next/link';

function fmt(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

export default function TradeHistoryPage() {
  const { id } = useParams<{ id: string }>();

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([portfolioApi.get(id), tradeApi.list(id)]).then(
      ([portfolioRes, tradesRes]) => {
        if (portfolioRes.success && portfolioRes.data) setPortfolio(portfolioRes.data);
        if (tradesRes.success && tradesRes.data) setTrades(tradesRes.data);
        setLoading(false);
      }
    );
  }, [id]);

  const handleDelete = async (tradeId: string) => {
    if (!confirm('Delete this trade?')) return;
    setDeletingId(tradeId);
    const result = await tradeApi.delete(id, tradeId);
    setDeletingId(null);
    if (result.success) {
      setTrades((prev) => prev.filter((t) => t.id !== tradeId));
    }
  };

  const currency = portfolio?.currency || 'USD';

  return (
    <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: colors.muted, marginBottom: 4 }}>
            <Link href={`/fire/portfolios/${id}`} style={{ color: colors.muted, textDecoration: 'none' }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = colors.text)}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = colors.muted)}
            >
              {portfolio?.name || 'Portfolio'}
            </Link>
            <span>/</span>
            <span>Trade History</span>
          </div>
          <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Trade History</h1>
        </div>
        <Button onClick={() => setTradeDialogOpen(true)}>Record Trade</Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <Loader size="md" variant="bar" />
        </div>
      ) : trades.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '48px 0', color: colors.muted, fontSize: 14 }}>No trades recorded yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                {['Date', 'Ticker', 'Type', 'Shares', 'Price', 'Currency', 'Notes', 'Actions'].map(h => (
                  <th key={h} style={{ paddingBottom: 8, paddingRight: 16, textAlign: 'left', color: colors.muted, fontWeight: 500, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{t.date}</td>
                  <td style={{ padding: '12px 16px 12px 0', fontWeight: 600, color: colors.text }}>
                    {t.ticker}
                    <span style={{ marginLeft: 6, fontSize: 11, color: colors.muted }}>{t.market}</span>
                  </td>
                  <td style={{ padding: '12px 16px 12px 0' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: t.type === 'buy' ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                      color: t.type === 'buy' ? colors.positive : colors.negative,
                      border: `1px solid ${t.type === 'buy' ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
                    }}>
                      {t.type === 'buy' ? 'Buy' : 'Sell'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{t.shares}</td>
                  <td style={{ padding: '12px 16px 12px 0', color: colors.info }}>{fmt(t.price, t.currency)}</td>
                  <td style={{ padding: '12px 16px 12px 0', color: colors.muted }}>{t.currency}</td>
                  <td style={{ padding: '12px 16px 12px 0', color: colors.muted }}>{t.notes || '—'}</td>
                  <td style={{ padding: '12px 16px 12px 0' }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                      style={{ color: colors.negative }}
                    >
                      {deletingId === t.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RecordTradeDialog
        open={tradeDialogOpen}
        onOpenChange={setTradeDialogOpen}
        portfolioId={id}
        defaultCurrency={currency}
        onSuccess={(trade) => {
          setTrades((prev) => [trade, ...prev]);
          setTradeDialogOpen(false);
        }}
      />
    </div>
  );
}
