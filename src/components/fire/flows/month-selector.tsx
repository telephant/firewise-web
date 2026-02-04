'use client';

import { colors } from '@/components/fire/ui';

interface MonthSelectorProps {
  value: { year: number; month: number };
  onChange: (value: { year: number; month: number }) => void;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function MonthSelector({ value, onChange }: MonthSelectorProps) {
  const handlePrev = () => {
    if (value.month === 0) {
      onChange({ year: value.year - 1, month: 11 });
    } else {
      onChange({ year: value.year, month: value.month - 1 });
    }
  };

  const handleNext = () => {
    if (value.month === 11) {
      onChange({ year: value.year + 1, month: 0 });
    } else {
      onChange({ year: value.year, month: value.month + 1 });
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handlePrev}
        className="px-2 py-1 text-xs font-bold rounded-md transition-all active:translate-y-[1px]"
        style={{
          backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px',
          color: colors.text,
        }}
      >
        ◀
      </button>
      <div
        className="px-3 py-1 min-w-[100px] text-center text-sm font-medium rounded-md"
        style={{
          backgroundColor: colors.surfaceLight, border: `1px solid ${colors.border}`, borderRadius: '6px',
          color: colors.text,
        }}
      >
        {MONTHS[value.month]} {value.year}
      </div>
      <button
        onClick={handleNext}
        className="px-2 py-1 text-xs font-bold rounded-md transition-all active:translate-y-[1px]"
        style={{
          backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px',
          color: colors.text,
        }}
      >
        ▶
      </button>
    </div>
  );
}
