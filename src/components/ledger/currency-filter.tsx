'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CoinsIcon } from '@/components/icons';
import type { Currency } from '@/types';

interface CurrencyFilterProps {
  value: string;
  currencies: Currency[];
  onChange: (currencyId: string) => void;
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function CurrencyFilter({ value, currencies, onChange }: CurrencyFilterProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (currencyId: string) => {
    onChange(currencyId);
    setOpen(false);
  };

  const selectedCurrency = currencies.find(c => c.id === value);
  const displayValue = selectedCurrency?.code || 'Currency';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="group inline-flex items-center gap-1.5 h-8 pl-3 pr-2 text-[13px] font-medium bg-gradient-to-b from-background to-muted/30 border border-border/60 hover:border-border hover:shadow-sm rounded-full transition-all duration-200">
          <CoinsIcon className="h-3.5 w-3.5 text-primary/70" />
          <span className="text-foreground/80 group-hover:text-foreground">{displayValue}</span>
          <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1.5 rounded-xl border-border/60 shadow-xl shadow-black/5" align="end" sideOffset={6}>
        <div className="flex flex-col gap-0.5 max-h-[280px] overflow-y-auto">
          {currencies.map((currency) => {
            const isSelected = value === currency.id;
            return (
              <button
                key={currency.id}
                onClick={() => handleSelect(currency.id)}
                className={`flex items-center justify-between px-3 py-2 text-[13px] rounded-lg transition-all duration-150 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium">{currency.code}</span>
                  <span className="text-xs opacity-70">{currency.name}</span>
                </span>
                {isSelected && <CheckIcon className="h-3.5 w-3.5 shrink-0 ml-2" />}
              </button>
            );
          })}

          {currencies.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              No currencies yet
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
