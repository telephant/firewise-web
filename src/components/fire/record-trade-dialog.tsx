'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  Button,
  Input,
  Label,
  Select,
  colors,
  CurrencyCombobox,
  DateInput,
} from '@/components/fire/ui';
import { tradeApi, commodityApi, type Trade, type CommodityInfo } from '@/lib/fire/api';
import { StockTickerInput } from '@/components/fire/stock-ticker-input';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  defaultCurrency?: string;
  onSuccess: (trade: Trade) => void;
  editTrade?: Trade;
}

export function RecordTradeDialog({
  open,
  onOpenChange,
  portfolioId,
  defaultCurrency = 'USD',
  onSuccess,
  editTrade,
}: Props) {
  const isEdit = !!editTrade;
  const [assetType, setAssetType] = useState<'stock' | 'commodity'>('stock');
  const [type, setType] = useState<'buy' | 'sell'>('buy');
  const [ticker, setTicker] = useState('');
  const [tickerName, setTickerName] = useState('');
  const [market, setMarket] = useState('US');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commodities, setCommodities] = useState<CommodityInfo[]>([]);
  const [selectedCommodity, setSelectedCommodity] = useState<CommodityInfo | null>(null);
  const hasFetched = useRef(false);

  // Load commodity prices when dialog opens
  useEffect(() => {
    if (!open || hasFetched.current) return;
    hasFetched.current = true;
    commodityApi.list().then(res => {
      if (res.success && res.data) setCommodities(res.data);
    }).catch(console.error);
  }, [open]);

  // When commodity selected, auto-fill price and currency
  useEffect(() => {
    if (selectedCommodity) {
      if (selectedCommodity.price != null) setPrice(String(selectedCommodity.price));
      setCurrency(selectedCommodity.currency);
      setTicker(selectedCommodity.ticker);
    }
  }, [selectedCommodity]);

  // Populate form when editing
  useEffect(() => {
    if (open && editTrade) {
      setAssetType(editTrade.asset_type ?? 'stock');
      setType(editTrade.type);
      setTicker(editTrade.ticker);
      setTickerName('');
      setMarket(editTrade.market);
      setDate(editTrade.date);
      setShares(String(editTrade.shares));
      setPrice(String(editTrade.price));
      setCurrency(editTrade.currency);
      setNotes(editTrade.notes || '');
      setError(null);
      if (editTrade.asset_type === 'commodity') {
        const match = commodities.find(c => c.ticker === editTrade.ticker);
        if (match) setSelectedCommodity(match);
      }
    } else if (!open) {
      setAssetType('stock');
      setTicker('');
      setTickerName('');
      setMarket('US');
      setDate(new Date().toISOString().split('T')[0]);
      setShares('');
      setPrice('');
      setCurrency(defaultCurrency);
      setNotes('');
      setError(null);
      setSelectedCommodity(null);
    }
  }, [open, editTrade, defaultCurrency, commodities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const data = {
      ticker: ticker.toUpperCase(),
      market: assetType === 'commodity' ? 'COMMODITY' : market,
      type,
      shares: parseFloat(shares),
      price: parseFloat(price),
      currency,
      date,
      notes: notes || undefined,
      asset_type: assetType,
      unit: assetType === 'commodity' ? (selectedCommodity?.unit ?? editTrade?.unit ?? undefined) : undefined,
    };
    const result = isEdit
      ? await tradeApi.update(portfolioId, editTrade!.id, data)
      : await tradeApi.create(portfolioId, data);
    setLoading(false);
    if (result.success && result.data) {
      if (!isEdit) {
        setTicker('');
        setShares('');
        setPrice('');
        setNotes('');
        setSelectedCommodity(null);
      }
      onSuccess(result.data);
    } else {
      setError(result.error || (isEdit ? 'Failed to update trade' : 'Failed to record trade'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Trade' : 'Record Trade'}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <p style={{ fontSize: 13, color: colors.negative, margin: 0 }}>{error}</p>}

            {/* Asset type switcher — hidden in edit mode */}
            {!isEdit && (
              <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: `1px solid ${colors.border}` }}>
                {(['stock', 'commodity'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setAssetType(t); setTicker(''); setSelectedCommodity(null); setPrice(''); }}
                    style={{
                      flex: 1,
                      padding: '7px 0',
                      border: 'none',
                      backgroundColor: assetType === t ? colors.accent : 'transparent',
                      color: assetType === t ? '#fff' : colors.muted,
                      fontSize: 13,
                      fontWeight: assetType === t ? 600 : 400,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      transition: 'background-color 0.15s, color 0.15s',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {/* Buy / Sell toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Label>Type</Label>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button type="button" variant={type === 'buy' ? 'primary' : 'outline'} style={{ flex: 1 }} onClick={() => setType('buy')}>Buy</Button>
                <Button type="button" variant={type === 'sell' ? 'danger' : 'outline'} style={{ flex: 1 }} onClick={() => setType('sell')}>Sell</Button>
              </div>
            </div>

            {/* Stock fields */}
            {assetType === 'stock' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <StockTickerInput
                    label="Ticker"
                    value={ticker}
                    selectedName={tickerName}
                    onChange={(t, name) => { setTicker(t); setTickerName(name); }}
                    region={market || 'US'}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Label>Market</Label>
                  <Select
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                    options={[
                      { value: 'US', label: 'US' },
                      { value: 'SGX', label: 'SGX' },
                      { value: 'HK', label: 'HK' },
                      { value: 'CN', label: 'CN' },
                    ]}
                  />
                </div>
              </>
            )}

            {/* Commodity picker */}
            {assetType === 'commodity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Label>Commodity</Label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {commodities.map(c => {
                    const isSelected = selectedCommodity?.ticker === c.ticker;
                    const changeColor = (c.changePercent ?? 0) >= 0 ? colors.positive : colors.negative;
                    return (
                      <button
                        key={c.ticker}
                        type="button"
                        onClick={() => setSelectedCommodity(c)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: `1px solid ${isSelected ? colors.accent : colors.border}`,
                          backgroundColor: isSelected ? `${colors.accent}15` : colors.surfaceLight,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'border-color 0.15s, background-color 0.15s',
                        }}
                      >
                        <div style={{ color: colors.text, fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                          {c.name}
                        </div>
                        <div style={{ color: colors.muted, fontSize: 11, marginBottom: 6 }}>
                          {c.ticker} · {c.unitLabel}
                        </div>
                        {c.price != null ? (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span style={{ color: colors.text, fontSize: 12, fontWeight: 500 }}>
                              ${c.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {c.changePercent != null && (
                              <span style={{ color: changeColor, fontSize: 11 }}>
                                {c.changePercent >= 0 ? '+' : ''}{c.changePercent.toFixed(2)}%
                              </span>
                            )}
                          </div>
                        ) : (
                          <div style={{ color: colors.muted, fontSize: 11 }}>—</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <DateInput value={date} onChange={(v) => setDate(v)} label="Date" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Label>{assetType === 'commodity' && (selectedCommodity || editTrade?.unit) ? `Quantity (${selectedCommodity?.unitLabel ?? editTrade?.unit ?? 'unit'})` : 'Shares'}</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  required
                  placeholder={assetType === 'commodity' ? '1.0' : '100'}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Label>{assetType === 'commodity' && (selectedCommodity || editTrade?.unit) ? `Price per ${selectedCommodity?.unitLabel ?? editTrade?.unit ?? 'unit'}` : 'Price per Share'}</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  placeholder="0.00"
                />
              </div>
            </div>

            {assetType === 'stock' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <CurrencyCombobox value={currency} onChange={setCurrency} label="Currency" />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Label>Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
            </div>

            <Button
              type="submit"
              disabled={loading || (assetType === 'commodity' && !selectedCommodity && !isEdit)}
              style={{ width: '100%' }}
            >
              {loading ? (isEdit ? 'Saving...' : 'Recording...') : (isEdit ? 'Save Changes' : 'Record Trade')}
            </Button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
