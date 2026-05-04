'use client';

import { useState } from 'react';
import { colors, Button, Input, DateInput } from '@/components/fire/ui';
import { savingsApi, InterestRecord } from '@/lib/fire/api';

interface Props {
  accountId: string;
  onSuccess: (record: InterestRecord) => void;
  onClose: () => void;
}

export function SavingsInterestDialog({ accountId, onSuccess, onClose }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState('');
  const [creditedAt, setCreditedAt] = useState(today);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError('Amount must be greater than 0'); return; }
    if (!creditedAt) { setError('Date is required'); return; }

    setSaving(true);
    setError('');
    const res = await savingsApi.addInterest(accountId, {
      amount: amt,
      credited_at: creditedAt,
      notes: notes || undefined,
    });
    setSaving(false);

    if (!res.success) {
      setError(res.error || 'Failed to add interest record');
      return;
    }
    onSuccess(res.data as InterestRecord);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 24,
        width: 360,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: colors.text, fontSize: 16, fontWeight: 600, margin: 0 }}>Log Interest Received</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        <div>
          <label style={{ color: colors.muted, fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>AMOUNT *</label>
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </div>

        <div>
          <label style={{ color: colors.muted, fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>DATE *</label>
          <DateInput
            value={creditedAt}
            onChange={v => setCreditedAt(v)}
          />
        </div>

        <div>
          <label style={{ color: colors.muted, fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>NOTES</label>
          <Input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </div>

        {error && <p style={{ color: colors.negative, fontSize: 12, margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Log Interest'}
          </Button>
        </div>
      </div>
    </div>
  );
}
