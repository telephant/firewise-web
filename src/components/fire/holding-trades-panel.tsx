'use client';

import { useEffect, useState } from 'react';
import { colors, Button, Loader } from '@/components/fire/ui';
import { tradeApi, type Trade, type Holding } from '@/lib/fire/api';
import { isCommodity, displayTicker, displayUnit } from '@/lib/fire/commodities';
import { RecordTradeDialog } from '@/components/fire/record-trade-dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  portfolioId: string;
  holding: Holding | null;
  currency: string;
  onHoldingsChanged: () => void;
}

function fmt(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

export function HoldingTradesPanel({ open, onClose, portfolioId, holding, currency, onHoldingsChanged }: Props) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!open || !holding) return;
    setLoading(true);
    tradeApi.list(portfolioId).then(res => {
      if (res.success && res.data) {
        setTrades(res.data.filter(t => t.ticker === holding.ticker && t.market === holding.market));
      }
      setLoading(false);
    });
  }, [open, holding, portfolioId]);

  const handleDelete = async (tradeId: string) => {
    if (!confirm('Delete this trade? This will recalculate your holdings.')) return;
    setDeletingId(tradeId);
    const result = await tradeApi.delete(portfolioId, tradeId);
    setDeletingId(null);
    if (result.success) {
      setTrades(prev => prev.filter(t => t.id !== tradeId));
      onHoldingsChanged();
    }
  };

  const handleEditSuccess = (updated: Trade) => {
    setTrades(prev => prev.map(t => t.id === updated.id ? updated : t));
    setEditOpen(false);
    setEditTrade(null);
    onHoldingsChanged();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 40,
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 560,
        backgroundColor: colors.surface,
        borderLeft: `1px solid ${colors.border}`,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ color: colors.text, fontSize: 16, fontWeight: 700 }}>
              {holding ? displayTicker(holding.ticker, holding.market) : ''}
              {holding && (
                <span style={{
                  marginLeft: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: isCommodity(holding.market) ? colors.warning : colors.accent,
                  backgroundColor: isCommodity(holding.market) ? `${colors.warning}20` : `${colors.accent}20`,
                  padding: '1px 6px',
                  borderRadius: 4,
                }}>
                  {isCommodity(holding.market) ? 'CMDTY' : holding.market}
                </span>
              )}
            </div>
            <div style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
              {holding?.shares} {holding ? displayUnit(holding.ticker, holding.market) : ''} · avg {holding ? fmt(holding.avg_cost, holding.currency) : '—'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: colors.muted, padding: 4, borderRadius: 4,
              fontSize: 18, lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Trade list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
              <Loader size="sm" variant="dots" />
            </div>
          ) : trades.length === 0 ? (
            <p style={{ color: colors.muted, fontSize: 13, textAlign: 'center', paddingTop: 40 }}>No trades found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {trades.map((t, idx) => {
                const isLast = idx === trades.length - 1;
                return (
                  <div
                    key={t.id}
                    style={{
                      padding: '12px 0',
                      borderBottom: isLast ? 'none' : `1px solid ${colors.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '1px 7px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: t.type === 'buy' ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                          color: t.type === 'buy' ? colors.positive : colors.negative,
                          border: `1px solid ${t.type === 'buy' ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
                        }}>
                          {t.type === 'buy' ? 'Buy' : 'Sell'}
                        </span>
                        <span style={{ fontSize: 13, color: colors.text, fontWeight: 500 }}>{t.date}</span>
                      </div>
                      <div style={{ fontSize: 13, color: colors.text }}>
                        {t.shares} {holding ? displayUnit(t.ticker ?? holding.ticker, holding.market) : 'shares'} @ {fmt(t.price, t.currency)}
                      </div>
                      {t.notes && (
                        <div style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{t.notes}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditTrade(t); setEditOpen(true); }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        style={{ color: colors.negative }}
                      >
                        {deletingId === t.id ? '...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <RecordTradeDialog
        open={editOpen}
        onOpenChange={(o) => { setEditOpen(o); if (!o) setEditTrade(null); }}
        portfolioId={portfolioId}
        defaultCurrency={currency}
        editTrade={editTrade ?? undefined}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}
