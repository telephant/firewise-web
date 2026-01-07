'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { retro, retroStyles } from './theme';
import { cn } from '@/lib/utils';
import { IconChevronDown } from './icons';

export interface SelectProps {
  label?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  disabled?: boolean;
  className?: string;
  error?: string;
  hint?: string;
}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ className, label, options, placeholder, value, onChange, disabled, error, hint }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasError = !!error;
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Find selected option
    const selectedOption = options.find((opt) => opt.value === value);
    const displayValue = selectedOption?.label || placeholder || 'Select...';

    // Close on click outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (isOpen && highlightedIndex >= 0) {
            handleSelect(options[highlightedIndex].value);
          } else {
            setIsOpen(!isOpen);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex((prev) =>
              prev < options.length - 1 ? prev + 1 : prev
            );
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (isOpen) {
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    };

    // Scroll highlighted item into view
    useEffect(() => {
      if (isOpen && highlightedIndex >= 0 && listRef.current) {
        const items = listRef.current.querySelectorAll('[data-option]');
        items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
      }
    }, [highlightedIndex, isOpen]);

    // Reset highlighted index when opening
    useEffect(() => {
      if (isOpen) {
        const currentIndex = options.findIndex((opt) => opt.value === value);
        setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
      }
    }, [isOpen, options, value]);

    const handleSelect = (optionValue: string) => {
      onChange?.({ target: { value: optionValue } });
      setIsOpen(false);
    };

    return (
      <div className="w-full" ref={ref}>
        {label && (
          <label
            className="text-xs uppercase tracking-wide block mb-1 font-medium"
            style={{ color: hasError ? '#c53030' : retro.text }}
          >
            {label}
          </label>
        )}
        <div ref={containerRef} className="relative">
          {/* Trigger Button */}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            ref={buttonRef}
            className={cn(
              'w-full px-3 py-2 rounded-sm text-sm text-left flex items-center justify-between gap-2',
              'focus:outline-none focus:ring-1',
              disabled && 'opacity-50 cursor-not-allowed',
              hasError && 'animate-shake',
              className
            )}
            style={{
              ...retroStyles.sunken,
              color: selectedOption ? retro.text : retro.muted,
              ...(hasError ? {
                borderColor: '#c53030',
                boxShadow: 'inset 2px 2px 0 rgba(197, 48, 48, 0.2)',
              } : {}),
            }}
          >
            <span className="truncate">{displayValue}</span>
            <span
              className="transition-transform"
              style={{
                color: retro.muted,
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              <IconChevronDown size={12} />
            </span>
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div
              ref={listRef}
              className="absolute z-50 w-full mt-1 rounded-sm overflow-hidden max-h-48 overflow-y-auto"
              style={{
                backgroundColor: retro.surface,
                border: `2px solid ${retro.border}`,
                boxShadow: `3px 3px 0 ${retro.bevelDark}`,
              }}
            >
              {options.length === 0 ? (
                <div
                  className="px-3 py-2 text-xs"
                  style={{ color: retro.muted }}
                >
                  No options available
                </div>
              ) : (
                options.map((option, index) => {
                  const isSelected = option.value === value;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <div
                      key={option.value}
                      data-option
                      onClick={() => handleSelect(option.value)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className="px-3 py-2 text-sm cursor-pointer transition-colors"
                      style={{
                        backgroundColor: isHighlighted
                          ? retro.accent
                          : isSelected
                          ? retro.surfaceLight
                          : 'transparent',
                        color: isHighlighted ? '#ffffff' : retro.text,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected && !isHighlighted && (
                          <span className="text-xs">✓</span>
                        )}
                        <span className={isSelected && !isHighlighted ? '' : isSelected ? '' : 'pl-4'}>
                          {option.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
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
        {/* Hint text */}
        {hint && !hasError && (
          <p className="mt-1 text-xs" style={{ color: retro.muted }}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
