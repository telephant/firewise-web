'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { retro, retroStyles, Loader } from '@/components/fire/ui';
import { stockSymbolApi, StockSymbol } from '@/lib/fire/api';
import { MissingStockFeedbackDialog } from '@/components/fire/feedback-dialog';
import { cn } from '@/lib/utils';

export interface StockTickerInputProps {
  value: string;
  selectedName?: string;
  onChange: (ticker: string, name: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
}

export function StockTickerInput({
  value,
  selectedName,
  onChange,
  placeholder = 'Search stock ticker...',
  disabled = false,
  label,
  error,
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
      const response = await stockSymbolApi.searchUs(search.trim(), 15);
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
  }, [value, onChange]);

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
  const handleSelect = (symbol: StockSymbol) => {
    setIsTyping(false); // Stop typing mode - show controlled value
    setLocalInput('');
    onChange(symbol.symbol, symbol.name);
    setIsOpen(false);
    setResults([]);
    inputRef.current?.blur();
  };

  // Clear selection
  const handleClear = () => {
    setIsTyping(false);
    setLocalInput('');
    onChange('', '');
    setResults([]);
    setIsOpen(false);
    setNoResults(false);
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
          style={{ color: retro.text }}
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
            'w-full px-3 py-2 rounded-sm text-sm outline-none pr-16',
            disabled && 'opacity-50 cursor-not-allowed',
            noResults && inputValue && !isLoading && 'animate-shake'
          )}
          style={{
            ...retroStyles.sunken,
            ...(noResults && inputValue && !isLoading ? {
              borderColor: '#c53030',
              boxShadow: `inset 2px 2px 0 rgba(197, 48, 48, 0.2)`,
            } : {}),
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
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-sm text-xs hover:bg-gray-200"
            style={{ color: retro.muted }}
          >
            x
          </button>
        )}
      </div>

      {/* Selected name display */}
      {hasSelection && (
        <p className="text-xs mt-1 truncate" style={{ color: retro.muted }}>
          {selectedName}
        </p>
      )}

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto rounded-sm"
          style={{
            ...retroStyles.raised,
            boxShadow: `3px 3px 0 ${retro.bevelDark}, 0 4px 12px rgba(0,0,0,0.15)`,
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
                  highlightedIndex === index ? retro.bevelMid : 'transparent',
              }}
            >
              <div className="flex-1 min-w-0">
                <span
                  className="font-bold text-sm"
                  style={{ color: retro.text }}
                >
                  {symbol.symbol}
                </span>
                <p
                  className="text-xs truncate"
                  style={{ color: retro.muted }}
                >
                  {symbol.name}
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
            style={{ backgroundColor: '#c53030' }}
          >
            !
          </span>
          <div>
            <p style={{ color: '#c53030' }}>
              Stock &quot;{inputValue}&quot; not found in US market
            </p>
            <p className="mt-0.5" style={{ color: retro.muted }}>
              Check the ticker symbol or{' '}
              <button
                type="button"
                onClick={handleOpenFeedback}
                className="underline hover:no-underline font-medium"
                style={{ color: retro.accent }}
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
        <p className="text-xs mt-1" style={{ color: '#c53030' }}>
          {error}
        </p>
      )}
    </div>
  );
}
