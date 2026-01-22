'use client';

import * as React from 'react';
import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { retro, retroStyles } from './theme';
import { cn } from '@/lib/utils';
import { IconChevronDown } from './icons';

// Common currencies with their full names
export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: '$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: '$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: '$' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: '$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: '$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
];

// Helper to get currency info by code
export function getCurrencyInfo(code: string) {
  return CURRENCIES.find(c => c.code.toUpperCase() === code.toUpperCase());
}

// Helper to get currency symbol by code
export function getCurrencySymbolFromCode(code: string): string {
  return getCurrencyInfo(code)?.symbol || code;
}

export interface CurrencyComboboxProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  error?: string;
  placeholder?: string;
}

export function CurrencyCombobox({
  label,
  value,
  onChange,
  disabled,
  className,
  error,
  placeholder = 'Select currency...',
}: CurrencyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const hasError = !!error;

  const selectedCurrency = CURRENCIES.find((c) => c.code === value);

  const handleSelect = (code: string) => {
    onChange?.(code);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="w-full">
      {label && (
        <label
          className="text-xs uppercase tracking-wide block mb-1 font-medium"
          style={{ color: hasError ? '#c53030' : retro.text }}
        >
          {label}
        </label>
      )}
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild disabled={disabled}>
          <button
            type="button"
            className={cn(
              'w-full px-3 py-2 rounded-sm text-sm text-left flex items-center justify-between gap-2',
              'focus:outline-none focus:ring-1',
              disabled && 'opacity-50 cursor-not-allowed',
              hasError && 'animate-shake',
              className
            )}
            style={{
              ...retroStyles.sunken,
              color: selectedCurrency ? retro.text : retro.muted,
              ...(hasError
                ? {
                    borderColor: '#c53030',
                    boxShadow: 'inset 2px 2px 0 rgba(197, 48, 48, 0.2)',
                  }
                : {}),
            }}
          >
            <span className="truncate">
              {selectedCurrency ? (
                <span className="flex items-center gap-2">
                  <span className="font-medium">{selectedCurrency.code}</span>
                  <span style={{ color: retro.muted }}>{selectedCurrency.name}</span>
                </span>
              ) : (
                placeholder
              )}
            </span>
            <span style={{ color: retro.muted }}>
              <IconChevronDown size={12} />
            </span>
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className="z-[9999] rounded-sm overflow-hidden"
            style={{
              backgroundColor: retro.surface,
              border: `2px solid ${retro.border}`,
              boxShadow: `3px 3px 0 ${retro.bevelDark}`,
              width: 'var(--radix-popover-trigger-width)',
              maxHeight: '300px',
            }}
            sideOffset={4}
            align="start"
          >
            <Command className="w-full" shouldFilter={true}>
              <div
                className="px-2 py-2"
                style={{ borderBottom: `1px solid ${retro.border}` }}
              >
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search currency..."
                  className="w-full px-2 py-1.5 text-sm rounded-sm outline-none"
                  style={{
                    ...retroStyles.sunken,
                    color: retro.text,
                  }}
                />
              </div>
              <Command.List className="max-h-[200px] overflow-y-auto p-1">
                <Command.Empty
                  className="px-3 py-2 text-xs text-center"
                  style={{ color: retro.muted }}
                >
                  No currency found
                </Command.Empty>
                {CURRENCIES.map((currency) => (
                  <Command.Item
                    key={currency.code}
                    value={`${currency.code} ${currency.name}`}
                    onSelect={() => handleSelect(currency.code)}
                    className={cn(
                      'px-3 py-2 text-sm cursor-pointer rounded-sm flex items-center justify-between',
                      'data-[selected=true]:bg-[var(--accent)] data-[selected=true]:text-white'
                    )}
                    style={
                      {
                        '--accent': retro.accent,
                        color: retro.text,
                        backgroundColor:
                          value === currency.code ? retro.surfaceLight : 'transparent',
                      } as React.CSSProperties
                    }
                  >
                    <div className="flex items-center gap-2">
                      {value === currency.code && (
                        <span className="text-xs">✓</span>
                      )}
                      <span className={value === currency.code ? '' : 'pl-4'}>
                        <span className="font-medium">{currency.code}</span>
                        <span className="ml-2" style={{ color: retro.muted }}>
                          {currency.name}
                        </span>
                      </span>
                    </div>
                    <span style={{ color: retro.muted }}>{currency.symbol}</span>
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* Error message */}
      {hasError && (
        <div className="mt-1.5 flex items-start gap-1.5 text-xs">
          <span
            className="flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[9px] font-bold mt-0.5"
            style={{ backgroundColor: '#c53030' }}
          >
            !
          </span>
          <span style={{ color: '#c53030' }}>{error}</span>
        </div>
      )}
    </div>
  );
}
