'use client';

import type { Ledger } from '@/types';
import type { LinkedLedger } from '@/types/fire';
import {
  retro,
  Label,
  Loader,
} from '@/components/fire/ui';
import { useLedgersForLinking } from '@/hooks/fire/use-fire-data';

interface LedgerSelectorProps {
  value: LinkedLedger[];
  onChange: (ledgers: LinkedLedger[]) => void;
}

export function LedgerSelector({ value, onChange }: LedgerSelectorProps) {
  // Use SWR hook for data fetching
  const { ledgers, isLoading: loading } = useLedgersForLinking();

  const handleSelectLedger = (ledger: Ledger) => {
    const isSelected = value.some(v => v.ledger_id === ledger.id);
    if (isSelected) {
      // Remove from selection
      onChange(value.filter(v => v.ledger_id !== ledger.id));
    } else {
      // Add to selection
      onChange([...value, {
        ledger_id: ledger.id,
        ledger_name: ledger.name,
      }]);
    }
  };

  if (loading) {
    return (
      <div
        className="py-6 flex justify-center rounded-sm"
        style={{
          backgroundColor: retro.surface,
          border: `2px solid ${retro.border}`,
          boxShadow: `inset 2px 2px 0 ${retro.bevelMid}, inset -2px -2px 0 #fff`,
        }}
      >
        <Loader size="sm" variant="dots" />
      </div>
    );
  }

  if (ledgers.length === 0) {
    return (
      <div
        className="py-4 text-sm text-center rounded-sm"
        style={{
          color: retro.muted,
          backgroundColor: retro.surface,
          border: `2px solid ${retro.border}`,
          boxShadow: `inset 2px 2px 0 ${retro.bevelMid}, inset -2px -2px 0 #fff`,
        }}
      >
        No ledgers found. Create a ledger first to link expenses.
      </div>
    );
  }

  return (
    <div>
      <Label variant="muted" className="block mb-2">Select Ledgers to Track</Label>

      {/* Ledger List - Sunken container */}
      <div
        className="rounded-sm overflow-hidden"
        style={{
          backgroundColor: retro.surfaceLight,
          border: `2px solid ${retro.border}`,
          boxShadow: `inset 2px 2px 0 ${retro.bevelMid}, inset -2px -2px 0 #fff`,
        }}
      >
        {ledgers.map((ledger, index) => {
          const isSelected = value.some(v => v.ledger_id === ledger.id);
          const isLast = index === ledgers.length - 1;
          return (
            <button
              key={ledger.id}
              type="button"
              onClick={() => handleSelectLedger(ledger)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all active:translate-y-[1px]"
              style={{
                backgroundColor: isSelected ? retro.accent : 'transparent',
                color: isSelected ? '#ffffff' : retro.text,
                borderBottom: isLast ? 'none' : `2px solid ${retro.bevelMid}`,
              }}
            >
              {/* Retro Checkbox */}
              <span
                className="w-5 h-5 rounded-sm flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: isSelected ? '#ffffff' : retro.surfaceLight,
                  border: `2px solid ${retro.border}`,
                  boxShadow: isSelected
                    ? 'none'
                    : `inset 1px 1px 0 ${retro.bevelMid}, inset -1px -1px 0 #fff`,
                }}
              >
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6L5 9L10 3"
                      stroke={retro.accent}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>

              {/* Ledger Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{ledger.name}</div>
                {ledger.description && (
                  <div
                    className="text-xs truncate"
                    style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : retro.muted }}
                  >
                    {ledger.description}
                  </div>
                )}
              </div>

              {/* Role Badge - Retro style */}
              <span
                className="text-[10px] uppercase font-medium px-2 py-1 rounded-sm"
                style={{
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : retro.surface,
                  color: isSelected ? '#ffffff' : retro.muted,
                  border: isSelected ? 'none' : `1px solid ${retro.bevelMid}`,
                }}
              >
                {ledger.role || 'member'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Info - Retro raised style */}
      {value.length > 0 && (
        <div
          className="mt-3 px-3 py-2 rounded-sm text-xs"
          style={{
            backgroundColor: retro.surface,
            border: `2px solid ${retro.border}`,
            boxShadow: `2px 2px 0 ${retro.bevelDark}`,
          }}
        >
          <span style={{ color: retro.muted }}>
            {value.length === 1 ? 'Tracking expenses from: ' : `Tracking from ${value.length} ledgers: `}
          </span>
          <span style={{ color: retro.text, fontWeight: 500 }}>
            {value.map(v => v.ledger_name).join(', ')}
          </span>
        </div>
      )}
    </div>
  );
}
