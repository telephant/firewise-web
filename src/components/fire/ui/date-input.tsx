'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { colors } from './theme';
import { cn } from '@/lib/utils';

export interface DateInputProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

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
  const [viewDate, setViewDate] = React.useState(() => {
    if (value) return new Date(value);
    return new Date();
  });
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const hasError = !!error;

  // Calculate dropdown position when opening
  const updateDropdownPosition = React.useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Using fixed positioning, so use viewport coordinates directly
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, []);

  // Parse value to Date
  const selectedDate = value ? new Date(value) : null;

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedTrigger = containerRef.current?.contains(target);
      const clickedDropdown = dropdownRef.current?.contains(target);
      if (!clickedTrigger && !clickedDropdown) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update position on scroll/resize
  React.useEffect(() => {
    if (!isOpen) return;
    updateDropdownPosition();
    window.addEventListener('scroll', updateDropdownPosition, true);
    window.addEventListener('resize', updateDropdownPosition);
    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [isOpen, updateDropdownPosition]);

  // Update viewDate when value changes
  React.useEffect(() => {
    if (value) {
      setViewDate(new Date(value));
    }
  }, [value]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateSelect = (e: React.MouseEvent, day: number) => {
    e.preventDefault();
    e.stopPropagation();
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange?.(dateStr);
    setIsOpen(false);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleToday = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    onChange?.(dateStr);
    setViewDate(today);
    setIsOpen(false);
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Generate calendar grid
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  return (
    <div className={cn('w-full relative', className)} ref={containerRef}>
      {label && (
        <label
          className="text-xs uppercase tracking-wide block mb-1 font-medium"
          style={{ color: hasError ? colors.negative : colors.text }}
        >
          {label}
        </label>
      )}

      {/* Input trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            if (!isOpen) updateDropdownPosition();
            setIsOpen(!isOpen);
          }
        }}
        className={cn(
          'w-full px-3 py-2 rounded-md text-sm outline-none text-left',
          'transition-all duration-150',
          'border bg-[#1C1C1E]',
          'flex items-center justify-between gap-2',
          hasError
            ? 'border-[#F87171]'
            : 'border-white/[0.08] hover:border-white/[0.15]',
          isOpen && 'border-[#5E6AD2]/60 ring-2 ring-[#5E6AD2]/20',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span style={{ color: value ? colors.text : colors.muted }}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ color: colors.muted }}
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {hasError && (
        <p className="mt-1 text-xs" style={{ color: colors.negative }}>{error}</p>
      )}
      {hint && !hasError && (
        <p className="mt-1 text-xs" style={{ color: colors.muted }}>{hint}</p>
      )}

      {/* Calendar dropdown - rendered via portal to avoid overflow clipping */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          data-select-dropdown
          className="p-3 rounded-lg shadow-xl"
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            minWidth: '280px',
            zIndex: 99999,
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Header with month/year navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={(e) => handlePrevMonth(e)}
              className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors"
              style={{ color: colors.muted }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="text-sm font-medium" style={{ color: colors.text }}>
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              type="button"
              onClick={(e) => handleNextMonth(e)}
              className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors"
              style={{ color: colors.muted }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Day names header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_NAMES.map((day) => (
              <div
                key={day}
                className="text-center text-[10px] font-medium py-1"
                style={{ color: colors.muted }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="w-8 h-8" />;
              }

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = value === dateStr;
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={(e) => handleDateSelect(e, day)}
                  className={cn(
                    'w-8 h-8 rounded-md text-xs font-medium transition-all duration-100',
                    'hover:bg-white/[0.08]',
                    isSelected && 'bg-[#5E6AD2] hover:bg-[#5E6AD2]/90',
                    isToday && !isSelected && 'ring-1 ring-[#5E6AD2]/50'
                  )}
                  style={{
                    color: isSelected ? '#fff' : isToday ? colors.accent : colors.text,
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer with Today button */}
          <div
            className="mt-3 pt-2 flex justify-center"
            style={{ borderTop: `1px solid ${colors.border}` }}
          >
            <button
              type="button"
              onClick={(e) => handleToday(e)}
              className="text-xs px-3 py-1.5 rounded-md hover:bg-white/[0.06] transition-colors"
              style={{ color: colors.accent }}
            >
              Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
