'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { colors } from './theme';

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
  columns?: 2 | 3 | 4 | 5 | 6;
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
    6: 'grid-cols-6',
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
          style={{ color: colors.text }}
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
                'flex flex-col items-center justify-center gap-1 rounded-lg',
                'transition-all duration-150 outline-none',
                'focus-visible:ring-2 focus-visible:ring-[#5E6AD2]/50',
                styles.padding,
                styles.minWidth,
                isDisabled && 'opacity-50 cursor-not-allowed',
                !isDisabled && !isSelected && 'hover:bg-[#1C1C1E] hover:border-white/[0.12]',
                !isDisabled && isSelected && 'active:scale-[0.97]',
              )}
              style={{
                backgroundColor: isSelected ? colors.accent : colors.surface,
                border: `1px solid ${isSelected ? colors.accent : colors.border}`,
                color: isSelected ? '#ffffff' : colors.text,
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
                  style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : colors.muted }}
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
