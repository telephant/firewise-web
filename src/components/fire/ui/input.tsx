'use client';

import * as React from 'react';
import { colors } from './theme';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Hide step buttons for number inputs */
  hideStepButtons?: boolean;
}

// Step button component for number inputs
function StepButton({
  direction,
  onClick,
  disabled,
}: {
  direction: 'up' | 'down';
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center w-6 h-1/2',
        'text-[#7C7C82] hover:text-[#EDEDEF] hover:bg-white/[0.05]',
        'transition-colors duration-100',
        'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#7C7C82]',
        direction === 'up' ? 'rounded-tr-md' : 'rounded-br-md'
      )}
    >
      <svg
        width="10"
        height="6"
        viewBox="0 0 10 6"
        fill="none"
        className={direction === 'down' ? 'rotate-180' : ''}
      >
        <path
          d="M1 5L5 1L9 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, type, hideStepButtons, step, min, max, value, onChange, disabled, ...props }, ref) => {
    const hasError = !!error;
    const isNumber = type === 'number';
    const showStepButtons = isNumber && !hideStepButtons;
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Merge refs
    React.useImperativeHandle(ref, () => inputRef.current!);

    const handleStep = (direction: 'up' | 'down') => {
      const input = inputRef.current;
      if (!input || !onChange) return;

      const currentValue = parseFloat(value?.toString() || input.value || '0') || 0;
      const stepValue = step === 'any' ? 1 : parseFloat(step?.toString() || '1');
      const minValue = min !== undefined ? parseFloat(min.toString()) : -Infinity;
      const maxValue = max !== undefined ? parseFloat(max.toString()) : Infinity;

      let newValue = direction === 'up'
        ? currentValue + stepValue
        : currentValue - stepValue;

      // Clamp to min/max
      newValue = Math.max(minValue, Math.min(maxValue, newValue));

      // Handle decimal precision based on step
      const stepStr = step?.toString() || '1';
      const decimalPlaces = stepStr !== 'any' && stepStr.includes('.') ? stepStr.split('.')[1].length : 2;
      newValue = parseFloat(newValue.toFixed(decimalPlaces));

      // Create a synthetic change event
      const syntheticEvent = {
        target: { value: newValue.toString() },
        currentTarget: { value: newValue.toString() },
      } as React.ChangeEvent<HTMLInputElement>;

      onChange(syntheticEvent);
    };

    return (
      <div className="w-full">
        {label && (
          <label
            className="text-xs uppercase tracking-wide block mb-1 font-medium"
            style={{ color: hasError ? colors.negative : colors.text }}
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type={type}
            step={step}
            min={min}
            max={max}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm outline-none',
              'transition-all duration-150',
              'border bg-[#1C1C1E] text-[#EDEDEF]',
              hasError
                ? 'border-[#F87171]'
                : 'border-white/[0.08] hover:border-white/[0.15]',
              'focus:border-[#5E6AD2]/60 focus:ring-2 focus:ring-[#5E6AD2]/20',
              'placeholder:text-[#7C7C82]',
              hasError && 'animate-shake',
              // Hide native number input spinners
              isNumber && '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
              showStepButtons && 'pr-8',
              className
            )}
            ref={inputRef}
            {...props}
          />
          {showStepButtons && (
            <div
              className="absolute right-[1px] top-[1px] bottom-[1px] flex flex-col border-l"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <StepButton direction="up" onClick={() => handleStep('up')} disabled={disabled} />
              <StepButton direction="down" onClick={() => handleStep('down')} disabled={disabled} />
            </div>
          )}
        </div>
        {hasError && (
          <p className="mt-1 text-xs" style={{ color: colors.negative }}>{error}</p>
        )}
        {hint && !hasError && (
          <p className="mt-1 text-xs" style={{ color: colors.muted }}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
