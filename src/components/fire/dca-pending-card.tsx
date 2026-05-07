'use client';

import { useState } from 'react';
import { colors, Button, Input } from '@/components/fire/ui';
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

  const priceNum = parseFloat(price);
  const sharesNum = parseFloat(shares);
  const total = !isNaN(priceNum) && !isNaN(sharesNum) ? priceNum * sharesNum : null;
  const canConfirm = price && shares && !isNaN(priceNum) && !isNaN(sharesNum);

  const handleConfirm = async () => {
    if (!canConfirm) { setError('Price and shares are required'); return; }
    setConfirming(true);
    setError(null);
    const result = await dcaApi.confirmPending(pending.id, {
      confirmed_price: priceNum,
      confirmed_shares: sharesNum,
    });
    setConfirming(false);
    if (result.success) onConfirmed(pending.id);
    else setError(result.error || 'Failed to confirm');
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
      borderLeft: `3px solid ${colors.accent}`,
      borderRadius: 8,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 20,
    }}>
      {/* Ticker + date */}
      <div style={{ minWidth: 80, flexShrink: 0 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: colors.text, margin: 0 }}>{pending.ticker}</p>
        <p style={{ fontSize: 11, color: colors.muted, margin: '2px 0 0' }}>{pending.market}</p>
        <p style={{ fontSize: 11, color: colors.muted, margin: '4px 0 0' }}>{pending.scheduled_date}</p>
      </div>

      {/* Plan mode badge */}
      <div style={{ flexShrink: 0 }}>
        <span style={{
          fontSize: 11, padding: '3px 8px', borderRadius: 4,
          backgroundColor: `${colors.accent}20`, color: colors.accent,
          fontWeight: 600, letterSpacing: '0.03em',
        }}>
          {pending.mode === 'amount'
            ? `${pending.currency} ${pending.amount} / period`
            : `${pending.shares} shares / period`}
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 36, backgroundColor: colors.border, flexShrink: 0 }} />

      {/* Price input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 100 }}>
        <span style={{ fontSize: 10, color: colors.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</span>
        <Input
          type="number" min="0" step="any"
          value={price}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(e.target.value)}
          placeholder="0.00"
          style={{ width: 100, textAlign: 'right' }}
        />
      </div>

      {/* Shares input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 90 }}>
        <span style={{ fontSize: 10, color: colors.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shares</span>
        <Input
          type="number" min="0" step="any"
          value={shares}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShares(e.target.value)}
          placeholder="0"
          style={{ width: 90, textAlign: 'right' }}
        />
      </div>

      {/* Total */}
      <div style={{ flexShrink: 0, minWidth: 80 }}>
        <p style={{ fontSize: 10, color: colors.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Total</p>
        <p style={{ fontSize: 14, fontWeight: 700, color: colors.positive, margin: 0 }}>
          {total !== null ? `${pending.currency} ${total.toFixed(2)}` : '—'}
        </p>
      </div>

      {/* Error */}
      {error && (
        <p style={{ fontSize: 11, color: colors.negative, margin: 0, flexShrink: 0 }}>{error}</p>
      )}

      {/* Actions — pushed to the right */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexShrink: 0 }}>
        <Button
          onClick={handleConfirm}
          disabled={confirming || skipping || !canConfirm}
          size="sm"
        >
          {confirming ? 'Confirming...' : 'Confirm'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          disabled={confirming || skipping}
          style={{ color: colors.muted }}
        >
          {skipping ? '...' : 'Skip'}
        </Button>
      </div>
    </div>
  );
}
