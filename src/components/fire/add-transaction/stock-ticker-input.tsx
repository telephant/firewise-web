'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { colors, Loader } from '@/components/fire/ui';
import { stockSymbolApi, stockPriceApi, StockSymbol, StockPrice, SymbolType } from '@/lib/fire/api';
import { MissingStockFeedbackDialog } from '@/components/fire/feedback-dialog';
import { formatCurrency } from '@/lib/fire/utils';
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
  region?: string; // 'US', 'SG', etc.
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
  // Local input value for typing - separate from selected value
  // When user is typing, we show their input. When they select or clear, we sync with value prop
  const [localInput, setLocalInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Display value: show local input while typing, otherwise show the controlled value
  const inputValue = isTyping ? localInput : value;
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<StockSymbol[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [noResults, setNoResults] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

  // Price state
  const [price, setPrice] = useState<StockPrice | null>(null);
  const [isPriceLoading, setIsPriceLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Search for symbols
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
        setIsOpen(true); // Always open to show results or "not found"
        setHighlightedIndex(-1);
        setNoResults(response.data.symbols.length === 0);

        // Clear selection if user changed input and no exact match
        if (value && search.toUpperCase() !== value) {
          onChange('', '');
        }
      }
    } catch (error) {
      console.error('Failed to search symbols:', error);
      setResults([]);
      setNoResults(true);
    } finally {
      setIsLoading(false);
    }
  }, [value, onChange, region]);

  // Debounced search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setLocalInput(newValue);
    setIsTyping(true);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce search
    debounceRef.current = setTimeout(() => {
      searchSymbols(newValue);
    }, 300);
  };

  // Select a symbol
  const handleSelect = async (symbol: StockSymbol) => {
    setIsTyping(false); // Stop typing mode - show controlled value
    setLocalInput('');
    onChange(symbol.symbol, symbol.name, symbol.type);
    setIsOpen(false);
    setResults([]);
    inputRef.current?.blur();

    // Fetch price for the selected symbol
    setIsPriceLoading(true);
    setPrice(null);
    try {
      const response = await stockPriceApi.getPrices([symbol.symbol]);
      if (response.success && response.data) {
        const fetchedPrice = response.data[symbol.symbol];
        if (fetchedPrice) {
          setPrice(fetchedPrice);
          onPriceChange?.(fetchedPrice);
        } else {
          onPriceChange?.(null);
        }
      } else {
        onPriceChange?.(null);
      }
    } catch (err) {
      console.error('Failed to fetch price:', err);
      onPriceChange?.(null);
    } finally {
      setIsPriceLoading(false);
    }
  };

  // Clear selection
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

  // Open feedback dialog
  const handleOpenFeedback = () => {
    setFeedbackDialogOpen(true);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const hasSelection = value && selectedName;

  return (
    <div className="w-full relative">
      {label && (
        <label
          className="text-xs uppercase tracking-wide block mb-1 font-medium"
          style={{ color: colors.text }}
        >
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
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full px-3 py-2 rounded-md text-sm outline-none pr-16',
            disabled && 'opacity-50 cursor-not-allowed',
            noResults && inputValue && !isLoading && 'animate-shake'
          )}
          style={{
            backgroundColor: colors.surfaceLight,
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: noResults && inputValue && !isLoading ? colors.negative : colors.border,
            borderRadius: '6px',
            color: colors.text,
          }}
          autoComplete="off"
        />

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2">
            <Loader size="sm" variant="dots" />
          </div>
        )}

        {/* Clear button */}
        {hasSelection && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-xs hover:opacity-70 transition-colors duration-150"
            style={{ color: colors.muted }}
          >
            x
          </button>
        )}
      </div>

      {/* Selected name and price display */}
      {hasSelection && (
        <div className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: colors.muted }}>
          <span className="truncate">{selectedName}</span>
          {isPriceLoading && (
            <>
              <span>·</span>
              <Loader size="sm" variant="dots" />
            </>
          )}
          {price && !isPriceLoading && (
            <>
              <span>·</span>
              <span style={{ color: colors.text }}>
                {formatCurrency(price.price, { currency: price.currency, decimals: 2 })}
              </span>
              {price.changePercent != null && (
                <span
                  style={{
                    color: price.changePercent >= 0 ? colors.positive : colors.negative,
                  }}
                >
                  {price.changePercent >= 0 ? '+' : ''}
                  {price.changePercent.toFixed(2)}%
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto rounded-md"
          style={{
            backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {results.map((symbol, index) => (
            <div
              key={symbol.symbol}
              onClick={() => handleSelect(symbol)}
              className={cn(
                'px-3 py-2 cursor-pointer flex items-center justify-between gap-2',
                highlightedIndex === index && 'bg-opacity-50'
              )}
              style={{
                backgroundColor:
                  highlightedIndex === index ? colors.surfaceLight : 'transparent',
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold text-sm"
                    style={{ color: colors.text }}
                  >
                    {symbol.symbol}
                  </span>
                  {symbol.type && symbol.type !== 'other' && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded uppercase font-medium"
                      style={{
                        backgroundColor: symbol.type === 'etf' ? '#3b82f6' : colors.surfaceLight,
                        color: symbol.type === 'etf' ? '#fff' : colors.muted,
                      }}
                    >
                      {symbol.type}
                    </span>
                  )}
                </div>
                <p
                  className="text-xs truncate"
                  style={{ color: colors.muted }}
                >
                  {symbol.name}
                  {symbol.exchangeDisplay && (
                    <span style={{ color: colors.border }}> · {symbol.exchangeDisplay}</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results - inline error message */}
      {noResults && inputValue && !isLoading && (
        <div className="mt-2 flex items-start gap-2 text-xs">
          <span
            className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
            style={{ backgroundColor: colors.negative }}
          >
            !
          </span>
          <div>
            <p style={{ color: colors.negative }}>
              Stock &quot;{inputValue}&quot; not found in US market
            </p>
            <p className="mt-0.5" style={{ color: colors.muted }}>
              Check the ticker symbol or{' '}
              <button
                type="button"
                onClick={handleOpenFeedback}
                className="underline hover:no-underline font-medium transition-colors duration-150"
                style={{ color: colors.accent }}
              >
                report missing stock
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Feedback dialog */}
      <MissingStockFeedbackDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
        symbol={inputValue}
        market="US"
      />

      {/* Error message from parent */}
      {error && (
        <p className="text-xs mt-1" style={{ color: colors.negative }}>
          {error}
        </p>
      )}
    </div>
  );
}
