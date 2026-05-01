'use client';

import { useState } from 'react';
import { colors, Button, Input, Label } from '@/components/fire/ui';
import { dcaApi, DcaPending } from '@/lib/fire/api';

interface Props {
  pending: DcaPending;
  onConfirmed: (id: string) => void;
  onSkipped: (id: string) => void;
}

export function DcaPendingCard({ pending, onConfirmed, onSkipped }: Props) {
  const [price, setPrice] = useState(
    pending.suggested_price !== null ? String(pending.suggested_price) : ''
  );
  const [shares, setShares] = useState(
    pending.mode === 'shares'
      ? String(pending.shares ?? '')
      : pending.suggested_shares !== null
      ? String(pending.suggested_shares)
      : ''
  );
  const [confirming, setConfirming] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!price || !shares) {
      setError('Price and shares are required');
      return;
    }
    setConfirming(true);
    setError(null);
    const result = await dcaApi.confirmPending(pending.id, {
      confirmed_price: parseFloat(price),
      confirmed_shares: parseFloat(shares),
    });
    setConfirming(false);
    if (result.success) {
      onConfirmed(pending.id);
    } else {
      setError(result.error || 'Failed to confirm');
    }
  };

  const handleSkip = async () => {
    setSkipping(true);
    await dcaApi.skipPending(pending.id);
    setSkipping(false);
    onSkipped(pending.id);
  };

  return (
    <div style={{
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 8,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>{pending.ticker}</span>
          <span style={{
            marginLeft: 8, fontSize: 11, fontWeight: 500,
            padding: '2px 6px', borderRadius: 4,
            backgroundColor: 'rgba(255,255,255,0.06)',
            color: colors.muted, border: `1px solid ${colors.border}`,
          }}>{pending.market}</span>
        </div>
        <span style={{ fontSize: 12, color: colors.muted }}>{pending.scheduled_date}</span>
      </div>

      {/* Plan info */}
      <div style={{ fontSize: 12, color: colors.muted }}>
        {pending.mode === 'amount'
          ? `Fixed amount: ${pending.currency} ${pending.amount}`
          : `Fixed shares: ${pending.shares}`}
        {pending.suggested_price && (
          <span style={{ marginLeft: 8, color: colors.info }}>
            Est. price: {pending.currency} {pending.suggested_price}
          </span>
        )}
      </div>

      {error && <p style={{ fontSize: 12, color: colors.negative, margin: 0 }}>{error}</p>}

      {/* Input fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Label>Price</Label>
          <Input
            type="number" min="0" step="any"
            value={price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Label>Shares</Label>
          <Input
            type="number" min="0" step="any"
            value={shares} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShares(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      {/* Total preview */}
      {price && shares && (
        <div style={{ fontSize: 12, color: colors.muted }}>
          Total: {pending.currency} {(parseFloat(price) * parseFloat(shares)).toFixed(2)}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button onClick={handleConfirm} disabled={confirming || skipping} style={{ flex: 1 }}>
          {confirming ? 'Confirming...' : 'Confirm'}
        </Button>
        <Button variant="ghost" onClick={handleSkip} disabled={confirming || skipping}
          style={{ color: colors.muted }}>
          {skipping ? '...' : 'Skip'}
        </Button>
      </div>
    </div>
  );
}
