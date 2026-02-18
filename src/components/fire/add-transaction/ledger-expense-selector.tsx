'use client';

import type { Ledger } from '@/types';
import type { LinkedLedger } from '@/types/fire';
import {
  colors,
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
        className="py-6 flex justify-center rounded-md"
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
        }}
      >
        <Loader size="sm" variant="dots" />
      </div>
    );
  }

  if (ledgers.length === 0) {
    return (
      <div
        className="py-4 text-sm text-center rounded-md"
        style={{
          color: colors.muted,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
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
        className="rounded-md overflow-hidden"
        style={{
          backgroundColor: colors.surfaceLight,
          border: `1px solid ${colors.border}`,
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
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all active:translate-y-[1px] hover:bg-white/[0.04]"
              style={{
                backgroundColor: isSelected ? colors.accent : 'transparent',
                color: isSelected ? '#ffffff' : colors.text,
                borderBottom: isLast ? 'none' : `1px solid ${colors.border}`,
              }}
            >
              {/* Checkbox */}
              <span
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: isSelected ? '#ffffff' : colors.surfaceLight,
                  border: `1px solid ${colors.border}`,
                }}
              >
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6L5 9L10 3"
                      stroke={colors.accent}
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
                    style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : colors.muted }}
                  >
                    {ledger.description}
                  </div>
                )}
              </div>

              {/* Role Badge */}
              <span
                className="text-[10px] uppercase font-medium px-2 py-1 rounded-md"
                style={{
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : colors.surface,
                  color: isSelected ? '#ffffff' : colors.muted,
                  border: isSelected ? 'none' : `1px solid ${colors.surfaceLight}`,
                }}
              >
                {ledger.role || 'member'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Info */}
      {value.length > 0 && (
        <div
          className="mt-3 px-3 py-2 rounded-md text-xs"
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
          }}
        >
          <span style={{ color: colors.muted }}>
            {value.length === 1 ? 'Tracking expenses from: ' : `Tracking from ${value.length} ledgers: `}
          </span>
          <span style={{ color: colors.text, fontWeight: 500 }}>
            {value.map(v => v.ledger_name).join(', ')}
          </span>
        </div>
      )}
    </div>
  );
}
