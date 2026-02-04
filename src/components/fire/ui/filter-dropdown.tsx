'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { colors } from './theme';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

export interface FilterOption {
  id: string;
  label: string;
  group?: string;
  icon?: ReactNode;
}

export interface FilterGroup {
  id: string;
  label: string;
}

interface FilterDropdownProps {
  // Options
  options: FilterOption[];
  groups?: FilterGroup[];
  // Selection
  value: string | string[];
  onChange: (value: string | string[]) => void;
  // Config
  multiple?: boolean;
  allLabel?: string;
  allValue?: string;
  placeholder?: string;
  minWidth?: string;
}

export function FilterDropdown({
  options,
  groups,
  value,
  onChange,
  multiple = false,
  allLabel = 'All',
  allValue = 'all',
  placeholder = 'Select...',
  minWidth = '140px',
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get selected values as array
  const selectedValues = multiple
    ? (value as string[])
    : value === allValue
      ? []
      : [value as string];

  // Get display label
  const getDisplayLabel = (): string => {
    if (multiple) {
      const selected = value as string[];
      if (selected.length === 0) return allLabel;
      if (selected.length === 1) {
        const opt = options.find((o) => o.id === selected[0]);
        return opt?.label || selected[0];
      }
      return `${selected.length} selected`;
    } else {
      if (value === allValue) return allLabel;
      const opt = options.find((o) => o.id === value);
      return opt?.label || placeholder;
    }
  };

  // Handle option click
  const handleOptionClick = (optionId: string) => {
    if (multiple) {
      const selected = value as string[];
      if (selected.includes(optionId)) {
        onChange(selected.filter((id) => id !== optionId));
      } else {
        onChange([...selected, optionId]);
      }
    } else {
      onChange(optionId);
      setIsOpen(false);
    }
  };

  // Handle "All" click
  const handleAllClick = () => {
    if (multiple) {
      onChange([]);
    } else {
      onChange(allValue);
      setIsOpen(false);
    }
  };

  // Clear all (for multi-select)
  const handleClear = () => {
    onChange([]);
  };

  // Group options if groups are provided
  const groupedOptions = groups
    ? groups.map((group) => ({
        ...group,
        options: options.filter((opt) => opt.group === group.id),
      }))
    : null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'px-3 py-1.5 text-xs rounded-md flex items-center gap-2',
          'transition-all duration-150 outline-none',
          'bg-[#141415] border border-white/[0.08] text-[#EDEDEF]',
          'hover:bg-[#1C1C1E] hover:border-white/[0.12]',
          'focus-visible:ring-2 focus-visible:ring-[#5E6AD2]/50',
          'active:scale-[0.97]',
        )}
        style={{ minWidth }}
      >
        <span className="flex-1 text-left">{getDisplayLabel()}</span>
        <ChevronDown size={12} strokeWidth={1.5} style={{ color: colors.muted }} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 z-50 rounded-lg overflow-hidden"
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            minWidth: '200px',
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          {/* Clear button (multi-select only) */}
          {multiple && selectedValues.length > 0 && (
            <button
              onClick={handleClear}
              className="w-full px-3 py-2 text-xs text-left transition-colors hover:bg-white/[0.06]"
              style={{
                color: colors.info,
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              Clear all
            </button>
          )}

          {/* "All" option (single-select only) */}
          {!multiple && (
            <button
              onClick={handleAllClick}
              className="w-full px-3 py-2 text-xs text-left flex items-center gap-2 transition-colors hover:bg-white/[0.06]"
              style={{
                color: colors.text,
                backgroundColor: value === allValue ? 'rgba(255,255,255,0.06)' : 'transparent',
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <span className="w-4 h-4 flex items-center justify-center">
                {value === allValue && <Check size={12} strokeWidth={2} style={{ color: colors.accent }} />}
              </span>
              <span>{allLabel}</span>
            </button>
          )}

          {/* Grouped options */}
          {groupedOptions
            ? groupedOptions.map((group) => (
                <div key={group.id}>
                  <div
                    className="px-3 py-1.5 text-[10px] uppercase tracking-wide font-bold"
                    style={{
                      backgroundColor: colors.surfaceLight,
                      color: colors.muted,
                    }}
                  >
                    {group.label}
                  </div>
                  {group.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleOptionClick(opt.id)}
                      className="w-full px-3 py-2 text-xs text-left flex items-center gap-2 transition-colors hover:bg-white/[0.06]"
                      style={{
                        color: colors.text,
                        backgroundColor: selectedValues.includes(opt.id)
                          ? 'rgba(255,255,255,0.06)'
                          : 'transparent',
                      }}
                    >
                      <span className="w-4 h-4 flex items-center justify-center">
                        {selectedValues.includes(opt.id) && <Check size={12} strokeWidth={2} style={{ color: colors.accent }} />}
                      </span>
                      {opt.icon}
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              ))
            : /* Flat options */
              options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleOptionClick(opt.id)}
                  className="w-full px-3 py-2 text-xs text-left flex items-center gap-2 transition-colors duration-100 hover:bg-white/[0.06]"
                  style={{
                    color: colors.text,
                    backgroundColor: selectedValues.includes(opt.id)
                      ? 'rgba(255,255,255,0.06)'
                      : 'transparent',
                  }}
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    {selectedValues.includes(opt.id) && <Check size={12} strokeWidth={2} style={{ color: colors.accent }} />}
                  </span>
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
        </div>
      )}
    </div>
  );
}
