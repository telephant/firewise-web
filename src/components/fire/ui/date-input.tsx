'use client';

import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { colors } from './theme';
import { cn } from '@/lib/utils';

export interface DateInputProps {
  label?: string;
  value?: string; // 'YYYY-MM-DD'
  onChange?: (value: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Week starts Monday
const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

type ViewMode = 'days' | 'years';

function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay(); // 0=Sun
  return (day + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${MONTH_SHORT[m - 1]} ${d}, ${y}`;
}

function getTodayStr(): string {
  const t = new Date();
  return toDateStr(t.getFullYear(), t.getMonth(), t.getDate());
}

export function DateInput({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder = 'Select date',
  className,
  disabled = false,
}: DateInputProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>('days');
  const [viewDate, setViewDate] = React.useState<Date>(() => {
    if (value) return new Date(value + 'T00:00:00');
    return new Date();
  });

  // Grid ref for keyboard navigation
  const gridRef = React.useRef<HTMLDivElement>(null);
  // Track focused day in keyboard nav
  const [focusedDay, setFocusedDay] = React.useState<number | null>(null);

  const hasError = !!error;
  const todayStr = getTodayStr();

  // Sync viewDate when value changes externally
  React.useEffect(() => {
    if (value) {
      setViewDate(new Date(value + 'T00:00:00'));
    }
  }, [value]);

  // Reset view mode when closing
  React.useEffect(() => {
    if (!isOpen) {
      setViewMode('days');
      setFocusedDay(null);
    }
  }, [isOpen]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOffset = getFirstDayOfWeek(year, month);

  // Calendar days grid: nulls for leading empty cells
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOffset; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  // Year grid: current year ± 5, arranged 3 per row
  const currentYear = new Date().getFullYear();
  const yearStart = currentYear - 5;
  const years: number[] = [];
  for (let y = yearStart; y <= currentYear + 6; y++) years.push(y);

  function handleDateSelect(day: number) {
    const dateStr = toDateStr(year, month, day);
    onChange?.(dateStr);
    setIsOpen(false);
  }

  function handlePrevMonth() {
    setViewDate(new Date(year, month - 1, 1));
    setFocusedDay(null);
  }

  function handleNextMonth() {
    setViewDate(new Date(year, month + 1, 1));
    setFocusedDay(null);
  }

  function handleToday() {
    const today = new Date();
    const dateStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
    onChange?.(dateStr);
    setIsOpen(false);
  }

  function handleYearSelect(y: number) {
    setViewDate(new Date(y, month, 1));
    setViewMode('days');
  }

  // Keyboard navigation for day grid
  function handleGridKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (viewMode !== 'days') return;

    const currentFocus = focusedDay ?? (value ? parseInt(value.split('-')[2]) : 1);

    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (e.key === 'Enter' && focusedDay !== null) {
      e.preventDefault();
      handleDateSelect(focusedDay);
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = currentFocus + 1;
      if (next > daysInMonth) {
        setViewDate(new Date(year, month + 1, 1));
        setFocusedDay(1);
      } else {
        setFocusedDay(next);
      }
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = currentFocus - 1;
      if (prev < 1) {
        const prevMonthDays = getDaysInMonth(year, month - 1);
        setViewDate(new Date(year, month - 1, 1));
        setFocusedDay(prevMonthDays);
      } else {
        setFocusedDay(prev);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = currentFocus + 7;
      if (next > daysInMonth) {
        setViewDate(new Date(year, month + 1, 1));
        setFocusedDay(next - daysInMonth);
      } else {
        setFocusedDay(next);
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = currentFocus - 7;
      if (prev < 1) {
        const prevMonthDays = getDaysInMonth(year, month - 1);
        setViewDate(new Date(year, month - 1, 1));
        setFocusedDay(prevMonthDays + prev);
      } else {
        setFocusedDay(prev);
      }
      return;
    }
  }

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          className="text-xs uppercase tracking-wide block mb-1 font-medium"
          style={{ color: hasError ? colors.negative : colors.text }}
        >
          {label}
        </label>
      )}

      <Popover.Root open={isOpen} onOpenChange={(open) => { if (!disabled) setIsOpen(open); }}>
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm outline-none text-left',
              'transition-all duration-150',
              'border bg-[#1C1C1E]',
              'flex items-center justify-between gap-2',
              hasError
                ? 'border-[#F87171]'
                : 'border-white/[0.08] hover:border-white/[0.15]',
              isOpen && !hasError && 'border-[#5E6AD2]/60 ring-2 ring-[#5E6AD2]/20',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span style={{ color: value ? colors.text : colors.muted }}>
              {value ? formatDisplay(value) : placeholder}
            </span>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: colors.muted, flexShrink: 0 }}
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={4}
            avoidCollisions={true}
            collisionPadding={8}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsOpen(false);
            }}
            style={{
              zIndex: 99999,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '10px',
              padding: '12px',
              width: '280px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.48), 0 2px 8px rgba(0,0,0,0.32)',
              outline: 'none',
              // Fade-in via Radix data-state
              animationDuration: '150ms',
              animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="date-input-popover"
          >
            {viewMode === 'days' ? (
              <div onKeyDown={handleGridKeyDown} ref={gridRef} tabIndex={-1} style={{ outline: 'none' }}>
                {/* Month/Year header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    style={{
                      padding: '5px',
                      borderRadius: '6px',
                      color: colors.muted,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 120ms, color 120ms',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                      (e.currentTarget as HTMLButtonElement).style.color = colors.text;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'none';
                      (e.currentTarget as HTMLButtonElement).style.color = colors.muted;
                    }}
                    aria-label="Previous month"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>

                  {/* Clickable month+year to open year view */}
                  <button
                    type="button"
                    onClick={() => setViewMode('years')}
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: colors.text,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      transition: 'background 120ms',
                      letterSpacing: '0.01em',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'none';
                    }}
                    aria-label="Select year"
                  >
                    {MONTH_NAMES[month]} {year}
                  </button>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    style={{
                      padding: '5px',
                      borderRadius: '6px',
                      color: colors.muted,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 120ms, color 120ms',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                      (e.currentTarget as HTMLButtonElement).style.color = colors.text;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'none';
                      (e.currentTarget as HTMLButtonElement).style.color = colors.muted;
                    }}
                    aria-label="Next month"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>

                {/* Day name headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                  {DAY_NAMES.map((d) => (
                    <div
                      key={d}
                      style={{
                        textAlign: 'center',
                        fontSize: '10px',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        padding: '4px 0',
                        color: colors.muted,
                      }}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                  {calendarDays.map((day, idx) => {
                    if (day === null) {
                      return <div key={`e-${idx}`} style={{ width: '34px', height: '34px' }} />;
                    }
                    const dateStr = toDateStr(year, month, day);
                    const isSelected = value === dateStr;
                    const isToday = dateStr === todayStr;
                    const isFocused = focusedDay === day;

                    return (
                      <DayCell
                        key={day}
                        day={day}
                        isSelected={isSelected}
                        isToday={isToday}
                        isFocused={isFocused}
                        onClick={() => handleDateSelect(day)}
                        onMouseEnter={() => setFocusedDay(day)}
                      />
                    );
                  })}
                </div>

                {/* Footer */}
                <div
                  style={{
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: `1px solid ${colors.border}`,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleToday}
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: colors.accent,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      transition: 'background 120ms',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(94,106,210,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'none';
                    }}
                  >
                    Today
                  </button>
                </div>
              </div>
            ) : (
              /* Year picker grid */
              <div>
                {/* Year grid header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text, padding: '4px 8px' }}>
                    Select Year
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewMode('days')}
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: colors.muted,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      transition: 'background 120ms, color 120ms',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                      (e.currentTarget as HTMLButtonElement).style.color = colors.text;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'none';
                      (e.currentTarget as HTMLButtonElement).style.color = colors.muted;
                    }}
                    aria-label="Back to calendar"
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                  {years.map((y) => {
                    const isCurrentYear = y === year;
                    const isThisYear = y === currentYear;
                    return (
                      <YearCell
                        key={y}
                        yearValue={y}
                        isSelected={isCurrentYear}
                        isThisYear={isThisYear}
                        onClick={() => handleYearSelect(y)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {hasError && (
        <p className="mt-1 text-xs" style={{ color: colors.negative }}>{error}</p>
      )}
      {hint && !hasError && (
        <p className="mt-1 text-xs" style={{ color: colors.muted }}>{hint}</p>
      )}

      {/* Popover animation styles */}
      <style>{`
        .date-input-popover[data-state='open'] {
          animation: dateInputFadeIn 150ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .date-input-popover[data-state='closed'] {
          animation: dateInputFadeOut 100ms ease-in;
        }
        @keyframes dateInputFadeIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dateInputFadeOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(-4px) scale(0.98); }
        }
      `}</style>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface DayCellProps {
  day: number;
  isSelected: boolean;
  isToday: boolean;
  isFocused: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

function DayCell({ day, isSelected, isToday, isFocused, onClick, onMouseEnter }: DayCellProps) {
  const [hovered, setHovered] = React.useState(false);

  const bgColor = isSelected
    ? colors.accent
    : isFocused || hovered
    ? 'rgba(255,255,255,0.07)'
    : 'transparent';

  const textColor = isSelected
    ? '#ffffff'
    : isToday
    ? colors.accent
    : colors.text;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => { setHovered(true); onMouseEnter(); }}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '34px',
        height: '34px',
        borderRadius: '7px',
        fontSize: '12px',
        fontWeight: isToday || isSelected ? 600 : 400,
        color: textColor,
        background: bgColor,
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        position: 'relative',
        transition: 'background 80ms, color 80ms',
        outline: isFocused && !isSelected ? `1px solid ${colors.accent}40` : 'none',
      }}
      tabIndex={-1}
    >
      <span style={{ lineHeight: 1 }}>{day}</span>
      {/* Today dot indicator */}
      {isToday && !isSelected && (
        <span
          style={{
            width: '3px',
            height: '3px',
            borderRadius: '50%',
            background: colors.accent,
            position: 'absolute',
            bottom: '4px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
      )}
    </button>
  );
}

interface YearCellProps {
  yearValue: number;
  isSelected: boolean;
  isThisYear: boolean;
  onClick: () => void;
}

function YearCell({ yearValue, isSelected, isThisYear, onClick }: YearCellProps) {
  const [hovered, setHovered] = React.useState(false);

  const bgColor = isSelected
    ? colors.accent
    : hovered
    ? 'rgba(255,255,255,0.07)'
    : 'transparent';

  const textColor = isSelected
    ? '#ffffff'
    : isThisYear
    ? colors.accent
    : colors.text;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '8px 4px',
        borderRadius: '7px',
        fontSize: '12px',
        fontWeight: isSelected || isThisYear ? 600 : 400,
        color: textColor,
        background: bgColor,
        border: isThisYear && !isSelected ? `1px solid ${colors.accent}40` : '1px solid transparent',
        cursor: 'pointer',
        transition: 'background 80ms, color 80ms',
        textAlign: 'center',
      }}
      tabIndex={-1}
    >
      {yearValue}
    </button>
  );
}
