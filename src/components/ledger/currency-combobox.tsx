'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { currencyExchangeApi, type CurrencyExchange } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

interface CurrencyComboboxProps {
  value: string; // currency code (e.g., "usd")
  onValueChange: (code: string, currency: CurrencyExchange) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  // Ledger currencies for "favorites" section
  ledgerCurrencies?: Array<{ code: string; name: string }>;
}

export function CurrencyCombobox({
  value,
  onValueChange,
  placeholder = 'Select currency...',
  disabled = false,
  className,
  ledgerCurrencies = [],
}: CurrencyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [currencies, setCurrencies] = useState<CurrencyExchange[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyExchange | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(search, 300);

  // Fetch currencies based on search
  const fetchCurrencies = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const response = await currencyExchangeApi.search(query, 20);
      if (response.success && response.data) {
        setCurrencies(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch currencies:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on search change
  useEffect(() => {
    if (open) {
      fetchCurrencies(debouncedSearch);
    }
  }, [debouncedSearch, open, fetchCurrencies]);

  // Fetch selected currency details when value changes
  useEffect(() => {
    if (value && !selectedCurrency) {
      currencyExchangeApi.get(value).then((response) => {
        if (response.success && response.data) {
          setSelectedCurrency(response.data);
        }
      });
    }
  }, [value, selectedCurrency]);

  // Close on click outside or Escape key
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleSelect = (currency: CurrencyExchange) => {
    setSelectedCurrency(currency);
    onValueChange(currency.code, currency);
    setOpen(false);
    setSearch('');
  };

  // Get display label
  const displayValue = selectedCurrency
    ? `${selectedCurrency.code.toUpperCase()} - ${selectedCurrency.name}`
    : value
    ? value.toUpperCase()
    : placeholder;

  // Filter out ledger currencies that are already in the search results
  const ledgerCurrencyCodes = new Set(ledgerCurrencies.map((c) => c.code.toLowerCase()));
  const otherCurrencies = currencies.filter((c) => !ledgerCurrencyCodes.has(c.code.toLowerCase()));

  // Match ledger currencies with rate info from search results
  const matchedLedgerCurrencies = ledgerCurrencies.map((lc) => {
    const match = currencies.find((c) => c.code.toLowerCase() === lc.code.toLowerCase());
    return match || { code: lc.code, name: lc.name, rate: 1 };
  });

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground', className)}
      >
        <span className="truncate">{displayValue}</span>
        <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover text-popover-foreground shadow-md">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <SearchIcon className="h-4 w-4 shrink-0 opacity-50" />
            <input
              type="text"
              placeholder="Search currencies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>

          {/* Currency list */}
          <div
            className="p-1"
            style={{ maxHeight: '280px', overflowY: 'auto' }}
          >
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>
            ) : currencies.length === 0 && !matchedLedgerCurrencies.length ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No currency found.</div>
            ) : (
              <>
                {/* Ledger currencies (favorites) */}
                {matchedLedgerCurrencies.length > 0 && !search && (
                  <div className="pb-1">
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Your Currencies</div>
                    {matchedLedgerCurrencies.map((currency) => (
                      <div
                        key={`ledger-${currency.code}`}
                        onClick={() => handleSelect(currency)}
                        className={cn(
                          'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent',
                          value?.toLowerCase() === currency.code.toLowerCase() && 'bg-accent'
                        )}
                      >
                        <CheckIcon
                          className={cn(
                            'h-4 w-4 shrink-0',
                            value?.toLowerCase() === currency.code.toLowerCase() ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className="font-mono font-medium w-12">{currency.code.toUpperCase()}</span>
                        <span className="truncate text-muted-foreground">{currency.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* All currencies from search */}
                {(search ? currencies : otherCurrencies).length > 0 && (
                  <div>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      {search ? 'Results' : 'All Currencies'}
                    </div>
                    {(search ? currencies : otherCurrencies).map((currency) => (
                      <div
                        key={currency.code}
                        onClick={() => handleSelect(currency)}
                        className={cn(
                          'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent',
                          value?.toLowerCase() === currency.code.toLowerCase() && 'bg-accent'
                        )}
                      >
                        <CheckIcon
                          className={cn(
                            'h-4 w-4 shrink-0',
                            value?.toLowerCase() === currency.code.toLowerCase() ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className="font-mono font-medium w-12">{currency.code.toUpperCase()}</span>
                        <span className="truncate text-muted-foreground">{currency.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
