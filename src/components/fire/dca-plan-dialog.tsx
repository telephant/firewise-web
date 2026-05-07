'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody,
  Button, Input, Label, Select, colors, CurrencyCombobox, DateInput,
} from '@/components/fire/ui';
import { dcaApi, DcaPlan, CreateDcaPlanData, DcaFrequency, DcaMode, DcaPriceReference } from '@/lib/fire/api';
import { StockTickerInput } from '@/components/fire/stock-ticker-input';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  defaultCurrency?: string;
  editPlan?: DcaPlan;
  onSuccess: (plan: DcaPlan) => void;
}

const FREQUENCY_OPTIONS: { value: DcaFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export function DcaPlanDialog({ open, onOpenChange, portfolioId, defaultCurrency = 'USD', editPlan, onSuccess }: Props) {
  const isEdit = !!editPlan;
  const [ticker, setTicker] = useState('');
  const [tickerName, setTickerName] = useState('');
  const [market, setMarket] = useState('US');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [frequency, setFrequency] = useState<DcaFrequency>('monthly');
  const [mode, setMode] = useState<DcaMode>('amount');
  const [amount, setAmount] = useState('');
  const [shares, setShares] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [priceReference, setPriceReference] = useState<DcaPriceReference>('close');
  const [priceDelayMinutes, setPriceDelayMinutes] = useState('30');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && editPlan) {
      setTicker(editPlan.ticker);
      setMarket(editPlan.market);
      setCurrency(editPlan.currency);
      setFrequency(editPlan.frequency);
      setMode(editPlan.mode);
      setAmount(editPlan.amount !== null ? String(editPlan.amount) : '');
      setShares(editPlan.shares !== null ? String(editPlan.shares) : '');
      setStartDate(editPlan.next_run_date);
      setPriceReference(editPlan.price_reference || 'close');
      setPriceDelayMinutes(editPlan.price_delay_minutes !== null ? String(editPlan.price_delay_minutes) : '30');
      setNotes(editPlan.notes || '');
      setError(null);
    } else if (!open) {
      setTicker(''); setTickerName(''); setMarket('US'); setCurrency(defaultCurrency);
      setFrequency('monthly'); setMode('amount'); setAmount(''); setShares('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setPriceReference('close'); setPriceDelayMinutes('30');
      setNotes(''); setError(null);
    }
  }, [open, editPlan, defaultCurrency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const data: CreateDcaPlanData = {
      portfolio_id: portfolioId,
      ticker: ticker.toUpperCase(),
      market,
      currency,
      frequency,
      mode,
      start_date: startDate,
      price_reference: priceReference,
      price_delay_minutes: priceReference === 'delay' ? parseInt(priceDelayMinutes) || 30 : undefined,
      notes: notes || undefined,
      ...(mode === 'amount' ? { amount: parseFloat(amount) } : { shares: parseFloat(shares) }),
    };

    const result = isEdit
      ? await dcaApi.updatePlan(editPlan!.id, { ...data, next_run_date: startDate })
      : await dcaApi.createPlan(data);

    setLoading(false);
    if (result.success && result.data) {
      onSuccess(result.data);
    } else {
      setError(result.error || 'Failed to save DCA plan');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit DCA Plan' : 'New DCA Plan'}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <p style={{ fontSize: 13, color: colors.negative, margin: 0 }}>{error}</p>}

            <StockTickerInput
              label="Ticker"
              value={ticker}
              selectedName={tickerName}
              onChange={(t, name) => { setTicker(t); setTickerName(name); }}
              region={market}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Label>Market</Label>
              <Select value={market} onChange={(e) => setMarket(e.target.value)}
                options={[
                  { value: 'US', label: 'US' }, { value: 'SGX', label: 'SGX' },
                  { value: 'HK', label: 'HK' }, { value: 'CN', label: 'CN' },
                ]}
              />
            </div>

            <CurrencyCombobox value={currency} onChange={setCurrency} label="Currency" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Label>Frequency</Label>
              <Select value={frequency} onChange={(e) => setFrequency(e.target.value as DcaFrequency)}
                options={FREQUENCY_OPTIONS}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label>Investment Mode</Label>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button type="button" variant={mode === 'amount' ? 'primary' : 'outline'}
                  style={{ flex: 1 }} onClick={() => setMode('amount')}>
                  Fixed Amount
                </Button>
                <Button type="button" variant={mode === 'shares' ? 'primary' : 'outline'}
                  style={{ flex: 1 }} onClick={() => setMode('shares')}>
                  Fixed Shares
                </Button>
              </div>
            </div>

            {mode === 'amount' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Label>Amount per period</Label>
                <Input type="number" min="0" step="any" value={amount}
                  onChange={(e) => setAmount(e.target.value)} required placeholder="500" />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Label>Shares per period</Label>
                <Input type="number" min="0" step="any" value={shares}
                  onChange={(e) => setShares(e.target.value)} required placeholder="1" />
              </div>
            )}

            <DateInput value={startDate} onChange={setStartDate} label={isEdit ? 'Next Run Date' : 'First Run Date'} />

            {/* Price Reference */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label>Price Reference</Label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['open', 'close', 'delay'] as DcaPriceReference[]).map(ref => (
                  <Button
                    key={ref}
                    type="button"
                    variant={priceReference === ref ? 'primary' : 'outline'}
                    style={{ flex: 1 }}
                    onClick={() => setPriceReference(ref)}
                  >
                    {ref === 'open' ? 'Open' : ref === 'close' ? 'Close' : 'Delay'}
                  </Button>
                ))}
              </div>
              {priceReference === 'delay' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Input
                    type="number"
                    min="1"
                    max="480"
                    step="1"
                    value={priceDelayMinutes}
                    onChange={(e) => setPriceDelayMinutes(e.target.value)}
                    style={{ width: 80 }}
                  />
                  <span style={{ fontSize: 13, color: colors.muted }}>minutes after open</span>
                </div>
              )}
              <p style={{ fontSize: 11, color: colors.muted, margin: 0 }}>
                {priceReference === 'open' && 'Use the opening price on run day'}
                {priceReference === 'close' && 'Use the current/closing price on run day'}
                {priceReference === 'delay' && `Use price ${priceDelayMinutes || 30} minutes after market opens`}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Label>Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
            </div>

            <Button type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Plan'}
            </Button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
