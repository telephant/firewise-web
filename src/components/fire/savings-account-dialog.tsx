'use client';

import { useState } from 'react';
import { colors, Button, Input } from '@/components/fire/ui';
import { savingsApi, SavingsAccount, CreateSavingsAccountData } from '@/lib/fire/api';

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'SGD', 'HKD', 'JPY', 'CNY', 'AUD', 'CAD', 'CHF'];
const FREQUENCY_OPTIONS: { value: CreateSavingsAccountData['compound_frequency']; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
];

interface Props {
  account?: SavingsAccount;
  onSuccess: (account: SavingsAccount) => void;
  onClose: () => void;
}

export function SavingsAccountDialog({ account, onSuccess, onClose }: Props) {
  const isEdit = !!account;
  const [form, setForm] = useState<CreateSavingsAccountData>({
    name: account?.name ?? '',
    bank: account?.bank ?? '',
    currency: account?.currency ?? 'USD',
    balance: account?.balance ?? 0,
    interest_rate: account ? account.interest_rate * 100 : 0, // store as % in UI
    compound_frequency: account?.compound_frequency ?? 'monthly',
    notes: account?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (form.balance < 0) { setError('Balance cannot be negative'); return; }
    if (form.interest_rate <= 0) { setError('Interest rate must be greater than 0'); return; }

    setSaving(true);
    setError('');

    const payload: CreateSavingsAccountData = {
      ...form,
      interest_rate: form.interest_rate / 100, // convert % → decimal for API
      bank: form.bank || undefined,
      notes: form.notes || undefined,
    };

    const res = isEdit
      ? await savingsApi.update(account!.id, payload)
      : await savingsApi.create(payload);

    setSaving(false);

    if (!res.success) {
      setError(res.error || 'Failed to save account');
      return;
    }

    if (isEdit) {
      onSuccess({ ...account!, ...payload, interest_rate: payload.interest_rate });
    } else {
      onSuccess(res.data as SavingsAccount);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 24,
        width: 420,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: colors.text, fontSize: 16, fontWeight: 600, margin: 0 }}>
            {isEdit ? 'Edit Account' : 'Add Savings Account'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        <div>
          <label style={{ color: colors.muted, fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>NAME *</label>
          <Input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. DBS Fixed Deposit"
          />
        </div>

        <div>
          <label style={{ color: colors.muted, fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>BANK</label>
          <Input
            value={form.bank ?? ''}
            onChange={e => setForm(f => ({ ...f, bank: e.target.value }))}
            placeholder="e.g. DBS Bank"
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: colors.muted, fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>CURRENCY</label>
            <select
              value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 6,
                backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}`,
                color: colors.text, fontSize: 13,
              }}
            >
              {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 2 }}>
            <label style={{ color: colors.muted, fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>BALANCE *</label>
            <Input
              type="number"
              value={form.balance}
              onChange={e => setForm(f => ({ ...f, balance: Number(e.target.value) }))}
              placeholder="0.00"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: colors.muted, fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>RATE % / YEAR *</label>
            <Input
              type="number"
              step="0.01"
              value={form.interest_rate}
              onChange={e => setForm(f => ({ ...f, interest_rate: Number(e.target.value) }))}
              placeholder="3.50"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ color: colors.muted, fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>PAYOUT</label>
            <select
              value={form.compound_frequency}
              onChange={e => setForm(f => ({ ...f, compound_frequency: e.target.value as CreateSavingsAccountData['compound_frequency'] }))}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 6,
                backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}`,
                color: colors.text, fontSize: 13,
              }}
            >
              {FREQUENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={{ color: colors.muted, fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 4 }}>NOTES</label>
          <Input
            value={form.notes ?? ''}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Optional notes"
          />
        </div>

        {error && <p style={{ color: colors.negative, fontSize: 12, margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Add Account'}
          </Button>
        </div>
      </div>
    </div>
  );
}
