'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  Button,
  Input,
  Label,
  colors,
  CurrencyCombobox,
  DateInput,
} from '@/components/fire/ui';
import { dividendApi, type Dividend } from '@/lib/fire/api';
import { StockTickerInput } from '@/components/fire/stock-ticker-input';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  defaultCurrency?: string;
  onSuccess: (dividend: Dividend) => void;
}

export function AddDividendDialog({
  open,
  onOpenChange,
  portfolioId,
  defaultCurrency = 'USD',
  onSuccess,
}: Props) {
  const [ticker, setTicker] = useState('');
  const [exDate, setExDate] = useState(new Date().toISOString().split('T')[0]);
  const [payDate, setPayDate] = useState('');
  const [amountPerShare, setAmountPerShare] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [taxRate, setTaxRate] = useState('0.30');
  const [tickerName, setTickerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTicker('');
      setTickerName('');
      setExDate(new Date().toISOString().split('T')[0]);
      setPayDate('');
      setAmountPerShare('');
      setTotalAmount('');
      setCurrency(defaultCurrency);
      setTaxRate('0.30');
      setError(null);
    }
  }, [open, defaultCurrency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await dividendApi.create(portfolioId, {
      ticker: ticker.toUpperCase(),
      amount_per_share: parseFloat(amountPerShare),
      total_amount: totalAmount ? parseFloat(totalAmount) : 0,
      currency,
      tax_rate: taxRate ? parseFloat(taxRate) : undefined,
      ex_date: exDate,
      pay_date: payDate || undefined,
    });
    setLoading(false);
    if (result.success && result.data) {
      setTicker('');
      setAmountPerShare('');
      setTotalAmount('');
      setPayDate('');
      onSuccess(result.data);
    } else {
      setError(result.error || 'Failed to add dividend');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Dividend</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <p style={{ fontSize: 13, color: colors.negative, margin: 0 }}>{error}</p>}

            <StockTickerInput
              label="Ticker"
              value={ticker}
              selectedName={tickerName}
              onChange={(t, name) => { setTicker(t); setTickerName(name); }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <DateInput
                label="Ex-Dividend Date"
                value={exDate}
                onChange={setExDate}
              />
              <DateInput
                label="Pay Date (optional)"
                value={payDate}
                onChange={setPayDate}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Label>Amount per Share</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={amountPerShare}
                  onChange={(e) => setAmountPerShare(e.target.value)}
                  required
                  placeholder="0.25"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Label>Total Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="Auto-computed"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <CurrencyCombobox label="Currency" value={currency} onChange={setCurrency} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Label>Tax Rate (0–1)</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="0.30"
                />
              </div>
            </div>

            <p style={{ fontSize: 11, color: colors.muted, margin: 0 }}>
              If total amount is left blank it will be computed server-side from your shares at ex-date.
            </p>

            <Button type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Adding...' : 'Add Dividend'}
            </Button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
