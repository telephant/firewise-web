'use client';

import * as React from 'react';
import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { colors } from './theme';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

// Common currencies with their full names
export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '\u20AC' },
  { code: 'GBP', name: 'British Pound', symbol: '\u00A3' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '\u00A5' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '\u00A5' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: '$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: '$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: '$' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'KRW', name: 'South Korean Won', symbol: '\u20A9' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: '$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '\u20B9' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: '$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'z\u0142' },
  { code: 'THB', name: 'Thai Baht', symbol: '\u0E3F' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '\u20AA' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'K\u010D' },
  { code: 'AED', name: 'UAE Dirham', symbol: '\u062F.\u0625' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '\u20BA' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '\uFDFC' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '\u20B1' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '\u20BD' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: '.\u062F.\u0628' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: '\u043B\u0432' },
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
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null);

  // When inside a Radix Dialog (modal), react-remove-scroll blocks wheel events on
  // portaled elements outside the dialog DOM tree. Fix: portal into the dialog content
  // element so the popover is inside the scroll-lock's allowed zone.
  React.useEffect(() => {
    if (open && triggerRef.current) {
      const dialog = triggerRef.current.closest('[role="dialog"]');
      setPortalContainer(dialog as HTMLElement | null);
    }
  }, [open]);

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
          style={{ color: hasError ? colors.negative : colors.text }}
        >
          {label}
        </label>
      )}
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild disabled={disabled}>
          <button
            ref={triggerRef}
            type="button"
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm text-left flex items-center justify-between gap-2',
              'outline-none transition-all duration-150',
              'border bg-[#1C1C1E]',
              hasError
                ? 'border-[#F87171]'
                : 'border-white/[0.08] hover:border-white/[0.15]',
              'focus:border-[#5E6AD2]/60 focus:ring-2 focus:ring-[#5E6AD2]/20',
              'data-[state=open]:border-[#5E6AD2]/60 data-[state=open]:ring-2 data-[state=open]:ring-[#5E6AD2]/20',
              disabled && 'opacity-50 cursor-not-allowed',
              hasError && 'animate-shake',
              className
            )}
            style={{
              color: selectedCurrency ? colors.text : colors.muted,
            }}
          >
            <span className="truncate">
              {selectedCurrency ? (
                <span className="flex items-center gap-2">
                  <span className="font-medium">{selectedCurrency.code}</span>
                  <span style={{ color: colors.muted }}>{selectedCurrency.name}</span>
                </span>
              ) : (
                placeholder
              )}
            </span>
            <ChevronDown size={14} strokeWidth={1.5} style={{ color: colors.muted }} />
          </button>
        </Popover.Trigger>

        <Popover.Portal container={portalContainer ?? undefined}>
          <Popover.Content
            className="z-[9999] rounded-lg"
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              boxShadow: '0 8px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
              width: 'var(--radix-popover-trigger-width)',
            }}
            sideOffset={4}
            align="start"
          >
            <Command className="flex flex-col w-full" shouldFilter={true}>
              <div
                className="flex-shrink-0 px-2 py-2"
                style={{ borderBottom: `1px solid ${colors.border}` }}
              >
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search currency..."
                  className="w-full px-2 py-1.5 text-sm rounded-md outline-none transition-all duration-150 border border-white/[0.08] bg-[#1C1C1E] text-[#EDEDEF] placeholder:text-[#7C7C82] focus:border-[#5E6AD2]/60 focus:ring-2 focus:ring-[#5E6AD2]/20"
                />
              </div>
              <Command.List className="p-1" style={{ maxHeight: '240px', overflowY: 'auto', overscrollBehavior: 'contain' }}>
                  <Command.Empty
                    className="px-3 py-2 text-xs text-center"
                    style={{ color: colors.muted }}
                  >
                    No currency found
                  </Command.Empty>
                  {CURRENCIES.map((currency) => (
                    <Command.Item
                      key={currency.code}
                      value={`${currency.code} ${currency.name}`}
                      onSelect={() => handleSelect(currency.code)}
                      className={cn(
                        'px-3 py-2 text-sm cursor-pointer rounded-md flex items-center justify-between',
                        'transition-colors duration-100',
                        'data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-white',
                        value === currency.code ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]',
                      )}
                      style={{ color: colors.text }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-4 flex-shrink-0 flex items-center justify-center">
                          {value === currency.code && (
                            <Check size={12} strokeWidth={2} style={{ color: colors.accent }} />
                          )}
                        </span>
                        <span>
                          <span className="font-medium">{currency.code}</span>
                          <span className="ml-2" style={{ color: colors.muted }}>
                            {currency.name}
                          </span>
                        </span>
                      </div>
                      <span style={{ color: colors.muted }}>{currency.symbol}</span>
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
            style={{ backgroundColor: colors.negative }}
          >
            !
          </span>
          <span style={{ color: colors.negative }}>{error}</span>
        </div>
      )}
    </div>
  );
}
