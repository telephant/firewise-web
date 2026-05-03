'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { colors, Loader } from '@/components/fire/ui';
import { stockSymbolApi, stockPriceApi, StockSymbol, StockPrice, SymbolType } from '@/lib/fire/api';
import { MissingStockFeedbackDialog } from '@/components/fire/feedback-dialog';
import { cn } from '@/lib/utils';

export interface StockTickerInputProps {
  value: string;
  selectedName?: string;
  onChange: (ticker: string, name: string, type?: SymbolType) => void;
  onPriceChange?: (price: StockPrice | null) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  region?: string;
}

export function StockTickerInput({
  value,
  selectedName,
  onChange,
  onPriceChange,
  placeholder = 'Search stock ticker...',
  disabled = false,
  label,
  error,
  region = 'US',
}: StockTickerInputProps) {
  const [localInput, setLocalInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputValue = isTyping ? localInput : value;
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<StockSymbol[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [noResults, setNoResults] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [price, setPrice] = useState<StockPrice | null>(null);
  const [isPriceLoading, setIsPriceLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const searchSymbols = useCallback(async (search: string) => {
    if (!search.trim()) {
      setResults([]);
      setIsOpen(false);
      setNoResults(false);
      return;
    }
    setIsLoading(true);
    setNoResults(false);
    try {
      const response = await stockSymbolApi.search({
        q: search.trim(),
        region,
        type: ['stock', 'etf'],
        limit: 5,
      });
      if (response.success && response.data) {
        setResults(response.data.symbols);
        setIsOpen(true);
        setHighlightedIndex(-1);
        setNoResults(response.data.symbols.length === 0);
        if (value && search.toUpperCase() !== value) {
          onChange('', '');
        }
      }
    } catch {
      setResults([]);
      setNoResults(true);
    } finally {
      setIsLoading(false);
    }
  }, [value, onChange, region]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setLocalInput(newValue);
    setIsTyping(true);
    if (newValue.trim()) setIsLoading(true); // instant feedback
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { searchSymbols(newValue); }, 150);
  };

  const handleSelect = async (symbol: StockSymbol) => {
    setIsTyping(false);
    setLocalInput('');
    onChange(symbol.symbol, symbol.name, symbol.type);
    setIsOpen(false);
    setResults([]);
    inputRef.current?.blur();
    setIsPriceLoading(true);
    setPrice(null);
    try {
      const response = await stockPriceApi.getPrices([symbol.symbol]);
      if (response.success && response.data) {
        const fetchedPrice = response.data[symbol.symbol];
        if (fetchedPrice) { setPrice(fetchedPrice); onPriceChange?.(fetchedPrice); }
        else { onPriceChange?.(null); }
      } else { onPriceChange?.(null); }
    } catch { onPriceChange?.(null); }
    finally { setIsPriceLoading(false); }
  };

  const handleClear = () => {
    setIsTyping(false);
    setLocalInput('');
    onChange('', '');
    setResults([]);
    setIsOpen(false);
    setNoResults(false);
    setPrice(null);
    onPriceChange?.(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setHighlightedIndex(prev => prev < results.length - 1 ? prev + 1 : 0); break;
      case 'ArrowUp': e.preventDefault(); setHighlightedIndex(prev => prev > 0 ? prev - 1 : results.length - 1); break;
      case 'Enter': e.preventDefault(); if (highlightedIndex >= 0) handleSelect(results[highlightedIndex]); break;
      case 'Escape': setIsOpen(false); break;
    }
  };

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightedIndex] as HTMLElement;
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node) &&
          listRef.current && !listRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { return () => { if (debounceRef.current) clearTimeout(debounceRef.current); }; }, []);

  const hasSelection = value && selectedName;

  return (
    <div className="w-full relative">
      {label && (
        <label className="text-xs uppercase tracking-wide block mb-1 font-medium" style={{ color: colors.text }}>
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder={placeholder}
          disabled={disabled}
          className={cn('w-full px-3 py-2 rounded-md text-sm outline-none pr-16', disabled && 'opacity-50 cursor-not-allowed')}
          style={{
            backgroundColor: colors.surfaceLight,
            borderWidth: '1px', borderStyle: 'solid',
            borderColor: noResults && inputValue && !isLoading ? colors.negative : colors.border,
            borderRadius: '6px', color: colors.text,
          }}
          autoComplete="off"
        />
        {isLoading && <div className="absolute right-8 top-1/2 -translate-y-1/2"><Loader size="sm" variant="dots" /></div>}
        {hasSelection && !disabled && (
          <button type="button" onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-xs hover:opacity-70"
            style={{ color: colors.muted }}>×</button>
        )}
      </div>

      {hasSelection && (
        <div className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: colors.muted }}>
          <span className="truncate">{selectedName}</span>
          {isPriceLoading && <><span>·</span><Loader size="sm" variant="dots" /></>}
          {price && !isPriceLoading && (
            <>
              <span>·</span>
              <span style={{ color: colors.text }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: price.currency, minimumFractionDigits: 2 }).format(price.price)}
              </span>
              {price.changePercent != null && (
                <span style={{ color: price.changePercent >= 0 ? colors.positive : colors.negative }}>
                  {price.changePercent >= 0 ? '+' : ''}{price.changePercent.toFixed(2)}%
                </span>
              )}
            </>
          )}
        </div>
      )}

      {isOpen && results.length > 0 && (
        <div ref={listRef} className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto rounded-md"
          style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          {results.map((symbol, index) => (
            <div key={symbol.symbol} onClick={() => handleSelect(symbol)}
              className="px-3 py-2 cursor-pointer flex items-center justify-between gap-2"
              style={{ backgroundColor: highlightedIndex === index ? colors.surfaceLight : 'transparent' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm" style={{ color: colors.text }}>{symbol.symbol}</span>
                  {symbol.type && symbol.type !== 'other' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-medium"
                      style={{ backgroundColor: symbol.type === 'etf' ? '#3b82f6' : colors.surfaceLight, color: symbol.type === 'etf' ? '#fff' : colors.muted }}>
                      {symbol.type}
                    </span>
                  )}
                </div>
                <p className="text-xs truncate" style={{ color: colors.muted }}>
                  {symbol.name}
                  {symbol.exchangeDisplay && <span style={{ color: colors.border }}> · {symbol.exchangeDisplay}</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {noResults && inputValue && !isLoading && (
        <div className="mt-2 flex items-start gap-2 text-xs">
          <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
            style={{ backgroundColor: colors.negative }}>!</span>
          <div>
            <p style={{ color: colors.negative }}>Stock &quot;{inputValue}&quot; not found</p>
            <p className="mt-0.5" style={{ color: colors.muted }}>
              Check the ticker symbol or{' '}
              <button type="button" onClick={() => setFeedbackDialogOpen(true)}
                className="underline hover:no-underline font-medium" style={{ color: colors.accent }}>
                report missing stock
              </button>
            </p>
          </div>
        </div>
      )}

      <MissingStockFeedbackDialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen} symbol={inputValue} market="US" />

      {error && <p className="text-xs mt-1" style={{ color: colors.negative }}>{error}</p>}
    </div>
  );
}
