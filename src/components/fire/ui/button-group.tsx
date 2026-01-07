'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { retro } from './theme';

export interface ButtonGroupOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  badge?: string; // e.g., "(soon)"
}

export interface ButtonGroupProps<T extends string = string> {
  options: ButtonGroupOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  label?: string;
  columns?: 2 | 3 | 4 | 5;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

export function ButtonGroup<T extends string = string>({
  options,
  value,
  onChange,
  label,
  columns = 4,
  size = 'md',
  disabled = false,
  className,
}: ButtonGroupProps<T>) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
  };

  const sizeStyles = {
    sm: {
      padding: 'px-2 py-1.5',
      iconSize: 'text-base',
      labelSize: 'text-[9px]',
      badgeSize: 'text-[8px]',
      minWidth: 'min-w-[56px]',
    },
    md: {
      padding: 'px-3 py-2',
      iconSize: 'text-lg',
      labelSize: 'text-[10px]',
      badgeSize: 'text-[9px]',
      minWidth: 'min-w-[72px]',
    },
  };

  const styles = sizeStyles[size];

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          className="text-xs uppercase tracking-wide block mb-2 font-medium"
          style={{ color: retro.text }}
        >
          {label}
        </label>
      )}

      <div className={cn('grid gap-2', gridCols[columns])}>
        {options.map((option) => {
          const isSelected = value === option.id;
          const isDisabled = disabled || option.disabled;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                if (!isDisabled) {
                  onChange(option.id);
                }
              }}
              disabled={isDisabled}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-sm transition-all active:translate-y-[1px]',
                styles.padding,
                styles.minWidth,
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
              style={{
                backgroundColor: isSelected ? retro.accent : retro.surface,
                border: `2px solid ${retro.border}`,
                color: isSelected ? '#ffffff' : retro.text,
                boxShadow: isSelected
                  ? `inset -1px -1px 0 rgba(0,0,0,0.3), inset 1px 1px 0 rgba(255,255,255,0.3), 2px 2px 0 ${retro.bevelDark}`
                  : `inset -1px -1px 0 ${retro.bevelDark}, inset 1px 1px 0 ${retro.bevelLight}, 2px 2px 0 ${retro.bevelDark}`,
              }}
            >
              {option.icon && (
                <span className={styles.iconSize}>{option.icon}</span>
              )}
              <span className={cn(styles.labelSize, 'font-medium leading-tight')}>
                {option.label}
              </span>
              {option.badge && (
                <span
                  className={styles.badgeSize}
                  style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : retro.muted }}
                >
                  {option.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
